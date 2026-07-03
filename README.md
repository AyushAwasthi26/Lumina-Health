<img width="1092" height="282" alt="Screenshot 2026-07-03 232525" src="https://github.com/user-attachments/assets/a33d7717-ba3a-4f4e-828a-171801dbfa33" />
# 🏥 Lumina Health — AI-Powered Smart Healthcare Appointment Management

<div align="center">


### Intelligent Appointment Scheduling with AI Triage, JWT Authentication & Google Calendar Integration

*Built for modern healthcare using AI, secure authentication and intelligent scheduling.*

![React](...)
![Node.js](...)
![Express](...)
![MongoDB](...)
![Gemini AI](...)
![JWT](...)
![Google Calendar](...)
![Vite](...)

</div>

---

Lumina Health is a full-stack AI-powered healthcare appointment management platform that streamlines the complete appointment lifecycle.

Patients can securely register, log in, describe their symptoms, receive AI-generated urgency analysis, schedule appointments with available doctors, and automatically sync appointments with Google Calendar.

Doctors receive organized patient queues with AI-generated visit summaries, while administrators manage doctors, schedules, leave requests, and appointments from a centralized dashboard.

---

# 📋 Table of Contents

- 📸 Screenshots
- 🌟 About the Project
- ✨ Features
- 🚀 Getting Started
- ⚙️ Environment Variables
- 📂 Folder Structure
- 📡 API Documentation
- 🗄 Database Schema
- 🤖 AI Prompt Engineering
- 📅 Google Calendar Integration
- 💻 Tech Stack
- 🔐 Authentication
- 👥 Project Team
- 📜 License

---

## 📸 Screenshots

<img width="1920" height="1080" alt="Screenshot 2026-07-04 030107" src="https://github.com/user-attachments/assets/e67f1e87-a5a4-47bd-b3da-24cc769772bc" />
<img width="1920" height="1080" alt="Screenshot 2026-07-04 030117" src="https://github.com/user-attachments/assets/2ca6dc11-d19c-40cf-b784-c43469b2992f" />
<img width="1918" height="1077" alt="Screenshot 2026-07-04 030359" src="https://github.com/user-attachments/assets/52a08cdb-59c6-4f84-9878-e436dd077924" />
<img width="1140" height="1025" alt="Screenshot 2026-07-04 030415" src="https://github.com/user-attachments/assets/f92814ce-ce0b-4cd0-a596-53be8e664085" />
<img width="1895" height="1078" alt="Screenshot 2026-07-04 030522" src="https://github.com/user-attachments/assets/b9abdd05-5b5f-4fc4-aef3-f947f3efa0c9" />
<img width="1026" height="1078" alt="Screenshot 2026-07-04 030540" src="https://github.com/user-attachments/assets/00e8dc48-3d65-4090-bb04-e09d48576d3a" />
<img width="1896" height="1078" alt="Screenshot 2026-07-04 030739" src="https://github.com/user-attachments/assets/74755394-b04e-4de0-8703-e410941e3efb" />
<img width="696" height="696" alt="Screenshot 2026-07-04 030801" src="https://github.com/user-attachments/assets/67b3bb09-d45e-47c3-85d3-32d3bcdc57c5" />
<img width="1627" height="731" alt="Screenshot 2026-07-04 030852" src="https://github.com/user-attachments/assets/1f571833-9199-4326-abec-e5b1f88953e5" />



---

# 🚀 Getting Started

## 1. Clone Repository

```bash
git clone https://github.com/AyushAwasthi26/Lumina-Health.git
```

---

## 2. Open Project

```bash
cd Lumina-Health
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Configure Environment Variables

Create a `.env` file in the project root.

Copy all values from `.env.example`.

Example:

```env
PORT=5001

HOST=127.0.0.1

CLIENT_ORIGIN=http://localhost:5173

MONGO_URI=your_mongodb_uri

JWT_SECRET=your_secret

GEMINI_API_KEY=your_key

GOOGLE_CLIENT_ID=your_client_id

GOOGLE_CLIENT_SECRET=your_secret

GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
```

---

## 5. Start Backend

```bash
node server/index.js
```

or

```bash
npm run server
```

Backend runs on

```
http://localhost:5001
```

---

## 6. Start Frontend

Open another terminal.

```bash
npm run dev
```

Frontend runs on

```
http://localhost:5173
```

---

## 7. Open Browser

Visit

```
http://localhost:5173
```

🎉 Lumina Health is now running locally.

---

# 🌟 About the Project

(write your About section)

---

# ✨ Features

(your features)

---

# ⚙️ Environment Variables

Explain each variable in a table.

| Variable | Purpose |
|-----------|----------|
| MONGO_URI | MongoDB Atlas Connection |
| JWT_SECRET | JWT Signing Secret |
| CLIENT_ORIGIN | Allowed Frontend Origin |
| GEMINI_API_KEY | Google Gemini API |
| GOOGLE_CLIENT_ID | OAuth Client |
| GOOGLE_CLIENT_SECRET | OAuth Secret |
| GOOGLE_REDIRECT_URI | OAuth Callback |

---

# 📂 Folder Structure

(your project tree)

---

# 📡 API Documentation

Patients

Doctors

Appointments

Authentication

Notifications

---

# 🗄 Database Schema

Users

Doctors

Appointments

---

# 🤖 AI Prompt Engineering

Instead of exposing your exact prompts, write something like:

### Prompt 1 — Medical Urgency Classification

Purpose:

Determines urgency level from patient symptoms.

Expected Output

- Low
- Medium
- High

---

### Prompt 2 — Visit Summary Generation

Purpose

Creates concise doctor-facing clinical notes from patient information.

---

### Prompt 3 — Prescription Explanation

Purpose

Converts medical prescriptions into patient-friendly language.

---

### Prompt 4 — Follow-up Recommendation

Purpose

Suggests appropriate follow-up schedules based on diagnosis.

---

### Prompt 5 — Appointment Prioritization

Purpose

Ranks appointments using symptom severity and urgency.

---

### Prompt 6 — Clinical Note Formatting

Purpose

Transforms structured medical data into standardized clinical documentation.

---

# 📅 Google Calendar Integration

1. Create Google Cloud Project

2. Enable Calendar API

3. Configure OAuth Consent Screen

4. Generate OAuth Credentials

5. Add Redirect URI

```
http://localhost:5001/api/auth/google/callback
```

6. Update `.env`

```
GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=

GOOGLE_REDIRECT_URI=
```

---

# 💻 Tech Stack

Frontend

Backend

Database

Authentication

AI

Deployment

---

# 🔐 Authentication

- JWT Authentication
- Password Hashing (bcrypt)
- Protected Routes
- Role Based Access Control
- Patient
- Doctor
- Admin

---

# 👥 Project Team

**Ayush Awasthi**

Full Stack Developer

Designed and developed the complete platform including frontend, backend, AI integration, JWT authentication, appointment engine, and Google Calendar integration.

---

# 📜 License

MIT License

See LICENSE for more details.

---

Made with ❤️ using React, Node.js, MongoDB & Google Gemini.
