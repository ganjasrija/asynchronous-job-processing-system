
This project implements an asynchronous backend system to process long-running tasks using Redis and worker queues.  
Tasks like CSV generation and email sending are handled in the background without blocking the main API.

---

## Tech Stack
- Node.js
- Express.js
- PostgreSQL
- Redis
- BullMQ
- Nodemailer
- Mailhog
- Docker & Docker Compose

---

## Architecture
- API Service: Accepts job requests and enqueues them into Redis
- Worker Service: Consumes and processes jobs asynchronously
- Redis: Message broker / job queue
- PostgreSQL: Stores job metadata, status, results, and errors
- Mailhog: Mock SMTP server for email testing

---

## Job Lifecycle
- pending → processing → completed / failed
- Failed jobs are retried up to 3 times
- Supports high and default priority queues

---

## Supported Job Types

### CSV_EXPORT
Generates a CSV file from JSON data.

Payload:
{
"data": [
{ "id": 1, "name": "Alice", "email": "alice@example.com" },
{ "id": 2, "name": "Bob", "email": "bob@example.com" }
]
}


Result:
- CSV file saved in output/{jobId}.csv
- File path stored in database

---

### EMAIL_SEND
Sends an email using Mailhog.

Payload:
{
"to": "user@test.com",
"subject": "Job Notification",
"body": "Your job has completed successfully."
}


Emails can be viewed at:
http://localhost:8025

---

## API Endpoints

POST /jobs  
Creates a new job.

GET /jobs/:id  
Fetches job status and details.

---

## Environment Variables
All required environment variables are documented in .env.example.

---

## How to Run

Start services:
docker-compose up --build

Stop services:
docker-compose down

---

## Verification
- API runs on http://localhost:3000
- Mailhog UI available at http://localhost:8025
- CSV files generated in output/
- Job status tracked in PostgreSQL
