const { Worker } = require('bullmq');
const db = require('../db');
const { connection } = require('../lib/queue');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');   // ✅ FIXED
const nodemailer = require('nodemailer');

const OUTPUT_DIR = '/usr/src/app/output';

// Email Transporter (Mailhog)
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'mailhog',
    port: 1025,
    secure: false,
    ignoreTLS: true
});

const updateJobStatus = async (jobId, status, result = null, error = null, attempts = 0) => {
    try {
        let query = `
            UPDATE jobs 
            SET status = $1, updated_at = NOW(), attempts = $4
            WHERE id = $2
        `;
        let params = [status, jobId, result, attempts];

        if (result) {
            query = `
                UPDATE jobs 
                SET status = $1, result = $3, updated_at = NOW(), attempts = $4
                WHERE id = $2
            `;
        }

        if (error) {
            query = `
                UPDATE jobs 
                SET status = $1, error = $3, updated_at = NOW(), attempts = $4
                WHERE id = $2
            `;
            params = [status, jobId, error, attempts];
        }

        await db.query(query, params);
    } catch (e) {
        console.error('Error updating job status:', e);
    }
};

// Job Processors
const processJob = async (job) => {
    const { jobId, type, payload } = job.data;
    console.log(`Processing job ${jobId} of type ${type}`);

    await updateJobStatus(jobId, 'processing', null, null, job.attemptsMade + 1);

    if (type === 'CSV_EXPORT') {
        const data = payload.data;

        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid data for CSV_EXPORT');
        }

        try {
            // ✅ FIXED json2csv usage
            const parser = new Parser();
            const csv = parser.parse(data);

            const filePath = path.join(OUTPUT_DIR, `${jobId}.csv`);
            fs.writeFileSync(filePath, csv);

            return { filePath };
        } catch (err) {
            console.error('CSV Generation Error:', err);
            throw err;
        }

    } else if (type === 'EMAIL_SEND') {
        const { to, subject, body } = payload;

        await transporter.sendMail({
            from: process.env.MAIL_FROM || 'noreply@example.com',
            to,
            subject,
            text: body
        });

        return { message: 'Email sent' };
    } else {
        throw new Error(`Unknown job type: ${type}`);
    }
};

const worker = new Worker('jobQueue', processJob, {
    connection,
    concurrency: 1
});

worker.on('completed', async (job, result) => {
    console.log(`Job ${job.id} completed!`);
    await updateJobStatus(job.data.jobId, 'completed', result, null, job.attemptsMade + 1);
});

worker.on('failed', async (job, err) => {
    console.log(`Job ${job.id} failed with ${err.message}`);

    if (job.attemptsMade >= job.opts.attempts) {
        await updateJobStatus(job.data.jobId, 'failed', null, err.message, job.attemptsMade);
    } else {
        await updateJobStatus(job.data.jobId, 'pending', null, null, job.attemptsMade);
    }
});

console.log('Worker started');
