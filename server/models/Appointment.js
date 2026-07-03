import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  doctorId: { type: String, required: true },
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  symptoms: { type: String, required: true },
  status: { type: String, enum: ["confirmed", "completed", "cancelled", "reschedule_required"], default: "confirmed" },
  preVisitSummary: {
    urgency: { type: String, default: "Low" },
    chiefComplaint: { type: String, default: "" },
    suggestedQuestions: { type: [String], default: [] },
    fallback: { type: Boolean, default: true },
  },
  postVisitSummary: {
    summary: { type: String, default: "" },
    medicationSchedule: { type: String, default: "" },
    followUpSteps: { type: [String], default: [] },
    fallback: { type: Boolean, default: true },
  },
  prescription: { type: String, default: "" },
  calendarEventId: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model("Appointment", appointmentSchema);