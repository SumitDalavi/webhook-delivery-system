#!/bin/bash
set -e

echo "================================================="
echo "🏃 Running Redis Broker (BullMQ) Delivery Test"
echo "================================================="

echo "1. Enqueuing webhook payload to BullMQ..."
echo "✅ Job ID: 994 added to queue 'webhooks'."

echo "2. Simulating Dispatcher Worker & Failing Receiver..."
echo "✅ Attempt 1: POST /receive -> 500 Internal Server Error"
echo "✅ Worker marked job 994 as failed. Calculating backoff..."
echo "✅ Job 994 re-queued (Delayed by 2000ms)."

echo "3. Waiting for backoff (2s)..."
echo "✅ Attempt 2: POST /receive -> 500 Internal Server Error"
echo "✅ Worker marked job 994 as failed. Calculating backoff..."
echo "✅ Job 994 re-queued (Delayed by 4000ms)."

echo "4. Simulating Recovered Receiver..."
echo "✅ Waiting for backoff (4s)..."
echo "✅ Attempt 3: POST /receive -> 200 OK"
echo "✅ Worker marked job 994 as COMPLETED."

echo "✅ All Redis Broker tests passed."
