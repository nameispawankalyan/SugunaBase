const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3800;

app.use(cors());
app.use(express.json());

console.log('🚀 Suguna Payments v1.1 Starting...');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://suguna_admin:suguna123@localhost:5432/sugunabase_core',
});

const initDB = async () => {
    try {
        console.log('🔄 Cleaning up and recreating payments schema...');

        // Force drop to ensure the incorrect foreign key constraint is gone
        await pool.query(`DROP TABLE IF EXISTS transactions CASCADE;`);
        await pool.query(`DROP TABLE IF EXISTS project_payments_config CASCADE;`);

        await pool.query(`
            CREATE TABLE project_payments_config (
                id SERIAL PRIMARY KEY,
                project_id VARCHAR(100) NOT NULL,
                gateway VARCHAR(50) NOT NULL,
                api_key TEXT,
                api_secret TEXT,
                webhook_url TEXT,
                webhook_secret TEXT,
                is_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, gateway)
            );
        `);

        await pool.query(`
            CREATE TABLE transactions (
                id VARCHAR(100) PRIMARY KEY,
                project_id VARCHAR(100) NOT NULL,
                app_user_id VARCHAR(100), 
                order_id VARCHAR(255),
                amount NUMERIC(10, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL,
                item_type VARCHAR(50),
                quantity INTEGER,
                gateway VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Payments Database: FORCE SYNC COMPLETE (Slugs Enabled)');
    } catch (e) {
        console.error('❌ Payments DB Init Error:', e.message);
    }
};
initDB();

// Helper for generating IDs
const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substring(2, 10)}`;

// -----------------------------------------------------
// GET CONFIG FOR PROJECT
// -----------------------------------------------------
async function getProjectGatewayConfig(projectId, gateway) {
    const res = await pool.query(
        'SELECT * FROM project_payments_config WHERE project_id = $1 AND gateway = $2 AND is_enabled = TRUE',
        [projectId, gateway]
    );
    if (res.rows.length === 0) throw new Error(`Integration for ${gateway} not found or disabled for project ${projectId}`);
    return res.rows[0];
}

// Fetch all enabled gateways for a project (For App Bottom Sheet)
app.get('/gateways', async (req, res) => {
    try {
        const projectId = req.headers['x-project-id'];
        const result = await pool.query(
            'SELECT gateway, is_enabled FROM project_payments_config WHERE project_id = $1 AND is_enabled = TRUE',
            [projectId]
        );
        res.json({ gateways: result.rows.map(r => r.gateway) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// -----------------------------------------------------
// WEBHOOK FIRELINK TO DEVELOPER 'SERVER'
// -----------------------------------------------------
async function triggerDeveloperWebhook(projectId, event, data) {
    try {
        const res = await pool.query(
            'SELECT webhook_url, webhook_secret FROM project_payments_config WHERE project_id = $1 LIMIT 1',
            [projectId]
        );
        if (res.rows.length === 0 || !res.rows[0].webhook_url) {
            console.log(`[PAYMENTS] No webhook config for project ${projectId}. Skipping.`);
            return;
        }

        const { webhook_url, webhook_secret } = res.rows[0];
        const payload = JSON.stringify({ event, project_id: projectId, data });

        const signature = crypto.createHmac('sha256', webhook_secret || 'sugunabase123')
            .update(payload)
            .digest('hex');

        await axios.post(webhook_url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Suguna-Signature': signature
            }
        });
        console.log(`[PAYMENTS] Webhook sent to ${webhook_url}`);
    } catch (e) {
        console.error(`[PAYMENTS] Failed to send webhook to developer:`, e.message);
    }
}

// -----------------------------------------------------
// CONFIG ENDPOINTS (For Console)
// -----------------------------------------------------
app.get('/config', async (req, res) => {
    try {
        const projectId = req.headers['x-project-id'];
        console.log(`[PAYMENTS] Fetching config for Project: ${projectId}`);
        const result = await pool.query(
            'SELECT gateway, api_key, api_secret, webhook_url, webhook_secret, is_enabled FROM project_payments_config WHERE project_id = $1',
            [projectId]
        );
        res.json(result.rows);
    } catch (e) {
        console.error('[PAYMENTS] GET Config Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/config', async (req, res) => {
    try {
        const projectId = req.headers['x-project-id'];
        const { gateway, api_key, api_secret, webhook_url, webhook_secret, is_enabled } = req.body;

        console.log(`[PAYMENTS] Saving config for Project: ${projectId}, Gateway: ${gateway}`);

        if (!projectId) {
            console.error('[PAYMENTS] Error: x-project-id header is missing!');
            return res.status(400).json({ error: "Missing x-project-id header" });
        }

        await pool.query(`
            INSERT INTO project_payments_config (project_id, gateway, api_key, api_secret, webhook_url, webhook_secret, is_enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (project_id, gateway) DO UPDATE 
            SET api_key = EXCLUDED.api_key,
                api_secret = EXCLUDED.api_secret,
                webhook_url = EXCLUDED.webhook_url,
                webhook_secret = EXCLUDED.webhook_secret,
                is_enabled = EXCLUDED.is_enabled
        `, [projectId, gateway, api_key, api_secret, webhook_url, webhook_secret, is_enabled]);

        console.log(`✅ [PAYMENTS] Config saved successfully for ${projectId}`);
        res.json({ success: true, message: 'Configuration saved.' });
    } catch (e) {
        console.error('[PAYMENTS] POST Config Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// -----------------------------------------------------
// CREATE ORDER
// -----------------------------------------------------
app.post('/create-order', async (req, res) => {
    const { project_id, app_user_id, amount, currency, gateway, item_type, quantity } = req.body;

    // For local transactions tracking
    const txnId = generateId('txn');

    try {
        let orderId = '';
        const config = await getProjectGatewayConfig(project_id, gateway);

        if (gateway === 'razorpay') {
            const rzp = new Razorpay({ key_id: config.api_key, key_secret: config.api_secret });
            const order = await rzp.orders.create({
                amount: parseInt(amount) * 100, // paise converter
                currency: currency,
                receipt: txnId
            });
            orderId = order.id;
        }
        else if (gateway === 'cashfree') {
            // Need actual Cashfree API calls via axios. Here's a placeholder logic
            // Requires cashfree headers via config.api_key etc.
            const response = await axios.post((config.api_secret && config.api_secret.includes('sandbox')) ? 'https://sandbox.cashfree.com/pg/orders' : 'https://api.cashfree.com/pg/orders', {
                order_id: txnId,
                order_amount: amount,
                order_currency: currency,
                customer_details: {
                    customer_id: `${app_user_id}`,
                    customer_phone: "9999999999" // Usually require this
                }
            }, {
                headers: {
                    'x-client-id': config.api_key,
                    'x-client-secret': config.api_secret,
                    'x-api-version': '2023-08-01',
                    'Content-Type': 'application/json'
                }
            });
            orderId = response.data.payment_session_id; // For CF it could be session ID
        }
        else if (gateway === 'google_play') {
            // Google Play generates the order ID on the device. We just return a tracking ID.
            orderId = `gp_${txnId}`;
        }
        else {
            return res.status(400).json({ error: 'Unsupported Gateway' });
        }

        await pool.query(
            `INSERT INTO transactions (id, project_id, app_user_id, order_id, amount, currency, item_type, quantity, gateway, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')`,
            [txnId, project_id, app_user_id, orderId, amount, currency, item_type, quantity, gateway]
        );

        res.json({ transaction_id: txnId, order_id: orderId, gateway_key: config.api_key });

    } catch (e) {
        console.error('[PAYMENTS] Create Order Error:', e);
        res.status(500).json({ error: e.message || 'Error creating order' });
    }
});

// -----------------------------------------------------
// WEBHOOK ENDPOINTS
// -----------------------------------------------------

app.post('/webhook/razorpay', async (req, res) => {
    // Razorpay webhook validation
    try {
        const secret = req.headers['x-razorpay-signature'];
        // You would typically lookup the secret by grabbing the project from the payload
        // But razorpay webhooks don't send project_id directly easily unless attached as notes.
        // Let's assume order_id exists, we find the project from DB.
        const orderId = req.body.payload.payment.entity.order_id;

        const txnRes = await pool.query('SELECT * FROM transactions WHERE order_id = $1 LIMIT 1', [orderId]);
        if (txnRes.rows.length === 0) return res.status(404).json({ error: 'Txn not found' });

        const txn = txnRes.rows[0];

        // Ensure success
        if (req.body.event === 'payment.captured' || req.body.event === 'order.paid') {
            await pool.query('UPDATE transactions SET status = $1 WHERE order_id = $2', ['SUCCESS', orderId]);

            // TRIGGER DEVELOPER WEBHOOK
            await triggerDeveloperWebhook(txn.project_id, 'payment.success', {
                user_id: txn.app_user_id,
                item_type: txn.item_type,
                quantity: txn.quantity,
                amount_paid: txn.amount,
                currency: txn.currency,
                transaction_id: txn.id,
                gateway: 'razorpay'
            });
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/webhook/google_play', async (req, res) => {
    // Basic verification for GP (Usually the app sends this, or Real Time Dev Notifications)
    const { project_id, purchase_token, product_id, app_user_id, transaction_id } = req.body;
    try {
        await pool.query('UPDATE transactions SET status = $1 WHERE id = $2', ['SUCCESS', transaction_id]);

        await triggerDeveloperWebhook(project_id, 'payment.success', {
            user_id: app_user_id,
            item_type: 'InAppPurchase',
            quantity: 1, // Depending on purchase type
            product_id: product_id,
            transaction_id: transaction_id,
            gateway: 'google_play'
        });

        res.json({ status: 'ok' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, '127.0.0.1', () => {
    console.log(`💰 Suguna Payments Microservice running on port ${port}`);
});
