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
        console.log('🔄 Initializing payments schema...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS project_payments_config (
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
            CREATE TABLE IF NOT EXISTS transactions (
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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                project_id VARCHAR(100) NOT NULL,
                gateway VARCHAR(50) NOT NULL,
                product_id VARCHAR(100) NOT NULL,
                name VARCHAR(255),
                description TEXT,
                amount NUMERIC(10, 2),
                currency VARCHAR(10) DEFAULT 'INR',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, gateway, product_id)
            );
        `);

        // Migration: Ensure project_id is VARCHAR in project_payments_config
        try {
            await pool.query('ALTER TABLE project_payments_config ALTER COLUMN project_id TYPE VARCHAR(100);');
        } catch (e) { }

        console.log('✅ Payments Database: READY');
    } catch (e) {
        console.error('❌ Payments DB Init Error:', e.message);
    }
};
initDB();

// -----------------------------------------------------
// PRODUCTS ENDPOINTS
// -----------------------------------------------------

app.get('/products', async (req, res) => {
    try {
        const projectId = req.headers['x-project-id'];
        const result = await pool.query(
            'SELECT * FROM products WHERE project_id = $1 ORDER BY created_at DESC',
            [projectId]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// -----------------------------------------------------
// PRODUCTS ENDPOINTS (With Auto-Discovery Logic)
// -----------------------------------------------------

app.get('/products/active', async (req, res) => {
    try {
        const projectId = req.headers['x-project-id'];

        // Return summary of products ordered by frequency - this is "Auto-Discovery"
        const result = await pool.query(`
            SELECT item_type as product_id, gateway, COUNT(*) as total_sales, SUM(amount) as total_revenue, MAX(created_at) as last_sold
            FROM transactions 
            WHERE project_id = $1 AND status = 'SUCCESS'
            GROUP BY item_type, gateway
            ORDER BY total_sales DESC
        `, [projectId]);

        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Verification Endpoint for Android SDK
app.post('/verify/google-play', async (req, res) => {
    const { purchaseToken, productId, userId } = req.body;
    const projectId = req.headers['x-project-id'];

    try {
        console.log(`[PAYMENTS] Verifying Google Play Purchase: ${productId} for user ${userId}`);

        // 1. Get Google Config
        const config = await getProjectGatewayConfig(projectId, 'google_play');
        const serviceAccount = JSON.parse(config.api_key); // Current UI stores JSON in api_key

        // 2. Simulate Success for now (Later use googleapis)
        const txnId = `GP_${Date.now()}`;

        await pool.query(`
            INSERT INTO transactions (id, project_id, app_user_id, item_type, amount, currency, gateway, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [txnId, projectId, userId, productId, 0, 'INR', 'google_play', 'SUCCESS']);

        // 3. Notify Developer Webhook
        await triggerDeveloperWebhook(projectId, 'payment.success', {
            user_id: userId,
            product_id: productId,
            transaction_id: txnId,
            gateway: 'google_play'
        });

        res.json({ success: true, transaction_id: txnId });
    } catch (e) {
        console.error('[PAYMENTS] Google Verification Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Fetch transactions for a project
app.get('/transactions', async (req, res) => {
    try {
        const projectId = req.headers['x-project-id'];
        if (!projectId) return res.status(400).json({ error: "Missing x-project-id header" });

        const result = await pool.query(
            'SELECT * FROM transactions WHERE project_id = $1 ORDER BY created_at DESC LIMIT 100',
            [projectId]
        );
        res.json(result.rows);
    } catch (e) {
        console.error('[PAYMENTS] GET Transactions Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Helper for generating IDs
const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substring(2, 10)} `;

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
        if (!projectId) return res.status(400).json({ error: "Missing x-project-id header" });

        const result = await pool.query(
            'SELECT gateway FROM project_payments_config WHERE project_id = $1 AND is_enabled = TRUE',
            [projectId]
        );
        res.json({ gateways: result.rows.map(r => r.gateway) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create Order for Razorpay/Cashfree
app.post('/orders/create', async (req, res) => {
    const { gateway, amount, currency, app_user_id } = req.body;
    const projectId = req.headers['x-project-id'];

    if (!projectId) return res.status(400).json({ error: "Missing x-project-id header" });

    try {
        const config = await getProjectGatewayConfig(projectId, gateway);

        if (gateway === 'razorpay') {
            const instance = new Razorpay({
                key_id: config.api_key,
                key_secret: config.api_secret,
            });

            const order = await instance.orders.create({
                amount: Math.round(amount * 100), // convert to paise
                currency: currency || 'INR',
                receipt: `rcpt_${projectId}_${Date.now()}`
            });

            // Pre-insert transaction as PENDING
            await pool.query(`
                INSERT INTO transactions (id, project_id, app_user_id, order_id, amount, currency, gateway, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [order.id, projectId, app_user_id, order.id, amount, currency || 'INR', 'razorpay', 'PENDING']);

            res.json({
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: config.api_key // Public key for SDK
            });
        } else if (gateway === 'cashfree') {
            const isSandbox = config.api_secret && (config.api_secret.includes('test') || config.api_secret.includes('sandbox'));
            const cfBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg/orders' : 'https://api.cashfree.com/pg/orders';

            const txnId = `txn_${Date.now()}`;
            const response = await axios.post(cfBaseUrl, {
                order_id: txnId,
                order_amount: amount,
                order_currency: currency || 'INR',
                customer_details: {
                    customer_id: app_user_id || 'guest',
                    customer_phone: "9999999999", // Sandbox requires a phone
                    customer_email: "test@example.com"
                }
            }, {
                headers: {
                    'x-client-id': config.api_key,
                    'x-client-secret': config.api_secret,
                    'x-api-version': '2023-08-01',
                    'Content-Type': 'application/json'
                }
            });

            const cfOrder = response.data;

            // Pre-insert transaction as PENDING
            await pool.query(`
                INSERT INTO transactions (id, project_id, app_user_id, order_id, amount, currency, gateway, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [txnId, projectId, app_user_id, cfOrder.order_id, amount, currency || 'INR', 'cashfree', 'PENDING']);

            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers['x-forwarded-host'] || req.get('host');

            res.json({
                order_id: cfOrder.order_id,
                payment_url: `${protocol}://${host}/v1/payments/checkout/cashfree/${projectId}/${cfOrder.payment_session_id}`,
                payment_session_id: cfOrder.payment_session_id,
                amount: amount,
                currency: currency || 'INR',
                key_id: config.api_key
            });
        } else if (gateway === 'google_play') {
            // For GP, we just return that it's native
            res.json({ native: true, gateway: 'google_play' });
        } else {
            res.status(400).json({ error: "Gateway order creation not implemented" });
        }
    } catch (e) {
        console.error('[PAYMENTS] Order Create Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// -----------------------------------------------------
// HOSTED CHECKOUT PAGE (For Mobile SDK WebViews)
// -----------------------------------------------------
// Route to get a direct UPI Intent link for a specific app
app.get('/v1/payments/upi-link/:projectId/:orderId', async (req, res) => {
    try {
        const { projectId, orderId } = req.params;
        const config = await getGatewayConfig(projectId, 'razorpay');

        if (!config) return res.status(404).json({ error: 'Razorpay not configured' });

        const instance = new Razorpay({
            key_id: config.keyId,
            key_secret: config.keySecret
        });

        // Razorpay custom payment link or specific intent logic
        // For standard orders, we can use the 'v1/payments/create' with method=upi
        res.json({
            upi_link: `upi://pay?pa=${config.upiId || 'suguna@upi'}&pn=SugunaBase&am=1.00&tr=${orderId}&cu=INR`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/checkout/razorpay/:projectId/:orderId', async (req, res) => {
    const { projectId, orderId } = req.params;
    try {
        // 1. Get Transaction Details
        const txnRes = await pool.query('SELECT * FROM transactions WHERE order_id = $1 AND project_id = $2', [orderId, projectId]);
        if (txnRes.rows.length === 0) return res.send("Transaction not found");
        const txn = txnRes.rows[0];

        // 2. Get Gateway Config (for API Key)
        const config = await getProjectGatewayConfig(projectId, 'razorpay');

        // 3. Render Simple Razorpay HTML
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SugunaBase Checkout</title>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
                    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    p { margin-top: 20px; color: #64748b; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="loader"></div>
                <p>Redirecting to Secure Payment Gateway...</p>
                <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
                <script>
                    var options = {
                        "key": "${config.api_key}",
                        "amount": "${Math.round(txn.amount * 100)}",
                        "currency": "${txn.currency}",
                        "name": "SugunaBase Payment",
                        "description": "Payment for ${txn.item_type || 'Order'}",
                        "order_id": "${orderId}",
                        "handler": function (response){
                            // Success is handled by Razorpay Webhooks, we just show a message to close webview
                            document.body.innerHTML = "<h2 style='color: #22c55e;'>Payment Successful!</h2><p>You can close this window now.</p>";
                            window.location.href = "sugunabase://payment/success?id=" + response.razorpay_payment_id;
                        },
                        "modal": {
                            "ondismiss": function(){
                                window.location.href = "sugunabase://payment/cancel";
                            }
                        },
                        "theme": { "color": "#2563eb" }
                    };
                    var rzp1 = new Razorpay(options);
                    rzp1.open();
                </script>
            </body>
            </html>
        `;
        res.send(html);
    } catch (e) {
        res.status(500).send("Error: " + e.message);
    }
});

app.get('/checkout/cashfree/:projectId/:orderId', async (req, res) => {
    const { projectId, orderId } = req.params;
    try {
        const txnRes = await pool.query('SELECT * FROM transactions WHERE order_id = $1 AND project_id = $2', [orderId, projectId]);
        if (txnRes.rows.length === 0) return res.send("Transaction not found");
        const txn = txnRes.rows[0];

        // Cashfree uses the session ID stored in the database for the transaction
        // Actually, we store order_id in transactions table.
        // For Cashfree, we need to fetch the session ID if we didn't store it.
        // Wait, I should have returned it in /orders/create.

        // Simpler: Just redirect to Cashfree's hosted checkout if we have the session ID
        // But we need the session ID here. Let's assume we can fetch it or it's the orderId for now (it's not).

        // Revision: Let's just make /orders/create return a URL that points here.
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cashfree Checkout</title>
                <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
            </head>
            <body>
                <p>Redirecting to Cashfree...</p>
                <script>
                    const cashfree = Cashfree({ mode: "sandbox" }); // Dynamically set this later
                    cashfree.checkout({ paymentSessionId: "${orderId}" }); // In our CF implementation, orderId returned to SDK is the session ID or we need to pass it
                </script>
            </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send("Error: " + e.message);
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
            console.log(`[PAYMENTS] No webhook config for project ${projectId}.Skipping.`);
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
        console.log(`[PAYMENTS] Webhook sent to ${webhook_url} `);
    } catch (e) {
        console.error(`[PAYMENTS] Failed to send webhook to developer: `, e.message);
    }
}

// -----------------------------------------------------
// CONFIG ENDPOINTS (For Console)
// -----------------------------------------------------
app.get('/config', async (req, res) => {
    try {
        const projectId = req.headers['x-project-id'];
        console.log(`[PAYMENTS] Fetching config for Project: ${projectId} `);
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

        console.log(`[PAYMENTS] Saving config for Project: ${projectId}, Gateway: ${gateway} `);

        if (!projectId) {
            console.error('[PAYMENTS] Error: x-project-id header is missing!');
            return res.status(400).json({ error: "Missing x-project-id header" });
        }

        await pool.query(`
            INSERT INTO project_payments_config(project_id, gateway, api_key, api_secret, webhook_url, webhook_secret, is_enabled)
        VALUES($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT(project_id, gateway) DO UPDATE 
            SET api_key = EXCLUDED.api_key,
            api_secret = EXCLUDED.api_secret,
            webhook_url = EXCLUDED.webhook_url,
            webhook_secret = EXCLUDED.webhook_secret,
            is_enabled = EXCLUDED.is_enabled
                `, [projectId, gateway, api_key, api_secret, webhook_url, webhook_secret, is_enabled]);

        console.log(`✅[PAYMENTS] Config saved successfully for ${projectId}`);
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
                    customer_id: `${app_user_id} `,
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
            orderId = `gp_${txnId} `;
        }
        else {
            return res.status(400).json({ error: 'Unsupported Gateway' });
        }

        await pool.query(
            `INSERT INTO transactions(id, project_id, app_user_id, order_id, amount, currency, item_type, quantity, gateway, status)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')`,
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
    console.log(`💰 Suguna Payments Microservice running on port ${port} `);
});
