const express = require('express');
const { jobQueue } = require('../lib/queue');
const db = require('../db');
const app = express();

app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Create Job Endpoint
app.post('/jobs', async (req, res) => {
    const { type, priority = 'default', payload } = req.body;

    if (!type || !payload) {
        return res.status(400).json({ error: 'Type and payload are required' });
    }

    try {
        // 1. Create DB record
        const insertQuery = `
      INSERT INTO jobs (type, status, priority, payload)
      VALUES ($1, 'pending', $2, $3)
      RETURNING id
    `;
        const result = await db.query(insertQuery, [type, priority, payload]);
        const jobId = result.rows[0].id;

        // 2. Add to BullMQ
        const queuePriority = priority === 'high' ? 1 : 10; // Lower number = higher priority in Bull/BullMQ? 
        // Wait, typically in BullMQ priority 1 is highest, larger numbers are lower.
        // Let's verify requirement "Jobs with high priority must be processed before jobs with default priority."

        await jobQueue.add(type, { jobId, type, payload }, {
            priority: queuePriority,
            jobId: jobId // Use DB UUID as BullMQ Job ID for easy tracking
        });

        res.status(201).json({ jobId });
    } catch (err) {
        console.error('Error creating job:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get Job Status Endpoint
app.get('/jobs/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
      SELECT id, type, status, priority, attempts, result, error, created_at as "createdAt", updated_at as "updatedAt"
      FROM jobs
      WHERE id = $1
    `;
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching job:', err);
        // basic check for uuid validity
        if (err.code === '22P02') {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
