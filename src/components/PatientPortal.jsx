import { CalendarDays, CheckCircle2, Clock, Search, ShieldCheck, Sparkles, UserRound, XCircle } from "lucide-react";
import { cx, Field, Input, TextArea, IconButton, StatusBadge, SectionTitle, AiLoadingOverlay } from "./SharedUi";

export default function PatientPortal({ booking, setBooking, handleBookAppointment, filteredDoctors, slots, holdSlot, loading, selectedDoctor, patientAppointments, cancelAppointment }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      
      {/* LEFT COLUMN: BOOKING FLOW */}
      <section className="grid gap-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl">
          <SectionTitle icon={Search} title="Find Your Specialist" />
          <div className="relative mt-2">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input placeholder="Search by specialization (e.g., Cardiology)" value={booking.specialization} onChange={(e) => setBooking({ ...booking, specialization: e.target.value })} className="pl-11 w-full" />
          </div>

          <div className="mt-6 grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredDoctors.map((doctor) => (
              <button key={doctor.id} type="button" onClick={() => setBooking({ ...booking, doctorId: doctor.id, time: "" })}
                className={cx("group relative grid gap-3 rounded-xl border p-4 text-left transition-all duration-300",
                  booking.doctorId === doctor.id ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-white/5 bg-zinc-800/30 hover:border-white/20 hover:bg-zinc-800/60"
                )}>
                {booking.doctorId === doctor.id && <div className="absolute top-3 right-3"><CheckCircle2 className="size-5 text-amber-400" /></div>}
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-300 shadow-inner"><UserRound className="size-6" /></div>
                  <div>
                    <h3 className="font-bold text-zinc-100">{doctor.name}</h3>
                    <p className="text-sm text-amber-400/80">{doctor.specialization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500 ml-16">
                  <span className="flex items-center gap-1"><Clock className="size-3" />{doctor.workingHours?.start} - {doctor.workingHours?.end}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="size-3" />{doctor.slotDuration}m slots</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedDoctor && (
          <form onSubmit={handleBookAppointment} className="relative rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl overflow-hidden">
            {/* AI LOADING OVERLAY */}
            {loading && <AiLoadingOverlay />}
            
            <SectionTitle icon={Sparkles} title="Book Appointment" action={<span className="text-sm font-medium text-zinc-500">With {selectedDoctor.name}</span>} />
            
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Patient Name"><Input value={booking.patientName} onChange={(e) => setBooking({ ...booking, patientName: e.target.value })} required /></Field>
              <Field label="Patient Email"><Input type="email" value={booking.patientEmail} onChange={(e) => setBooking({ ...booking, patientEmail: e.target.value })} required /></Field>
              <Field label="Preferred Date"><Input type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value, time: "" })} required /></Field>
              <Field label="Specialization"><Input value={selectedDoctor.specialization} disabled className="opacity-50 cursor-not-allowed" /></Field>
            </div>

            <div className="mt-5">
              <Field label="Describe Symptoms (Urgency will be analyzed by AI)">
                <TextArea placeholder="E.g., I have had a persistent headache for 3 days, mild fever, and feel dizzy when standing up quickly..." value={booking.symptoms} onChange={(e) => setBooking({ ...booking, symptoms: e.target.value })} rows={4} required />
              </Field>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2"><CalendarDays className="size-4 text-amber-500" /> Available Time Slots</h4>
              {slots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {slots.map((slot) => (
                    <button key={slot.time} type="button" disabled={!slot.available || slot.leaveDay} onClick={() => holdSlot(slot.time)}
                      className={cx("rounded-xl border py-3 text-sm font-bold transition-all duration-200",
                        slot.leaveDay && "cursor-not-allowed border-rose-500/20 bg-rose-500/5 text-rose-400/50 line-through",
                        slot.booked && "cursor-not-allowed border-zinc-700/50 bg-zinc-800/20 text-zinc-600 line-through",
                        slot.held && !slot.booked && "cursor-not-allowed border-amber-500/30 bg-amber-500/5 text-amber-500/60 animate-pulse",
                        slot.available && !slot.held && booking.time === slot.time && "border-amber-500 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
                        slot.available && !slot.held && booking.time !== slot.time && "border-white/10 bg-zinc-800/40 text-zinc-300 hover:border-amber-500/50 hover:bg-zinc-800/80"
                      )}>
                      {slot.time}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-600">Select a doctor and date to view available slots.</div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <IconButton type="submit" loading={loading} disabled={!booking.time}>
                <ShieldCheck className="size-4" />
                Confirm & Generate AI Summary
              </IconButton>
            </div>
          </form>
        )}
      </section>

      {/* RIGHT COLUMN: TIMELINE & HISTORY */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl h-fit">
        <SectionTitle icon={Clock} title="Your Appointments" />
        
        <div className="mt-6 relative pl-6 border-l border-zinc-800 space-y-6">
          {patientAppointments.length > 0 ? patientAppointments.map((apt) => (
            <div key={apt.id} className="relative group">
              <div className={cx("absolute -left-[31px] top-1 size-4 rounded-full border-2 border-zinc-900 group-hover:scale-125 transition-transform",
                apt.status === "confirmed" ? "bg-amber-500" : apt.status === "completed" ? "bg-emerald-500" : "bg-rose-500"
              )} />

              <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-4 transition hover:bg-zinc-800/60">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-zinc-200">{apt.doctor?.name || "Doctor"}</h4>
                    <p className="text-sm text-zinc-500 mt-1">{apt.date} • {apt.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={apt.status} />
                    {apt.status === "confirmed" && (
                      <button onClick={() => cancelAppointment(apt.id)} className="text-[10px] font-bold text-rose-400 border border-rose-500/30 px-2 py-1 rounded hover:bg-rose-500/10 transition">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {apt.preVisitSummary && apt.status !== "cancelled" && (
                  <div className="mt-4 rounded-lg bg-zinc-900/50 p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">AI Pre-Visit Analysis</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${!apt.preVisitSummary.fallback ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-zinc-700 text-zinc-500 bg-zinc-800"}`}>
                        {!apt.preVisitSummary.fallback ? "✨ Gemini AI" : "Local Fallback"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cx("text-xs font-bold px-2 py-0.5 rounded", apt.preVisitSummary.urgency === "High" ? "bg-rose-500/20 text-rose-400" : apt.preVisitSummary.urgency === "Medium" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400")}>
                        {apt.preVisitSummary.urgency} Urgency
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 italic">"{apt.preVisitSummary.chiefComplaint}"</p>
                  </div>
                )}

                {apt.postVisitSummary && (
                  <div className="mt-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Post-Visit Summary</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${!apt.postVisitSummary.fallback ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-zinc-700 text-zinc-500 bg-zinc-800"}`}>
                        {!apt.postVisitSummary.fallback ? "✨ Gemini AI" : "Local Fallback"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">{apt.postVisitSummary.summary}</p>
                    {apt.postVisitSummary.medicationSchedule && (
                      <p className="text-xs text-zinc-500 mt-2 border-t border-white/5 pt-2"><span className="font-bold text-zinc-400">Meds:</span> {apt.postVisitSummary.medicationSchedule}</p>
                    )}
                    {/* NEW: AI Follow-up Steps Checklist */}
                    {apt.postVisitSummary.followUpSteps?.length > 0 && (
                      <div className="mt-3 border-t border-white/5 pt-3">
                        <p className="text-xs font-bold text-zinc-500 mb-2">Follow-Up Steps:</p>
                        <ul className="space-y-1.5">
                          {apt.postVisitSummary.followUpSteps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                              <div className="mt-0.5 size-3.5 rounded border border-zinc-600 bg-zinc-800 shrink-0" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-10 text-zinc-600">
              <Clock className="size-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No appointments yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}