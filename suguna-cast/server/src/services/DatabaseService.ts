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

    static async getAppSecret(appIdOrKey: string): Promise<string | null> {
        try {
            // Precise query for credentials
            const result = await pool.query(
                `SELECT api_secret, id, app_id FROM projects 
                 WHERE app_id = $1 OR id::text = $1 OR package_name = $1 
                 LIMIT 1`,
                [appIdOrKey]
            );

            if (result.rows.length > 0) {
                const project = result.rows[0];
                console.log(`[Database] Found project match (DB_ID: ${project.id}, AppID: ${project.app_id})`);
                if (!project.api_secret) {
                    console.error(`[Database] Project found but api_secret is NULL/EMPTY for DB_ID: ${project.id}`);
                    return null;
                }
                return project.api_secret.trim(); // Trim to prevent whitespace signature issues
            }

            console.warn(`[Database] No project found matching: ${appIdOrKey}`);
            return null;
        } catch (err) {
            console.error('[Database] Query failed:', appIdOrKey, err);
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
