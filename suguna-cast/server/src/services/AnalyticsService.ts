import fs from 'fs';
import path from 'path';
import { DatabaseService } from './DatabaseService';

export interface CallMetric {
    uid: string;
    name?: string;
    image?: string;
    network: string; // 5G, 4G, WiFi
    device: string;  // OS version, Browser
    location: string; // State, City (derived from IP)
    timestamp: number;
}

export type RoomType = 'audio_call' | 'video_call' | 'video_live' | 'audio_live';
export type SessionStatus = 'LIVE' | 'ENDED';

export interface CallSession {
    roomId: string;
    appId: string;
    type: RoomType;
    status: SessionStatus;
    startTime: number;
    endTime?: number;
    participants: Map<string, CallMetric>;
}

export class AnalyticsService {
    private static sessions: Map<string, CallSession> = new Map();
    private static logPath = path.join(__dirname, '../../logs/calls');

    constructor() {
        if (!fs.existsSync(AnalyticsService.logPath)) {
            fs.mkdirSync(AnalyticsService.logPath, { recursive: true });
        }
    }

    static startSession(roomId: string, appId: string, type: RoomType = 'video_call') {
        if (!this.sessions.has(roomId)) {
            this.sessions.set(roomId, {
                roomId,
                appId,
                type,
                status: 'LIVE',
                startTime: Date.now(),
                participants: new Map()
            });
            console.log(`[Analytics] Started ${type} session: ${roomId} (Status: LIVE)`);
        }
    }

    static getLiveRooms(appId: string) {
        const liveRooms: any[] = [];
        this.sessions.forEach(session => {
            if (session.appId === appId && session.status === 'LIVE') {
                liveRooms.push({
                    roomId: session.roomId,
                    type: session.type,
                    status: session.status,
                    startTime: session.startTime,
                    participantCount: session.participants.size,
                    participants: Array.from(session.participants.values())
                });
            }
        });
        return liveRooms;
    }

    static logParticipantJoin(roomId: string, metric: CallMetric) {
        const session = this.sessions.get(roomId);
        if (session) {
            session.participants.set(metric.uid, metric);
            console.log(`[Analytics] Participant ${metric.uid} joined ${roomId} via ${metric.network}`);
        }
    }

    static logParticipantLeave(roomId: string, uid: string) {
        const session = this.sessions.get(roomId);
        if (session) {
            session.participants.delete(uid);
            console.log(`[Analytics] Participant ${uid} left ${roomId}`);
        }
    }

    static async endSession(roomId: string) {
        const session = this.sessions.get(roomId);
        if (session) {
            session.status = 'ENDED';
            session.endTime = Date.now();
            const duration = (session.endTime - session.startTime) / 1000;

            const logEntry = {
                roomId: session.roomId,
                appId: session.appId,
                type: session.type,
                status: session.status,
                startTime: session.startTime,
                endTime: session.endTime,
                durationSeconds: duration,
                participants: Array.from(session.participants.values())
            };

            // 1. Save to Database (Production Strategy)
            try {
                await DatabaseService.saveCallRecord({
                    ...logEntry,
                    duration: duration
                });
            } catch (err) {
                console.error('[Analytics] Database save failed:', err);
            }

            // 2. Backup to local file (Fail-safe)
            try {
                const fileName = `call_${roomId}_${Date.now()}.json`;
                fs.writeFileSync(path.join(this.logPath, fileName), JSON.stringify(logEntry, null, 2));
            } catch (err) {
                console.error('[Analytics] File backup failed:', err);
            }

            this.sessions.delete(roomId);
            console.log(`[Analytics] Call session ${roomId} ended. Duration: ${duration}s. DB & Backup Sync.`);
        }
    }
}
