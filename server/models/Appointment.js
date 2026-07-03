import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  doctorId: { type: String, required: true },
  patientId: { type: String, default: null },
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

appointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["confirmed", "completed"] } },
  }
);

export default mongoose.model("Appointment", appointmentSchema);
