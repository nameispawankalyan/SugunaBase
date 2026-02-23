export interface CallRecord {
    roomId: string;
    appId: string;
    type: string;
    startTime: number;
    endTime: number;
    duration: number;
    participants: any[];
}

export class DatabaseService {
    /**
     * In a production environment, this method would connect to SugunaBase Firestore 
     * or a SQL database to store the call records permanently.
     */
    static async saveCallRecord(record: CallRecord): Promise<void> {
        console.log(`[Database] Saving record for ${record.roomId} to SugunaBase...`);

        // Simulating DB write delay
        return new Promise((resolve) => {
            setTimeout(() => {
                // Here you would do: db.collection('calls').add(record)
                console.log(`[Database] Record saved successfully ID: ${record.roomId}`);
                resolve();
            }, 500);
        });
    }

    /**
     * Fetches the secret key for a specific App ID to verify tokens.
     */
    static async getAppSecret(appId: string): Promise<string | null> {
        // In production: return (await db.collection('apps').doc(appId).get()).data().secret
        const mockDb: Record<string, string> = {
            "suguna-project-1": "suguna_cast_secret_key_2024"
        };
        return mockDb[appId] || null;
    }

    /**
     * Checks if a project is active and allowed to use Suguna Cast.
     */
    static async isProjectActive(appId: string): Promise<boolean> {
        // In production: check subscription status
        return true;
    }
}
