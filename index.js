const express = require('express');
const { Queue, Worker } = require('bullmq');
const crypto = require('crypto');
const axios = require('axios');
const Redis = require('ioredis');

const connection = new Redis();
const webhookQueue = new Queue('webhooks', { connection });
const app = express();
app.use(express.json());

app.post('/emit', async (req, res) => {
    const { endpoint, secret, payload } = req.body;
    await webhookQueue.add('deliver', { endpoint, secret, payload }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 } // with jitter built into bullmq
    });
    res.send({ status: 'queued' });
});

const worker = new Worker('webhooks', async job => {
    const { endpoint, secret, payload } = job.data;
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    
    try {
        await axios.post(endpoint, body, {
            headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
            timeout: 5000
        });
    } catch (err) {
        throw new Error(`Delivery failed: ${err.message}`); // BullMQ will handle backoff & DLQ
    }
}, { connection });

app.listen(3000, () => console.log('Webhook emitter on 3000'));
