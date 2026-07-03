import { CheckCircle2, FileText, Stethoscope, AlertTriangle, ClipboardList, ListFilter } from "lucide-react";
import { cx, Field, Input, Select, TextArea, IconButton, StatusBadge, SectionTitle, AiLoadingOverlay } from "./SharedUi";
import { useState } from "react";

export default function DoctorPortal({ doctors, selectedDoctorId, setSelectedDoctorId, doctorAppointments, visitDrafts, setVisitDrafts, completeVisit, loading }) {
  const [filter, setFilter] = useState("all"); // New filter state

  const filteredAppointments = doctorAppointments.filter(apt => {
    if (filter === "all") return true;
    return apt.status === filter;
  });

  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
               <Stethoscope className="size-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100">Clinical Workspace</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-zinc-500">
              <ListFilter className="size-4" />
              <Select value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)} className="w-auto min-w-[200px] h-9 text-xs">
                {doctors.map((doc) => (<option key={doc.id} value={doc.id}>{doc.name}</option>))}
              </Select>
            </div>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto h-9 text-xs">
              <option value="all">All Status</option>
              <option value="confirmed">Pending</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </div>
        
        <div className="mt-2 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-4 text-center">
            <p className="text-3xl font-black text-zinc-100">{doctorAppointments.filter(a => a.status === 'confirmed').length}</p>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-bold">Pending</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
            <p className="text-3xl font-black text-emerald-400">{doctorAppointments.filter(a => a.status === 'completed').length}</p>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-bold">Completed</p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-center">
            <p className="text-3xl font-black text-rose-400">{doctorAppointments.filter(a => a.preVisitSummary?.urgency === 'High' && a.status === 'confirmed').length}</p>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-bold">High Urgency</p>
          </div>
        </div>
      </div>

      {filteredAppointments.length > 0 ? filteredAppointments.map((appointment) => (
        <article key={appointment.id} className="relative grid gap-6 rounded-2xl border border-white/10 bg-zinc-900/50 shadow-2xl backdrop-blur-xl overflow-hidden lg:grid-cols-2">
          
          {/* AI Loading Overlay for Visit Completion */}
          {loading && appointment.status === "confirmed" && <AiLoadingOverlay text="Generating Patient-Friendly Summary..." />}

          <div className="p-6 border-b lg:border-b-0 lg:border-r border-white/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-100">{appointment.patientName}</h3>
                <p className="text-sm text-zinc-500 mt-1">{appointment.date} • {appointment.time} • {appointment.patientEmail}</p>
              </div>
              <StatusBadge status={appointment.status} />
            </div>

            {appointment.status === "confirmed" && appointment.preVisitSummary && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`size-5 ${appointment.preVisitSummary.urgency === 'High' ? 'text-rose-400' : 'text-amber-400'}`} />
                    <h4 className="font-bold text-zinc-200">AI Pre-Visit Analysis</h4>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${!appointment.preVisitSummary.fallback ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-zinc-700 text-zinc-500 bg-zinc-800"}`}>
                    {!appointment.preVisitSummary.fallback ? "✨ Gemini AI" : "Local Fallback"}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Chief Complaint</p>
                    <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{appointment.preVisitSummary.chiefComplaint}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Urgency Level</p>
                    <span className={cx("px-3 py-1 rounded-lg text-sm font-black", appointment.preVisitSummary.urgency === "High" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : appointment.preVisitSummary.urgency === "Medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30")}>
                      {appointment.preVisitSummary.urgency}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Suggested Questions</p>
                    <ul className="space-y-2">{appointment.preVisitSummary.suggestedQuestions.map((q, i) => (<li key={i} className="flex gap-3 text-sm text-zinc-400"><span className="font-bold text-amber-500/80">0{i+1}.</span> {q}</li>))}</ul>
                  </div>
                </div>
              </div>
            )}

            {appointment.status === "completed" && appointment.postVisitSummary && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-zinc-200 flex items-center gap-2"><FileText className="size-5 text-emerald-400" /> Post-Visit Summary</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${!appointment.postVisitSummary.fallback ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-zinc-700 text-zinc-500 bg-zinc-800"}`}>
                    {!appointment.postVisitSummary.fallback ? "✨ Gemini AI" : "Local Fallback"}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{appointment.postVisitSummary.summary}</p>
                <div className="mt-4 p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                  <p className="text-xs font-bold text-zinc-500 uppercase">Prescription</p>
                  <p className="text-sm text-emerald-300 mt-1 font-medium">{appointment.postVisitSummary.medicationSchedule}</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-zinc-950/30">
            {appointment.status === "confirmed" ? (
              <div className="grid gap-5 h-full">
                <div className="flex items-center gap-2 text-zinc-400">
                  <ClipboardList className="size-5 text-amber-500" />
                  <h4 className="font-bold text-zinc-200">Complete Visit</h4>
                </div>
                <div className="flex-1 grid gap-5 content-between">
                  <div className="grid gap-5">
                    <Field label="Clinical Notes (Raw)"><TextArea placeholder="Patient presents with... Vitals stable..." value={visitDrafts[appointment.id]?.notes || ""} onChange={(e) => setVisitDrafts({ ...visitDrafts, [appointment.id]: { ...visitDrafts[appointment.id], notes: e.target.value } })} rows={6} /></Field>
                    <Field label="Prescription & Frequency"><Input placeholder="e.g., Amoxicillin 500mg - Three times daily" value={visitDrafts[appointment.id]?.prescription || ""} onChange={(e) => setVisitDrafts({ ...visitDrafts, [appointment.id]: { ...visitDrafts[appointment.id], prescription: e.target.value } })} /></Field>
                  </div>
                  <div className="mt-4">
                    <IconButton type="button" loading={loading} onClick={() => completeVisit(appointment.id)} className="w-full justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="size-4" />
                      Submit & Generate AI Summary