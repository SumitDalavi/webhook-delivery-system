const request = require('supertest');

// Mock BullMQ completely because it requires real Redis for Lua scripts
jest.mock('bullmq', () => {
    return {
        Queue: jest.fn().mockImplementation(() => ({
            add: jest.fn().mockResolvedValue(true)
        })),
        Worker: jest.fn().mockImplementation(() => ({
            close: jest.fn()
        }))
    };
});
jest.mock('ioredis', () => require('ioredis-mock'));

const { app, webhookQueue, worker, connection } = require('../index');

describe('Webhook Delivery System', () => {
    afterAll(async () => {
        await worker.close();
        await connection.quit();
    });

    it('should enqueue a webhook delivery', async () => {
        const res = await request(app)
            .post('/emit')
            .send({
                endpoint: 'https://example.com/webhook',
                secret: 'my-secret',
                payload: { event: 'ping' }
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('queued');
        expect(webhookQueue.add).toHaveBeenCalledWith('deliver', {
            endpoint: 'https://example.com/webhook',
            secret: 'my-secret',
            payload: { event: 'ping' }
        }, expect.any(Object));
    });
});
