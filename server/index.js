import crypto from "crypto";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import Doctor from "./models/Doctor.js";
import Appointment from "./models/Appointment.js";
import User from "./models/User.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5001);
const HOLD_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-this-secret";
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : (process.env.HOST || "127.0.0.1");
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json({ limit: "250kb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

const holds = new Map();
const notifications = [];

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), candidate);
}

function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    doctorId: user.doctorId || null,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  return payload.exp > Date.now() ? payload : null;
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    doctorId: user.doctorId || null,
  };
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const payload = verifyToken(header.startsWith("Bearer ") ? header.slice(7) : "");
    if (!payload) return res.status(401).json({ error: "Login required" });
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: "Login required" });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Login required" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

function minutesFromTime(time) {
  const [hours, minutes] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function timeFromMinutes(value) {
  const hours = String(Math.floor(value / 60)).padStart(2, "0");
  const minutes = String(value % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function slotKey(doctorId, date, time) {
  return `${doctorId}:${date}:${time}`;
}

function cleanupExpiredHolds() {
  const now = Date.now();
  for (const [key, hold] of holds.entries()) {
    if (hold.expiresAt <= now) holds.delete(key);
  }
}

function buildDoctorQuery(specialization) {
  const trimmed = String(specialization || "").trim();
  if (!trimmed) return {};
  return { specialization: { $regex: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } };
}

async function getAvailableSlots(doctor, date) {
  const doctorId = doctor._id.toString();
  const start = minutesFromTime(doctor.workingHours?.start);
  const end = minutesFromTime(doctor.workingHours?.end);
  const duration = Number(doctor.slotDuration || 30);
  if (start === null || end === null || duration < 5 || start >= end) return [];

  const existing = new Set(
    (await Appointment.find({ doctorId, date, status: { $nin: ["cancelled", "reschedule_required"] } })).map((a) => a.time)
  );
  cleanupExpiredHolds();

  const dayIsLeave = doctor.leaveDays.includes(date);
  const slots = [];
  for (let cursor = start; cursor + duration <= end; cursor += duration) {
    const time = timeFromMinutes(cursor);
    const hold = holds.get(slotKey(doctorId, date, time));
    slots.push({
      time,
      available: !dayIsLeave && !existing.has(time) && !hold,
      booked: existing.has(time),
      held: Boolean(hold),
      leaveDay: dayIsLeave,
    });
  }
  return slots;
}

async function assertSlotAvailable({ doctor, doctorId, date, time, patientId = null }) {
  if (!isDate(date)) throw Object.assign(new Error("Valid date is required"), { status: 400 });
  const slots = await getAvailableSlots(doctor, date);
  const slot = slots.find((candidate) => candidate.time === time);
  const hold = holds.get(slotKey(doctorId, date, time));
  if (!slot || slot.leaveDay || slot.booked || (hold && hold.patientId !== patientId)) {
    throw Object.assign(new Error("Slot is not available"), { status: 409 });
  }

  const existing = await Appointment.findOne({ doctorId, date, time, status: { $nin: ["cancelled", "reschedule_required"] } });
  if (existing) throw Object.assign(new Error("Slot already booked"), { status: 409 });
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No API key");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) throw new Error("Gemini API request failed");
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } finally {
    clearTimeout(timeout);
  }
}

async function analyseSymptoms(symptoms) {
  const cleanSymptoms = String(symptoms || "").trim();
  const prompt = `Analyse these symptoms and return a JSON object with exactly these keys: "urgency" (must be exactly "Low", "Medium", or "High"), "chiefComplaint" (string), "suggestedQuestions" (array of exactly 3 strings). Symptoms: ${cleanSymptoms}`;

  try {
    const result = await callGemini(prompt);
    return {
      urgency: ["Low", "Medium", "High"].includes(result.urgency) ? result.urgency : "Medium",
      chiefComplaint: result.chiefComplaint || "Symptoms analyzed.",
      suggestedQuestions: Array.isArray(result.suggestedQuestions) ? result.suggestedQuestions.slice(0, 3) : [],
      fallback: false,
    };
  } catch (error) {
    console.error("LLM fallback triggered for symptoms:", error.message);
    const text = cleanSymptoms.toLowerCase();
    const high = ["chest", "breath", "faint", "seizure", "severe", "bleeding"];
    const med = ["fever", "dizzy", "pain", "rash", "vomit"];
    return {
      urgency: high.some((w) => text.includes(w)) ? "High" : med.some((w) => text.includes(w)) ? "Medium" : "Low",
      chiefComplaint: cleanSymptoms.split(/[.!?]/).find(Boolean)?.trim().slice(0, 120) || "Symptoms submitted.",
      suggestedQuestions: ["When did this start?", "What makes it worse?", "Relevant medical history?"],
      fallback: true,
    };
  }
}

async function summariseVisit(notes, prescription) {
  const cleanNotes = String(notes || "").trim();
  const cleanPrescription = String(prescription || "").trim();
  const prompt = `Convert these clinical notes into a patient-friendly summary. Return a JSON object with exactly these keys: "summary" (string), "medicationSchedule" (string based on prescription), "followUpSteps" (array of 3 strings). Clinical Notes: ${cleanNotes}. Prescription: ${cleanPrescription}`;

  try {
    const result = await callGemini(prompt);
    return {
      summary: result.summary || "No summary generated.",
      medicationSchedule: result.medicationSchedule || cleanPrescription || "None recorded.",
      followUpSteps: Array.isArray(result.followUpSteps) ? result.followUpSteps.slice(0, 3) : [],
      fallback: false,
    };
  } catch (error) {
    console.error("LLM fallback triggered for visit summary:", error.message);
    return {
      summary: cleanNotes || "No notes provided by doctor.",
      medicationSchedule: cleanPrescription || "None recorded.",
      followUpSteps: ["Follow the medication schedule exactly as prescribed.", "Book a follow-up if symptoms worsen or do not improve.", "Keep this summary available for your next visit."],
      fallback: true,
    };
  }
}

function queueNotification({ type, appointmentId, recipient, message }) {
  const notification = {
    id: crypto.randomUUID(),
    type,
    appointmentId,
    channel: "email",
    recipient,
    status: "queued",
    attempts: 0,
    message,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(notification);
  return notification;
}

async function seedDatabase() {
  const defaultDoctors = [
    { name: "Dr. Meera Kapoor", specialization: "Cardiology", email: "meera.kapoor@clinic.test", workingHours: { start: "09:00", end: "15:00" }, slotDuration: 30, leaveDays: ["2026-07-09"] },
    { name: "Dr. Arjun Rao", specialization: "Dermatology", email: "arjun.rao@clinic.test", workingHours: { start: "10:00", end: "17:00" }, slotDuration: 45, leaveDays: [] },
    { name: "Dr. Naina Singh", specialization: "General Medicine", email: "naina.singh@clinic.test", workingHours: { start: "08:30", end: "14:30" }, slotDuration: 30, leaveDays: [] },
  ];

  if ((await Doctor.countDocuments()) === 0) {
    await Doctor.insertMany(defaultDoctors);
    console.log("Seeded default doctors");
  }

  const doctors = await Doctor.find();
  const doctorByEmail = new Map(doctors.map((doctor) => [doctor.email, doctor]));
  const seedUsers = [
    { name: "Clinic Admin", email: process.env.SEED_ADMIN_EMAIL || "admin@clinic.test", password: process.env.SEED_ADMIN_PASSWORD || "admin123", role: "admin" },
    { name: "Aarav Mehta", email: process.env.SEED_PATIENT_EMAIL || "aarav@example.com", password: process.env.SEED_PATIENT_PASSWORD || "patient123", role: "patient" },
    ...defaultDoctors.map((doctor) => ({
      name: doctor.name,
      email: doctor.email,
      password: process.env.SEED_DOCTOR_PASSWORD || "doctor123",
      role: "doctor",
      doctorId: doctorByEmail.get(doctor.email)?._id.toString(),
    })),
  ];

  for (const seedUser of seedUsers) {
    const existing = await User.findOne({ email: seedUser.email.toLowerCase() });
    if (!existing) {
      await User.create({ ...seedUser, email: seedUser.email.toLowerCase(), passwordHash: hashPassword(seedUser.password) });
    } else if (seedUser.role === "doctor" && seedUser.doctorId && !existing.doctorId) {
      existing.doctorId = seedUser.doctorId;
      await existing.save();
    }
  }
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    await seedDatabase();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || "").trim().toLowerCase() });
  if (!user || !user.active || !verifyPassword(String(password || ""), user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  return res.json({ token: signToken(user), user: publicUser(user) });
});

// NEW USER LOGIN METHOD: 

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered. Please log in." });
    }

    // Create the new user as a patient
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: hashPassword(String(password)),
      role: "patient", 
      active: true,
    });

    // Log them in immediately by returning the token and user object
    return res.status(201).json({ token: signToken(newUser), user: publicUser(newUser) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create account" });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get("/api/doctors", requireAuth, async (req, res) => {
  const doctors = await Doctor.find(buildDoctorQuery(req.query.specialization)).sort({ name: 1 });
  res.json(doctors);
});

app.post("/api/doctors", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, specialization, email, password, workingHours, slotDuration } = req.body || {};
  if (!name || !specialization || !email || !password) {
    return res.status(400).json({ error: "Name, specialization, email, and password are required" });
  }

  const doctor = await Doctor.create({
    name,
    specialization,
    email: String(email).trim().toLowerCase(),
    workingHours: workingHours || { start: "09:00", end: "16:00" },
    slotDuration: Number(slotDuration || 30),
  });

  await User.create({
    name,
    email: String(email).trim().toLowerCase(),
    passwordHash: hashPassword(String(password)),
    role: "doctor",
    doctorId: doctor._id.toString(),
  });

  res.status(201).json(doctor);
});

app.delete("/api/doctors/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });

  const activeAppointments = await Appointment.countDocuments({ doctorId: doctor._id.toString(), status: "confirmed" });
  if (activeAppointments > 0) {
    return res.status(409).json({ error: "Cannot remove a doctor with confirmed appointments" });
  }

  await User.updateMany({ doctorId: doctor._id.toString() }, { active: false });
  await Doctor.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.patch("/api/doctors/:id/leave", requireAuth, requireRole("admin"), async (req, res) => {
  const { date } = req.body || {};
  if (!isDate(date)) return res.status(400).json({ error: "Valid date required" });

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });
  if (!doctor.leaveDays.includes(date)) doctor.leaveDays.push(date);
  await doctor.save();

  const affected = await Appointment.find({ doctorId: doctor._id.toString(), date, status: "confirmed" });
  await Promise.all(affected.map(async (appointment) => {
    appointment.status = "reschedule_required";
    await appointment.save();
    queueNotification({ type: "doctor_leave", appointmentId: appointment._id, recipient: appointment.patientEmail, message: `${doctor.name} is on leave ${date}. Please reschedule.` });
  }));

  res.json({ doctor, affectedAppointments: affected });
});

app.get("/api/slots", requireAuth, async (req, res) => {
  const { doctorId, date } = req.query;
  if (!isDate(date)) return res.status(400).json({ error: "Valid date required" });
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });
  res.json(await getAvailableSlots(doctor, date));
});

app.post("/api/holds", requireAuth, requireRole("patient"), async (req, res) => {
  const { doctorId, date, time } = req.body || {};
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });

  await assertSlotAvailable({ doctor, doctorId: doctor._id.toString(), date, time, patientId: req.user._id.toString() });
  const key = slotKey(doctor._id.toString(), date, time);
  holds.set(key, { patientId: req.user._id.toString(), patientEmail: req.user.email, expiresAt: Date.now() + HOLD_TTL_MS });
  res.status(201).json({ key, expiresAt: holds.get(key).expiresAt });
});

app.get("/api/appointments", requireAuth, async (req, res) => {
  const query = {};
  if (req.user.role === "patient") {
    query.$or = [
      { patientId: req.user._id.toString() },
      { patientEmail: req.user.email },
    ];
  }
  if (req.user.role === "doctor") query.doctorId = req.user.doctorId;

  const appointments = await Appointment.find(query).sort({ createdAt: -1 });
  const doctors = await Doctor.find();
  const doctorMap = new Map(doctors.map((doctor) => [doctor._id.toString(), doctor]));
  res.json(appointments.map((appointment) => ({
    ...appointment.toObject(),
    id: appointment._id.toString(),
    doctorId: appointment.doctorId.toString(),
    doctor: doctorMap.get(appointment.doctorId.toString()),
  })));
});

app.post("/api/appointments", requireAuth, requireRole("patient"), async (req, res) => {
  try {
    const { doctorId, date, time, symptoms } = req.body || {};
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    cleanupExpiredHolds();
    const key = slotKey(doctor._id.toString(), date, time);
    const hold = holds.get(key);
    if (hold && hold.patientId !== req.user._id.toString()) return res.status(409).json({ error: "Slot held by another patient" });
    await assertSlotAvailable({ doctor, doctorId: doctor._id.toString(), date, time, patientId: req.user._id.toString() });
    holds.delete(key);

    const preVisitSummary = await analyseSymptoms(symptoms);
    const appointment = await Appointment.create({
      doctorId: doctor._id.toString(),
      patientId: req.user._id.toString(),
      patientName: req.user.name,
      patientEmail: req.user.email,
      date,
      time,
      symptoms: String(symptoms || "").trim(),
      status: "confirmed",
      preVisitSummary,
    });

    queueNotification({ type: "booking_confirmation", appointmentId: appointment._id, recipient: req.user.email, message: `Confirmed with ${doctor.name} on ${date} at ${time}.` });
    queueNotification({ type: "doctor_booking", appointmentId: appointment._id, recipient: doctor.email, message: `${req.user.name} booked ${date} at ${time}. Urgency: ${preVisitSummary.urgency}.` });

    res.status(201).json({ ...appointment.toObject(), id: appointment._id.toString(), doctorId: doctor._id.toString(), doctor });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.patch("/api/appointments/:id/cancel", requireAuth, requireRole("patient", "admin"), async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  if (req.user.role === "patient" && appointment.patientId !== req.user._id.toString() && appointment.patientEmail !== req.user.email) {
    return res.status(403).json({ error: "Forbidden" });
  }

  appointment.status = "cancelled";
  await appointment.save();
  const doctor = await Doctor.findById(appointment.doctorId);
  queueNotification({ type: "cancellation", appointmentId: appointment._id, recipient: appointment.patientEmail, message: `Cancelled appointment with ${doctor?.name} on ${appointment.date}.` });
  res.json({ ...appointment.toObject(), id: appointment._id.toString(), doctor });
});

app.patch("/api/appointments/:id/visit", requireAuth, requireRole("doctor"), async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  if (appointment.doctorId !== req.user.doctorId) return res.status(403).json({ error: "Forbidden" });

  const { notes, prescription } = req.body || {};
  appointment.status = "completed";
  appointment.prescription = String(prescription || "").trim();
  appointment.postVisitSummary = await summariseVisit(notes, prescription);
  await appointment.save();

  queueNotification({ type: "post_visit_summary", appointmentId: appointment._id, recipient: appointment.patientEmail, message: "Visit summary and prescription are ready." });
  if (appointment.prescription) queueNotification({ type: "medication_reminder", appointmentId: appointment._id, recipient: appointment.patientEmail, message: `Reminder: ${appointment.prescription}` });

  const doctor = await Doctor.findById(appointment.doctorId);
  res.json({ ...appointment.toObject(), id: appointment._id.toString(), doctor });
});

app.get("/api/notifications", requireAuth, requireRole("admin"), (req, res) => res.json(notifications));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: err.message || "Server error" });
});

app.listen(PORT, HOST, () => console.log(`Healthcare API running on http://${HOST}:${PORT}`));
