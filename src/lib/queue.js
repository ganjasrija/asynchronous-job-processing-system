const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

// Create a shared connection instance
const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

// Create queues
const jobQueue = new Queue('jobQueue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

module.exports = {
    jobQueue,
    connection
};
