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
     * This is fully dynamic based on the app_id (Agoral-style) provided by the client.
     */
    static async getAppSecret(appIdOrKey: string): Promise<string | null> {
        try {
            // First try to find by our new secure app_id, then fallback to database id
            const result = await pool.query(
                'SELECT api_secret FROM projects WHERE app_id = $1 OR id::text = $1 OR package_name = $1',
                [appIdOrKey]
            );

            if (result.rows.length > 0) {
                return result.rows[0].api_secret;
            }
            return null;
        } catch (err) {
            console.error('[Database] Failed to fetch app secret:', appIdOrKey, err);
            return null;
        }
    }

    /**
     * Checks if a project is active using real DB data.
     */
    static async isProjectActive(appIdOrKey: string): Promise<boolean> {
        try {
            const result = await pool.query(
                'SELECT is_active FROM projects WHERE app_id = $1 OR id::text = $1 OR package_name = $1',
                [appIdOrKey]
            );
            return result.rows.length > 0 && result.rows[0].is_active;
        } catch (err) {
            return false;
        }
    }
}
