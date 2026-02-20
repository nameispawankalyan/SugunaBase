const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

const setup = async () => {
    try {
        console.log("🚀 Setting up SugunaAuth Project (Android)...");

        // 1. Get Admin User
        let userRes = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@suguna.com']);
        if (userRes.rows.length === 0) {
            console.error("❌ Admin User not found. Run create_auth_project.js first.");
            process.exit(1);
        }
        const userId = userRes.rows[0].id;

        // 2. Data
        const packageName = "pawankalyan.gpk.sugunaauth";
        const sha1 = "5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25"; // Default Debug SHA1 (Replace this!)
        const sha256 = "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"; // Default Debug SHA256 (Replace this!)

        console.log(`📦 Application: ${packageName}`);
        console.log(`🔑 SHA1: ${sha1}`);
        console.log(`🔑 SHA256: ${sha256}`);

        // 3. Update Project
        let projectRes = await pool.query('SELECT * FROM projects WHERE package_name = $1 AND user_id = $2', [packageName, userId]);
        let project;

        if (projectRes.rows.length === 0) {
            console.log("ℹ️ Project not found, creating...");
            const newProject = await pool.query(
                `INSERT INTO projects (name, platform, user_id, package_name, google_sign_in_enabled, google_client_id, sha1_fingerprint, sha256_fingerprint) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                ["SugunaAuth Project", 'Android', userId, packageName, true, '30485443594-e02tfbqn89lnvuv92tmcgdbiniem1dar.apps.googleusercontent.com', sha1, sha256]
            );
            project = newProject.rows[0];
        } else {
            console.log("ℹ️ Project found, updating keys...");
            const updated = await pool.query(
                `UPDATE projects SET sha1_fingerprint = $1, sha256_fingerprint = $2 WHERE id = $3 RETURNING *`,
                [sha1, sha256, projectRes.rows[0].id]
            );
            project = updated.rows[0];
        }

        console.log("✅ Project Updated in Database");

        // 4. Generate suguna-services.json
        const config = {
            "project_info": {
                "project_id": project.id,
                "project_number": "123456789", // Placeholder
                "project_name": project.name,
                "package_name": project.package_name
            },
            "client": [
                {
                    "client_info": {
                        "android_client_info": {
                            "package_name": project.package_name
                        }
                    },
                    "oauth_client": [
                        {
                            "client_id": project.google_client_id,
                            "client_type": 3 // Android
                        }
                    ],
                    "api_key": [
                        {
                            "current_key": "TODO: Generate API Key"
                        }
                    ],
                    "services": {
                        "sugunabase": {
                            "base_url": "http://165.232.183.6/"
                        }
                    }
                }
            ],
            "configuration_version": "1"
        };

        fs.writeFileSync('suguna-services.json', JSON.stringify(config, null, 2));
        console.log("✅ Generated suguna-services.json");
        console.log("👉 Move this file to your Android App's 'app/src/main/assets/' folder.");

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
};

setup();
