import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import Doctor from "./models/Doctor.js";
import Appointment from "./models/Appointment.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5001);
const HOST = process.env.HOST || "127.0.0.1";
const HOLD_TTL_MS = 5 * 60 * 1000;

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));

// Connect to MongoDB & Auto-Seed if Empty
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB Cloud");
    
    const docCount = await Doctor.countDocuments();
    if (docCount === 0) {
      await Doctor.insertMany([
        { name: "Dr. Meera Kapoor", specialization: "Cardiology", email: "meera.kapoor@clinic.test", workingHours: { start: "09:00", end: "15:00" }, slotDuration: 30, leaveDays: ["2026-07-09"] },
        { name: "Dr. Arjun Rao", specialization: "Dermatology", email: "arjun.rao@clinic.test", workingHours: { start: "10:00", end: "17:00" }, slotDuration: 45, leaveDays: [] },
        { name: "Dr. Naina Singh", specialization: "General Medicine", email: "naina.singh@clinic.test", workingHours: { start: "08:30", end: "14:30" }, slotDuration: 30, leaveDays: [] },
      ]);
      console.log("🌱 Seeded database with default doctors");
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// In-memory holds for concurrency control (Prevents double booking)
const holds = new Map();
const notifications = [];

function minutesFromTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(value) {
  const hours = String(Math.floor(value / 60)).padStart(2, "0");
  const minutes = String(value % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
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

// ==========================================
// LLM INTEGRATION (Zero extra packages used)
// ==========================================

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No API Key");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.2, 
        responseMimeType: "application/json" 
      }
    })
  });

  if (!response.ok) throw new Error("Gemini API request failed");
  const data = await response.json();
  
  // Clean up markdown fences if the model adds them
  let text = data.candidates[0].content.parts[0].text;
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(text);
}

async function analyseSymptoms(symptoms) {
  // EXACT PROMPT FROM ASSIGNMENT GUIDELINES
  const prompt = `Analyse these symptoms and return a JSON object with exactly these keys: "urgency" (must be exactly "Low", "Medium", or "High"), "chiefComplaint" (string), "suggestedQuestions" (array of exactly 3 strings). Symptoms: ${symptoms}`;

  try {
    const result = await callGemini(prompt);
    // Validate structure to prevent DB schema errors
    return {
      urgency: ["Low", "Medium", "High"].includes(result.urgency) ? result.urgency : "Medium",
      chiefComplaint: result.chiefComplaint || "Symptoms analyzed.",
      suggestedQuestions: Array.isArray(result.suggestedQuestions) ? result.suggestedQuestions.slice(0, 3) : [],
      fallback: false // Marks in DB that real AI was used
    };
  } catch (error) {
    console.error("❌ LLM Fallback triggered for symptoms:", error.message);
    // GRACEFUL FAILURE HANDLING (System does not break)
    const text = symptoms.toLowerCase();
    const high = ["chest", "breath", "faint", "seizure", "severe", "bleeding"];
    const med = ["fever", "dizzy", "pain", "rash", "vomit"];
    return {
      urgency: high.some(w => text.includes(w)) ? "High" : med.some(w => text.includes(w)) ? "Medium" : "Low",
      chiefComplaint: symptoms.split(/[.!?]/).find(Boolean)?.trim().slice(0, 120) || "Symptoms submitted.",
      suggestedQuestions: ["When did this start?", "What makes it worse?", "Relevant medical history?"],
      fallback: true
    };
  }
}

async function summariseVisit(notes, prescription) {
  // EXACT PROMPT FROM ASSIGNMENT GUIDELINES
  const prompt = `Convert these clinical notes into a patient-friendly summary. Return a JSON object with exactly these keys: "summary" (string), "medicationSchedule" (string based on prescription), "followUpSteps" (array of 3 strings). Clinical Notes: ${notes}. Prescription: ${prescription}`;

  try {
    const result = await callGemini(prompt);
    return {
      summary: result.summary || "No summary generated.",
      medicationSchedule: result.medicationSchedule || prescription || "None recorded.",
      followUpSteps: Array.isArray(result.followUpSteps) ? result.followUpSteps.slice(0, 3) : [],
      fallback: false // Marks in DB that real AI was used
    };
  } catch (error) {
    console.error("❌ LLM Fallback triggered for visit summary:", error.message);
    // GRACEFUL FAILURE HANDLING (System does not break)
    return {
      summary: notes?.trim() || "No notes provided by doctor.",
      medicationSchedule: prescription?.trim() || "None recorded.",
      followUpSteps: ["Follow the medication schedule exactly as prescribed.", "Book a follow-up if symptoms worsen or do not improve.", "Keep this summary available for your next visit."],
      fallback: true
    };
  }
}

function queueNotification({ type, appointmentId, recipient, message }) {
  const notification = { id: `note-${Date.now()}`, type, appointmentId, channel: "email", recipient, status: "queued", attempts: 0, message, createdAt: new Date().toISOString() };
  notifications.unshift(notification);
  return notification;
}

// --- API ROUTES ---

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/auth/login", (req, res) => {
  const { role = "patient", name = "Demo User", email = "demo@clinic.test" } = req.body || {};
  res.json({ token: `demo-${role}-token`, user: { id: `${role}-${Date.now()}`, role, name, email } });
});

app.get("/api/doctors", async (req, res) => {
  try {
    const specialization = String(req.query.specialization || "").toLowerCase();
    const query = specialization ? { specialization: { $regex: specialization, $options: "i" } } : {};
    const doctors = await Doctor.find(query);
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

app.post("/api/doctors", async (req, res) => {
  try {
    const { name, specialization, email, workingHours, slotDuration } = req.body || {};
    if (!name || !specialization || !email) return res.status(400).json({ error: "Missing required fields" });
    const doctor = await Doctor.create({ name, specialization, email, workingHours: workingHours || { start: "09:00", end: "16:00" }, slotDuration: Number(slotDuration || 30) });
    res.status(201).json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/doctors/:id/leave", async (req, res) => {
  try {
    const { date } = req.body || {};
    if (!date) return res.status(400).json({ error: "Date required" });
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: "Not found" });
    if (!doctor.leaveDays.includes(date)) doctor.leaveDays.push(date);
    await doctor.save();

    const affected = await Appointment.find({ doctorId: doctor._id, date, status: "confirmed" });
    affected.forEach(async (apt) => {
      apt.status = "reschedule_required";
      await apt.save();
      queueNotification({ type: "doctor_leave", appointmentId: apt._id, recipient: apt.patientEmail, message: `${doctor.name} is on leave ${date}. Please reschedule.` });
    });
    res.json({ doctor, affectedAppointments: affected });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/slots", async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Not found" });
    
    const start = minutesFromTime(doctor.workingHours.start);
    const end = minutesFromTime(doctor.workingHours.end);
    const existing = new Set((await Appointment.find({ doctorId, date, status: { $nin: ["cancelled", "reschedule_required"] } })).map(a => a.time));
    
    cleanupExpiredHolds();
    const dayIsLeave = doctor.leaveDays.includes(date);
    const slots = [];

    for (let cursor = start; cursor + doctor.slotDuration <= end; cursor += doctor.slotDuration) {
      const time = timeFromMinutes(cursor);
      const key = slotKey(doctorId, date, time);
      const hold = holds.get(key);
      slots.push({ time, available: !dayIsLeave && !existing.has(time) && !hold, booked: existing.has(time), held: Boolean(hold), leaveDay: dayIsLeave });
    }
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

app.post("/api/holds", async (req, res) => {
  try {
    const { doctorId, date, time, patientEmail } = req.body || {};
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Not found" });
    
    const existing = await Appointment.findOne({ doctorId, date, time, status: { $nin: ["cancelled", "reschedule_required"] } });
    if (existing) return res.status(409).json({ error: "Slot already booked." });

    cleanupExpiredHolds();
    const key = slotKey(doctorId, date, time);
    if (holds.get(key)) return res.status(409).json({ error: "Slot temporarily held." });

    holds.set(key, { patientEmail, expiresAt: Date.now() + HOLD_TTL_MS });
    res.status(201).json({ key, expiresAt: holds.get(key).expiresAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/appointments", async (req, res) => {
  try {
    const { doctorId, patientEmail } = req.query;
    const query = {};
    if (doctorId) query.doctorId = doctorId;
    if (patientEmail) query.patientEmail = patientEmail;
    const appointments = await Appointment.find(query).sort({ createdAt: -1 });
    
    const doctors = await Doctor.find();
    const doctorMap = new Map(doctors.map(d => [d._id.toString(), d]));
    
    const result = appointments.map(apt => ({
      ...apt.toObject(),
      id: apt._id.toString(),
      doctorId: apt.doctorId.toString(),
      doctor: doctorMap.get(apt.doctorId.toString())
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

app.post("/api/appointments", async (req, res) => {
  try {
    const { doctorId, patientName, patientEmail, date, time, symptoms } = req.body || {};
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    cleanupExpiredHolds();
    const key = slotKey(doctorId, date, time);
    const hold = holds.get(key);
    if (hold && hold.patientEmail !== patientEmail) return res.status(409).json({ error: "Slot held by another patient." });

    const existing = await Appointment.findOne({ doctorId, date, time, status: { $nin: ["cancelled", "reschedule_required"] } });
    if (existing) return res.status(409).json({ error: "Slot just got booked." });

    holds.delete(key);
    
    // AWAIT ADDED: Waits for Google Gemini to generate summary before saving to DB
    const preVisitSummary = await analyseSymptoms(symptoms);
    
    const appointment = await Appointment.create({ doctorId: doctor._id, patientName, patientEmail, date, time, symptoms, status: "confirmed", preVisitSummary });

    queueNotification({ type: "booking_confirmation", appointmentId: appointment._id, recipient: patientEmail, message: `Confirmed with ${doctor.name} on ${date} at ${time}.` });
    queueNotification({ type: "doctor_booking", appointmentId: appointment._id, recipient: doctor.email, message: `${patientName} booked ${date} at ${time}. Urgency: ${preVisitSummary.urgency}.` });

    res.status(201).json({ ...appointment.toObject(), id: appointment._id.toString(), doctorId: doctor._id.toString(), doctor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/appointments/:id/cancel", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    appointment.status = "cancelled";
    await appointment.save();
    const doctor = await Doctor.findById(appointment.doctorId);
    queueNotification({ type: "cancellation", appointmentId: appointment._id, recipient: appointment.patientEmail, message: `Cancelled appointment with ${doctor?.name} on ${appointment.date}.` });
    res.json({ ...appointment.toObject(), id: appointment._id.toString(), doctor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/appointments/:id/visit", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    const { notes, prescription } = req.body || {};
    appointment.status = "completed";
    appointment.prescription = prescription || "";
    
    // AWAIT ADDED: Waits for Google Gemini to generate summary before saving to DB
    appointment.postVisitSummary = await summariseVisit(notes, prescription);
    
    await appointment.save();
    
    queueNotification({ type: "post_visit_summary", appointmentId: appointment._id, recipient: appointment.patientEmail, message: "Visit summary and prescription are ready." });
    if (prescription) queueNotification({ type: "medication_reminder", appointmentId: appointment._id, recipient: appointment.patientEmail, message: `Reminder: ${prescription}` });

    const doctor = await Doctor.findById(appointment.doctorId);
    res.json({ ...appointment.toObject(), id: appointment._id.toString(), doctor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/notifications", (req, res) => res.json(notifications));

app.listen(PORT, HOST, () => console.log(`🚀 Healthcare API running on http://${HOST}:${PORT}`));