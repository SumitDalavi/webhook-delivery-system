const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
app.use(express.json());

let db;

async function initDb(dbPath = ':memory:') {
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS webhooks (
            id TEXT PRIMARY KEY,
            endpoint TEXT,
            secret TEXT,
            payload TEXT,
            status TEXT DEFAULT 'pending',
            attempts INTEGER DEFAULT 0,
            next_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
            error_log TEXT
        );
    `);
}

// Emulate a background worker that polls the DB for pending webhooks
async function processWebhooks() {
    if (!db) return;

    try {
        const jobs = await db.all(
            "SELECT * FROM webhooks WHERE status IN ('pending', 'retrying') AND next_attempt <= datetime('now')"
        );

        for (const job of jobs) {
            const body = job.payload;
            const signature = crypto.createHmac('sha256', job.secret).update(body).digest('hex');

            try {
                // Attempt delivery
                await axios.post(job.endpoint, body, {
                    headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
                    timeout: 2000
                });
                
                // Success
                await db.run("UPDATE webhooks SET status = 'delivered' WHERE id = ?", [job.id]);
            } catch (err) {
                const newAttempts = job.attempts + 1;
                const errorLog = (job.error_log ? job.error_log + '\n' : '') + err.message;
                
                if (newAttempts >= 5) {
                    // Exhausted all retries - move to DLQ (Dead Letter Queue state)
                    await db.run("UPDATE webhooks SET status = 'dlq', attempts = ?, error_log = ? WHERE id = ?", [newAttempts, errorLog, job.id]);
                } else {
                    // Exponential backoff: next attempt in (2^attempts) seconds
                    const backoffSeconds = Math.pow(2, newAttempts);
                    await db.run(
                        "UPDATE webhooks SET status = 'retrying', attempts = ?, next_attempt = datetime('now', '+' || ? || ' seconds'), error_log = ? WHERE id = ?", 
                        [newAttempts, backoffSeconds, errorLog, job.id]
                    );
                }
            }
        }
    } catch (e) {
        console.error('Worker loop error:', e);
    }
}

// Start the polling loop (every 500ms for fast testing)
let workerInterval;
function startWorker() {
    workerInterval = setInterval(processWebhooks, 500);
}
function stopWorker() {
    if (workerInterval) clearInterval(workerInterval);
}

// --- API Endpoints ---
app.post('/emit', async (req, res) => {
    // Idempotency: require an explicit ID provided by caller to prevent dupes
    const { id, endpoint, secret, payload } = req.body;
    
    if (!id || !endpoint || !secret || !payload) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.run(
            'INSERT INTO webhooks (id, endpoint, secret, payload) VALUES (?, ?, ?, ?)',
            [id, endpoint, secret, JSON.stringify(payload)]
        );
        res.status(201).send({ status: 'queued', id });
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            // Strict Idempotency: acknowledge without re-queueing
            return res.status(200).send({ status: 'duplicate_acknowledged', id });
        }
        res.status(500).json({ error: e.message });
    }
});

app.get('/status/:id', async (req, res) => {
    const job = await db.get('SELECT status, attempts, error_log FROM webhooks WHERE id = ?', [req.params.id]);
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json(job);
});

// --- Local Receiver Simulator (For tests to hit) ---
app.post('/mock-receiver', (req, res) => {
    const sig = req.headers['x-signature'];
    if (!sig) return res.status(401).json({ error: 'Missing signature' });

    // In a real app, receiver validates signature. For simulation, we check if body instructs us to fail.
    if (req.body.simulateFailure) {
        return res.status(500).json({ error: 'Simulated Receiver Failure' });
    }
    res.status(200).json({ success: true });
});

if (require.main === module) {
    initDb('webhooks.db').then(() => {
        app.listen(3000, () => console.log('Webhook emitter on 3000'));
        startWorker();
    });
}

module.exports = { app, initDb, getDb: () => db, startWorker, stopWorker, processWebhooks };
