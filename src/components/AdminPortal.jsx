import { AlertTriangle, Bell, Plus, Server, UserRoundCog, XCircle, Activity, Database, Zap } from "lucide-react";
import { cx, Field, Input, IconButton, SectionTitle } from "../pages/HealthcareApp";

export default function AdminPortal({ createDoctor, newDoctor, setNewDoctor, leaveDate, setLeaveDate, doctors, markLeave, notifications, loading, appointments }) {
  
  const systemMetrics = [
    { icon: Database, label: "Total Doctors", value: doctors.length, color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
    { icon: Activity, label: "Total Appointments", value: appointments.length, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    { icon: Zap, label: "Pending Actions", value: notifications.filter(n => n.status === 'queued').length, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
    { icon: Server, label: "System Health", value: "100%", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  ];

  return (
    <section className="grid gap-6">
      
      {/* System Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((metric) => (
          <div key={metric.label} className={`rounded-xl border p-4 backdrop-blur-md transition hover:scale-[1.02] ${metric.color}`}>
            <metric.icon className="size-6 mb-2 opacity-80" />
            <p className="text-2xl font-black text-zinc-100">{metric.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mt-1">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Create Doctor Form */}
        <form onSubmit={createDoctor} className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl">
          <SectionTitle icon={UserRoundCog} title="Register New Doctor" />
          <div className="mt-6 grid gap-5">
            <Field label="Full Name">
              <Input value={newDoctor.name} onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })} placeholder="Dr. John Doe" required />
            </Field>
            <Field label="Specialization">
              <Input value={newDoctor.specialization} onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })} placeholder="Cardiology" required />
            </Field>
            <Field label="Email Address">
              <Input type="email" value={newDoctor.email} onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })} placeholder="doctor@clinic.com" required />
            </Field>
            
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/5">
              <Field label="Start Time">
                <Input type="time" value={newDoctor.start} onChange={(e) => setNewDoctor({ ...newDoctor, start: e.target.value })} />
              </Field>
              <Field label="End Time">
                <Input type="time" value={newDoctor.end} onChange={(e) => setNewDoctor({ ...newDoctor, end: e.target.value })} />
              </Field>
              <Field label="Slot (Min)">
                <Input type="number" min="15" step="15" value={newDoctor.slotDuration} onChange={(e) => setNewDoctor({ ...newDoctor, slotDuration: e.target.value })} />
              </Field>
            </div>

            <IconButton type="submit" loading={loading} className="w-full mt-2">
              <Plus className="size-4" />
              Add to System
            </IconButton>
          </div>
        </form>

        {/* Leave Conflict Manager */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl flex flex-col">
          <SectionTitle icon={AlertTriangle} title="Leave & Conflict Manager" />
          <p className="text-sm text-zinc-500 mt-2 mb-6">Marking a date as leave will automatically flag existing appointments and queue reschedule notifications to patients.</p>
          
          <div className="mb-6">
            <Field label="Select Date to Mark as Leave">
              <Input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="max-w-xs" />
            </Field>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-zinc-800/30 p-4 transition hover:bg-zinc-800/60">
                <div className="flex items-center gap-4">
                  <div className="grid size-10 place-items-center rounded-lg bg-zinc-800 text-zinc-400 border border-white/10">
                    <UserRoundCog className="size-5" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-200 text-sm">{doctor.name}</p>
                    <p className="text-xs text-zinc-500">{doctor.specialization}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {doctor.leaveDays.length > 0 && (
                    <div className="hidden sm:flex gap-1">
                      {doctor.leaveDays.slice(-2).map(d => (
                        <span key={d} className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">{d}</span>
                      ))}
                    </div>
                  )}
                  <IconButton 
                    type="button" 
                    loading={loading} 
                    onClick={() => markLeave(doctor.id)} 
                    className="h-9 px-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 shadow-none"
                  >
                    <XCircle className="size-4" />
                    Mark Leave
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Queue Monitor */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <SectionTitle icon={Bell} title="System Notification Queue" action={<span className="text-xs font-bold text-zinc-600 border border-zinc-800 px-3 py-1 rounded-full">{notifications.length} TOTAL</span>} />
        
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notifications.length > 0 ? notifications.slice(0, 9).map((note) => (
            <div key={note.id} className="group rounded-xl border border-white/5 bg-zinc-800/30 p-4 transition hover:border-white/10 hover:bg-zinc-800/60">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-500 truncate">{note.type.replace(/_/g, " ")}</span>
                <span className={cx(
                  "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  note.status === "queued" ? "border-amber-500/30 text-amber-400 bg-amber-500/10" : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                )}>
                  {note.status}
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{note.message}</p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs text-zinc-600 truncate max-w-[150px]">{note.recipient}</p>
                <p className="text-[10px] text-zinc-700">{new Date(note.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-12 text-center text-zinc-600">
              <Bell className="size-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold">Queue Empty</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}