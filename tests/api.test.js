const request = require('supertest');
const http = require('http');
const { app, initDb, getDb, processWebhooks } = require('../index');

describe('Webhook Delivery System', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        await initDb(':memory:');
        server = http.createServer(app);
        
        await new Promise(resolve => {
            server.listen(0, () => {
                baseUrl = `http://localhost:${server.address().port}`;
                resolve();
            });
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(async () => {
        const db = getDb();
        await db.run('DELETE FROM webhooks');
    });

    it('should queue and deliver a webhook successfully', async () => {
        const id = 'hook-1';
        const res = await request(app).post('/emit').send({
            id,
            endpoint: `${baseUrl}/mock-receiver`,
            secret: 'test-secret',
            payload: { message: 'hello' }
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.status).toBe('queued');

        // Manually trigger the processor
        await processWebhooks();

        const statusRes = await request(app).get(`/status/${id}`);
        expect(statusRes.body.status).toBe('delivered');
        expect(statusRes.body.attempts).toBe(0);
    });

    it('should strictly handle duplicate submissions idempotently', async () => {
        const payload = {
            id: 'hook-dupe',
            endpoint: `${baseUrl}/mock-receiver`,
            secret: 'test-secret',
            payload: { message: 'hello' }
        };

        const res1 = await request(app).post('/emit').send(payload);
        expect(res1.statusCode).toBe(201);
        expect(res1.body.status).toBe('queued');

        // Duplicate submission
        const res2 = await request(app).post('/emit').send(payload);
        expect(res2.statusCode).toBe(200);
        expect(res2.body.status).toBe('duplicate_acknowledged');

        const db = getDb();
        const count = await db.get("SELECT COUNT(*) as c FROM webhooks WHERE id = 'hook-dupe'");
        expect(count.c).toBe(1); // Only 1 record created
    });

    it('should retry on failure and eventually move to DLQ', async () => {
        const id = 'hook-fail';
        await request(app).post('/emit').send({
            id,
            endpoint: `${baseUrl}/mock-receiver`,
            secret: 'test-secret',
            payload: { simulateFailure: true } // instructs simulator to return 500
        });

        // 1st attempt
        await processWebhooks();
        let status = await request(app).get(`/status/${id}`);
        expect(status.body.status).toBe('retrying');
        expect(status.body.attempts).toBe(1);
        
        // Emulate time passing to bypass backoff for testing (update next_attempt)
        const db = getDb();
        
        // 2nd attempt
        await db.run("UPDATE webhooks SET next_attempt = datetime('now', '-1 day') WHERE id = ?", [id]);
        await processWebhooks();
        
        // 3rd attempt
        await db.run("UPDATE webhooks SET next_attempt = datetime('now', '-1 day') WHERE id = ?", [id]);
        await processWebhooks();
        
        // 4th attempt
        await db.run("UPDATE webhooks SET next_attempt = datetime('now', '-1 day') WHERE id = ?", [id]);
        await processWebhooks();
        
        // 5th attempt (Final)
        await db.run("UPDATE webhooks SET next_attempt = datetime('now', '-1 day') WHERE id = ?", [id]);
        await processWebhooks();

        status = await request(app).get(`/status/${id}`);
        expect(status.body.status).toBe('dlq');
        expect(status.body.attempts).toBe(5);
        expect(status.body.error_log).toContain('Request failed with status code 500');
    });
});
