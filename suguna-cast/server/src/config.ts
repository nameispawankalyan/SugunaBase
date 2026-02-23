import { RtpCodecCapability, WorkerSettings, RouterOptions } from 'mediasoup/node/lib/types';
import * as os from 'os';
import path from 'path';

export const config = {
    // HTTP server settings
    http: {
        host: '0.0.0.0',
        port: process.env.PORT || 3100,
    },

    // Environment
    isProduction: process.env.NODE_ENV === 'production',

    // SSL settings
    ssl: {
        key: process.env.SSL_KEY || path.join(__dirname, '../key.pem'),
        cert: process.env.SSL_CERT || path.join(__dirname, '../cert.pem'),
    },

    // MediaSoup settings
    mediasoup: {
        // Number of mediasoup Workers to create.
        numWorkers: Object.keys(os.cpus()).length || 1,

        // Worker settings
        worker: {
            logLevel: 'warn',
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
            rtcMinPort: Number(process.env.RTC_MIN_PORT) || 40000,
            rtcMaxPort: Number(process.env.RTC_MAX_PORT) || 49999,
        } as WorkerSettings,

        // ... (router settings same)
        router: {
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: { 'x-google-start-bitrate': 1000 },
                },
                {
                    kind: 'video',
                    mimeType: 'video/h264',
                    clockRate: 90000,
                    parameters: {
                        'packetization-mode': 1,
                        'profile-level-id': '42e01f',
                        'level-asymmetry-allowed': 1,
                        'x-google-start-bitrate': 1000,
                    },
                },
            ] as RtpCodecCapability[],
        } as RouterOptions,

        // WebRtcTransport settings
        webRtcTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: process.env.ANNOUNCED_IP || '10.219.241.101',
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000,
            maxSctpMessageSize: 262144,
        },
    },

    // Client-side Configuration (Sent via signaling)
    client: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // TURN server should be added here
        ] as any[]
    }
};
