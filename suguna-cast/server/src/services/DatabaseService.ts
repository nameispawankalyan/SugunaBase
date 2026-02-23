import { Pool } from 'pg';

export interface CallRecord {
    roomId: string;
    appId: string;
    type: string;
    startTime: number;
    endTime: number;
    duration: number;
    participants: any[];
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

export class DatabaseService {
    /**
     * Stores the call record in the central database.
     */
    static async saveCallRecord(record: CallRecord): Promise<void> {
        console.log(`[Database] Persisting call record for ${record.roomId}...`);

        try {
            await pool.query(
                `INSERT INTO cast_calls (room_id, app_id, type, start_time, end_time, duration, participants)
                 VALUES ($1, $2, $3, to_timestamp($4/1000.0), to_timestamp($5/1000.0), $6, $7)`,
                [
                    record.roomId,
                    record.appId,
                    record.type,
                    record.startTime,
                    record.endTime,
                    record.duration,
                    JSON.stringify(record.participants)
                ]
            );
            console.log(`[Database] Call record saved successfully for room: ${record.roomId}`);
        } catch (err) {
            console.error('[Database] Error saving call record:', err);
        }
    }

    /**
     * Fetches the real secret key for a specific App ID from PostgreSQL.
     * Falls back to hardcoded secrets for local development if DB is unreachable.
     */
    static async getAppSecret(appId: string): Promise<string | null> {
        const fallbacks: Record<string, string> = {
            "15": "sk_live_15_51suguna",
            "suguna-project-1": "suguna_cast_secret_key_2024"
        };

        try {
            const result = await pool.query(
                'SELECT api_secret FROM projects WHERE id = $1 OR package_name = $1',
                [appId]
            );

            if (result.rows.length > 0) {
                return result.rows[0].api_secret;
            }
            return fallbacks[appId] || null;
        } catch (err) {
            console.warn('[Database] DB not reachable, using developer fallback for appId:', appId);
            return fallbacks[appId] || null;
        }
    }

    /**
     * Checks if a project is active using real DB data with dev fallback.
     */
    static async isProjectActive(appId: string): Promise<boolean> {
        try {
            const result = await pool.query(
                'SELECT is_active FROM projects WHERE id = $1 OR package_name = $1',
                [appId]
            );
            if (result.rows.length > 0) return result.rows[0].is_active;
            return appId === "15" || appId === "suguna-project-1"; // Dev fallbacks
        } catch (err) {
            return appId === "15" || appId === "suguna-project-1"; // Dev fallback
        }
    }
}
