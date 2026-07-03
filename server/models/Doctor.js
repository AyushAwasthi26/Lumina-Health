import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  workingHours: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
  },
  slotDuration: { type: Number, default: 30 },
  leaveDays: { type: [String], default: [] },
}, { timestamps: true });

export default mongoose.model("Doctor", doctorSchema);