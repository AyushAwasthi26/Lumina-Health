# Healthcare Appointment Manager

React + Tailwind frontend with a Node.js + Express backend for patient booking, doctor visit summaries, admin doctor management, leave conflict handling, notification queueing, and Google Calendar integration stubs.

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, lucide-react
- Backend: Node.js, Express
- Current persistence: in-memory demo store in `server/index.js`
- Planned production persistence: PostgreSQL or MongoDB with the schema below

## Setup

```bash
npm install
cp .env.example .env
npm run server
```

In another terminal:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5001`

## Environment

```bash
PORT=5001
HOST=127.0.0.1
CLIENT_ORIGIN=http://localhost:5173
OPENAI_API_KEY=
SENDGRID_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5001/api/google/callback
```

The demo runs without API keys. Missing LLM keys are handled with local fallback summaries so appointment booking never breaks.

## API Docs

### Health and Auth

- `GET /api/health`
- `POST /api/auth/login`
  - Body: `{ "role": "patient", "name": "Demo User", "email": "demo@clinic.test" }`

### Doctors

- `GET /api/doctors?specialization=cardiology`
- `POST /api/doctors`
  - Body: `{ "name": "...", "specialization": "...", "email": "...", "workingHours": { "start": "09:00", "end": "16:00" }, "slotDuration": 30 }`
- `PATCH /api/doctors/:id/leave`
  - Body: `{ "date": "2026-07-08" }`
  - Marks the doctor unavailable, flags existing bookings for reschedule, and queues patient notifications.

### Slots and Appointments

- `GET /api/slots?doctorId=doc-101&date=2026-07-08`
- `POST /api/holds`
  - Body: `{ "doctorId": "doc-101", "date": "2026-07-08", "time": "10:30", "patientEmail": "patient@example.com" }`
- `GET /api/appointments?doctorId=doc-101`
- `GET /api/appointments?patientEmail=patient@example.com`
- `POST /api/appointments`
  - Body: `{ "doctorId": "...", "patientName": "...", "patientEmail": "...", "date": "...", "time": "...", "symptoms": "..." }`
- `PATCH /api/appointments/:id/cancel`
- `PATCH /api/appointments/:id/visit`
  - Body: `{ "notes": "...", "prescription": "Paracetamol 500mg twice daily for 3 days" }`

### Notifications and Calendar

- `GET /api/notifications`
- `GET /api/calendar-events`

## Database Schema

### users

`id`, `name`, `email`, `password_hash`, `role`, `created_at`

### doctors

`id`, `user_id`, `name`, `specialization`, `email`, `working_start`, `working_end`, `slot_duration`, `created_at`

### doctor_leave_days

`id`, `doctor_id`, `date`, `reason`, `created_at`

### slot_holds

`id`, `doctor_id`, `patient_id`, `date`, `time`, `expires_at`, `created_at`

Add a unique index on `(doctor_id, date, time)` for active holds.

### appointments

`id`, `doctor_id`, `patient_id`, `date`, `time`, `status`, `symptoms`, `pre_visit_summary_json`, `post_visit_summary_json`, `prescription`, `calendar_event_id`, `created_at`, `updated_at`

Add a unique index on `(doctor_id, date, time)` where `status in ('confirmed', 'completed')`.

### notifications

`id`, `appointment_id`, `type`, `channel`, `recipient`, `status`, `attempts`, `last_error`, `next_retry_at`, `created_at`

### calendar_events

`id`, `appointment_id`, `provider`, `external_event_id`, `status`, `attendees_json`, `created_at`, `updated_at`

## LLM Prompts

Pre-visit summary:

```text
Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>
```

Post-visit summary:

```text
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>
```

Expected output is stored as JSON on the appointment record. If the LLM call fails, the backend stores a fallback summary and marks it with `fallback: true`.

## Google Calendar Setup

1. Create a Google Cloud project.
2. Enable the Google Calendar API.
3. Configure OAuth consent screen for external or internal users.
4. Create OAuth 2.0 client credentials.
5. Add `GOOGLE_REDIRECT_URI` to the OAuth redirect list.
6. Store `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
7. On booking, create one event with patient and doctor attendees.
8. On reschedule, update event start/end times.
9. On cancellation or doctor leave conflict, delete or mark the event cancelled.

## System Design

The application separates patient, doctor, and admin workflows while keeping appointment integrity centralized in the backend. Patients search doctors by specialization, request a short-lived slot hold, submit symptoms, and then confirm the booking. Doctors receive the generated pre-visit summary with urgency, chief complaint, and suggested questions. After a visit, doctors submit notes and prescription details, and the backend generates a patient-friendly summary plus medication reminder notifications. Admins manage doctor profiles, working hours, slot duration, and leave days.

Double booking is prevented with two layers. First, the slot listing excludes confirmed appointments, active holds, and doctor leave days. Second, the booking endpoint performs the availability check again immediately before inserting the appointment. In production this should run inside a database transaction with a unique partial index on `(doctor_id, date, time)` for active bookings. If two requests arrive at the same time, only the first transaction commits; the second receives a conflict response and the UI reloads slots.

The slot hold mechanism reduces race conditions while a patient is completing the symptom form. Holds expire after five minutes and are removed before every slot or booking check. A hold only allows the same patient email to finish the booking; another patient sees the slot as held. Production storage should keep `expires_at` indexed and clean expired rows with a scheduled job.

Doctor leave handling runs through the admin endpoint. When a leave date is added, the backend finds confirmed appointments for that doctor on that date, marks them as `reschedule_required`, queues patient emails, and marks calendar events for update or cancellation. This keeps historical records intact while making the conflict visible to staff and patients.

Notifications are recorded before external delivery. Email, medication reminders, and calendar work should be processed by a background worker with retry metadata: attempts, last error, and next retry time. Failed SendGrid, Mailgun, Nodemailer, or Google Calendar calls should not roll back a confirmed appointment after the booking transaction succeeds. Instead, they remain queued for retry and visible to admins.

LLM integration is treated as helpful but non-critical. The backend uses deterministic fallback summaries when the model or API key is unavailable. That means patients can still book and doctors still receive a basic summary instead of an error page. In production, LLM responses should be validated against a JSON schema before storage.
