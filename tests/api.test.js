const request = require('supertest');

let workerCallback;
jest.mock('bullmq', () => {
    return {
        Queue: jest.fn().mockImplementation(() => ({
            add: jest.fn().mockResolvedValue(true)
        })),
        Worker: jest.fn().mockImplementation((name, cb, opts) => {
            workerCallback = cb;
            return { close: jest.fn() };
        })
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

    it('should process job and make axios call', async () => {
        const axios = require('axios');
        axios.post = jest.fn().mockResolvedValue({ status: 200 });

        const job = {
            data: {
                endpoint: 'https://example.com/webhook',
                secret: 'my-secret',
                payload: { event: 'ping' }
            }
        };

        await workerCallback(job);
        
        expect(axios.post).toHaveBeenCalledWith(
            'https://example.com/webhook',
            JSON.stringify({ event: 'ping' }),
            expect.objectContaining({
                headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
                timeout: 5000
            })
        );
    });

    it('should throw error on axios failure', async () => {
        const axios = require('axios');
        axios.post = jest.fn().mockRejectedValue(new Error('Network Error'));

        const job = {
            data: {
                endpoint: 'https://example.com/webhook',
                secret: 'my-secret',
                payload: { event: 'ping' }
            }
        };

        await expect(workerCallback(job)).rejects.toThrow('Delivery failed: Network Error');
    });
});
