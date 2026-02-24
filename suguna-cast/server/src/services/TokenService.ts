import jwt from 'jsonwebtoken';
import { DatabaseService } from './DatabaseService';

export interface CastTokenPayload {
    appId: string;
    roomId: string;
    uid: string;
    role: 'host' | 'broadcaster' | 'audience';
    type: 'audio_call' | 'video_call' | 'video_live' | 'audio_live';
    exp?: number;
}

export class TokenService {
    static async verifyToken(token: string): Promise<CastTokenPayload> {
        try {
            // 1. Decode without verification to get appId
            const decoded = jwt.decode(token) as CastTokenPayload;
            if (!decoded || !decoded.appId) throw new Error('Invalid token structure');

            // 2. Get secret from SugunaBase DB
            const secret = await DatabaseService.getAppSecret(decoded.appId);
            if (!secret) {
                console.warn(`[Auth] No secret found for appId: ${decoded.appId}`);
                throw new Error('App not found or inactive');
            }

            console.log(`[Auth] Verifying token for AppId: ${decoded.appId} (Secret length: ${secret.length})`);

            // 3. Verify with real secret
            try {
                return jwt.verify(token, secret) as CastTokenPayload;
            } catch (err) {
                console.error(`[Auth] Signature verification failed for ${decoded.appId}. Secret starts with: ${secret.substring(0, 4)}...`);
                throw err;
            }
        } catch (error) {
            throw new Error('Authentication Failed: ' + (error as Error).message);
        }
    }

    static async generateToken(payload: CastTokenPayload, providedSecret: string): Promise<string> {
        // 1. Get secret from SugunaBase DB
        const dbSecret = await DatabaseService.getAppSecret(payload.appId);
        if (!dbSecret) {
            throw new Error('App not found or inactive');
        }

        // 2. Verify provided secret matches DB secret
        if (dbSecret !== providedSecret.trim()) {
            throw new Error('Invalid App Secret');
        }

        // 3. Generate JWT (expires in 24 hours by default if not specified)
        const options: jwt.SignOptions = {
            expiresIn: payload.exp ? undefined : '24h'
        };

        return jwt.sign(payload, dbSecret, options);
    }
}
