import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardPlus,
  Clock3,
  FileText,
  HeartPulse,
  Loader2,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRoundCog,
  XCircle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const today = new Date().toISOString().split("T")[0];
const storedSession = JSON.parse(localStorage.getItem("healthcareSession") || "null");

const emptyBooking = {
  specialization: "",
  doctorId: "",
  date: today,
  time: "",
  symptoms: "",
};

const statusStyles = {
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  completed: "border-sky-200 bg-sky-50 text-sky-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
  reschedule_required: "border-amber-200 bg-amber-50 text-amber-800",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getAuthToken() {
  return JSON.parse(localStorage.getItem("healthcareSession") || "null")?.token;
}

async function api(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-all duration-300 focus:border-teal-500 focus:shadow-[0_0_0_3px] focus:shadow-teal-100 disabled:bg-zinc-50 disabled:text-zinc-500",
        props.className,
      )}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={cx(
        "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-all duration-300 focus:border-teal-500 focus:shadow-[0_0_0_3px] focus:shadow-teal-100",
        props.className,
      )}
    >
      {props.children}
    </select>
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={cx(
        "min-h-28 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none transition-all duration-300 focus:border-teal-500 focus:shadow-[0_0_0_3px] focus:shadow-teal-100",
        props.className,
      )}
    />
  );
}

function IconButton({ children, className, loading, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-zinc-800 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-300",
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-zinc-950">{value}</p>
        </div>
        <div className={cx("grid size-11 place-items-center rounded-lg", tone)}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={cx("inline-flex rounded-md border px-2 py-1 text-xs font-semibold", statusStyles[status] || statusStyles.confirmed)}>
      {String(status || "confirmed").replace("_", " ")}
    </span>
  );
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
      <div className="flex items-center gap-2.5">
        <div className="grid size-8 place-items-center rounded-lg bg-teal-50 text-teal-700">
          <Icon className="size-4" />
        </div>
        <h2 className="text-lg font-bold text-zinc-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// function LoginScreen({ onLogin }) {
//   const [credentials, setCredentials] = useState({ email: "", password: "" });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   async function submit(event) {
//     event.preventDefault();
//     setLoading(true);
//     setError("");
//     try {
//       const session = await api("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });
//       localStorage.setItem("healthcareSession", JSON.stringify(session));
//       onLogin(session);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <main className="grid min-h-screen place-items-center bg-zinc-50 px-4 text-zinc-950">
//       <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
//         <div className="mb-6 flex items-center gap-3">
//           <div className="grid size-11 place-items-center rounded-lg bg-teal-700 text-white">
//             <HeartPulse className="size-6" />
//           </div>
//           <div>
//             <h1 className="text-xl font-bold">Lumina Health</h1>
//             <p className="text-sm text-zinc-500">Secure portal login</p>
//           </div>
//         </div>
//         <div className="grid gap-4">
//           <Field label="Email">
//             <Input type="email" value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} required autoComplete="email" />
//           </Field>
//           <Field label="Password">
//             <Input type="password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required autoComplete="current-password" />
//           </Field>
//           {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
//           <IconButton type="submit" loading={loading} className="w-full bg-teal-700 hover:bg-teal-800">
//             <ShieldCheck className="size-4" />
//             Sign in
//           </IconButton>
//         </div>
//         <div className="mt-5 rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
//           Demo accounts: admin@clinic.test / admin123, aarav@example.com / patient123, meera.kapoor@clinic.test / doctor123.
//         </div>
//       </form>
//     </main>
//   );
// }

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // 'login' or 'register'
  const [credentials, setCredentials] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" 
        ? { email: credentials.email, password: credentials.password }
        : { name: credentials.name, email: credentials.email, password: credentials.password };

      const session = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("healthcareSession", JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-4 text-zinc-950">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-teal-700 text-white">
            <HeartPulse className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Lumina Health</h1>
            <p className="text-sm text-zinc-500">{mode === "login" ? "Secure portal login" : "Create your patient account"}</p>
          </div>
        </div>
        <div className="grid gap-4">
          {mode === "register" && (
            <Field label="Full Name">
              <Input value={credentials.name} onChange={(e) => setCredentials({ ...credentials, name: e.target.value })} required />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required autoComplete="current-password" />
          </Field>
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <IconButton type="submit" loading={loading} className="w-full bg-teal-700 hover:bg-teal-800">
            <ShieldCheck className="size-4" />
            {mode === "login" ? "Sign in" : "Create Account"}
          </IconButton>
        </div>

        <div className="mt-5 text-center text-sm text-zinc-600">
          {mode === "login" ? (
            <>Don't have an account? <button type="button" onClick={() => { setMode("register"); setError(""); }} className="font-bold text-teal-700 hover:underline">Register here</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => { setMode("login"); setError(""); }} className="font-bold text-teal-700 hover:underline">Sign in here</button></>
          )}
        </div>

        {mode === "login" && (
          <div className="mt-5 rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
            Demo accounts: admin@clinic.test / admin123, aarav@example.com / patient123, meera.kapoor@clinic.test / doctor123.
          </div>
        )}
      </form>
    </main>
  );
}

export default function HealthcareApp() {
  const [session, setSession] = useState(storedSession);
  const user = session?.user;
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [booking, setBooking] = useState(emptyBooking);
  const [visitDrafts, setVisitDrafts] = useState({});
  const [newDoctor, setNewDoctor] = useState({ name: "", specialization: "", email: "", password: "", start: "09:00", end: "16:00", slotDuration: 30 });
  const [leaveDate, setLeaveDate] = useState(today);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [initialLoad, setInitialLoad] = useState(Boolean(storedSession));

  const selectedDoctor = doctors.find((doc) => doc.id === booking.doctorId);
  const filteredDoctors = doctors.filter((doctor) => !booking.specialization || doctor.specialization.toLowerCase().includes(booking.specialization.toLowerCase()));
  const metrics = useMemo(() => {
    const confirmed = appointments.filter((apt) => apt.status === "confirmed").length;
    const highUrgency = appointments.filter((apt) => apt.preVisitSummary?.urgency === "High").length;
    const retryQueue = notifications.filter((n) => n.status === "queued").length;
    return { confirmed, highUrgency, retryQueue };
  }, [appointments, notifications]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const requests = [api("/api/doctors"), api("/api/appointments")];
      if (user.role === "admin") requests.push(api("/api/notifications"));
      const [doctorData, appointmentData, notificationData = []] = await Promise.all(requests);
      const normDoctors = doctorData.map((doctor) => ({ ...doctor, id: doctor._id || doctor.id }));
      const normAppointments = appointmentData.map((appointment) => ({ ...appointment, id: appointment._id || appointment.id }));
      setDoctors(normDoctors);
      setAppointments(normAppointments);
      setNotifications(notificationData);
      setApiOnline(true);
      setBooking((current) => ({ ...current, doctorId: current.doctorId || normDoctors[0]?.id || "" }));
    } catch (error) {
      setApiOnline(false);
      if (error.message === "Login required") logout();
    }
  }, [user]);

  const loadSlots = useCallback(async () => {
    if (!booking.doctorId || !booking.date || user?.role !== "patient") return;
    try {
      setSlots(await api(`/api/slots?doctorId=${encodeURIComponent(booking.doctorId)}&date=${encodeURIComponent(booking.date)}`));
    } catch (error) {
      setMessage(error.message);
    }
  }, [booking.doctorId, booking.date, user?.role]);

  useEffect(() => {
    if (!user) return;
    async function init() {
      await refresh();
      setInitialLoad(false);
    }
    init();
  }, [refresh, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSlots();
  }, [loadSlots]);

  function logout() {
    localStorage.removeItem("healthcareSession");
    setSession(null);
    setDoctors([]);
    setAppointments([]);
    setNotifications([]);
    setMessage("");
  }

  async function handleBookAppointment(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (!booking.time) throw new Error("Choose an available slot.");
      await api("/api/appointments", { method: "POST", body: JSON.stringify(booking) });
      setMessage("Appointment confirmed. AI summary generated and records saved.");
      setBooking((current) => ({ ...current, time: "", symptoms: "" }));
      await refresh();
      await loadSlots();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function holdSlot(time) {
    setBooking((current) => ({ ...current, time }));
    try {
      await api("/api/holds", { method: "POST", body: JSON.stringify({ doctorId: booking.doctorId, date: booking.date, time }) });
      await loadSlots();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function cancelAppointment(appointmentId) {
    setLoading(true);
    setMessage("");
    try {
      await api(`/api/appointments/${appointmentId}/cancel`, { method: "PATCH" });
      setMessage("Appointment cancelled.");
      await refresh();
      await loadSlots();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function completeVisit(appointmentId) {
    const draft = visitDrafts[appointmentId] || {};
    setLoading(true);
    setMessage("");
    try {
      await api(`/api/appointments/${appointmentId}/visit`, { method: "PATCH", body: JSON.stringify(draft) });
      setMessage("Post-visit summary and medication reminders queued.");
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createDoctor(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await api("/api/doctors", {
        method: "POST",
        body: JSON.stringify({
          name: newDoctor.name,
          specialization: newDoctor.specialization,
          email: newDoctor.email,
          password: newDoctor.password,
          workingHours: { start: newDoctor.start, end: newDoctor.end },
          slotDuration: Number(newDoctor.slotDuration),
        }),
      });
      setNewDoctor({ name: "", specialization: "", email: "", password: "", start: "09:00", end: "16:00", slotDuration: 30 });
      setMessage("Doctor login and profile created.");
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeDoctor(doctorId) {
    setLoading(true);
    setMessage("");
    try {
      await api(`/api/doctors/${doctorId}`, { method: "DELETE" });
      setMessage("Doctor removed.");
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function markLeave(doctorId) {
    setLoading(true);
    setMessage("");
    try {
      const result = await api(`/api/doctors/${doctorId}/leave`, { method: "PATCH", body: JSON.stringify({ date: leaveDate }) });
      setMessage(`${result.affectedAppointments.length} appointment(s) flagged. Patients notified.`);
      await refresh();
      await loadSlots();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!session) return <LoginScreen onLogin={setSession} />;
  if (initialLoad) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        <div className="text-center">
          <Loader2 className="mx-auto size-10 animate-spin text-teal-600" />
          <p className="mt-4 text-sm font-medium">Syncing secure workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-teal-700 text-white">
              <HeartPulse className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">Lumina Health</h1>
              <p className="text-xs font-medium capitalize text-zinc-500">{user.role} workspace - {user.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* <div className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold", apiOnline ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>
              <span className={cx("size-1.5 rounded-full", apiOnline ? "bg-emerald-500" : "bg-rose-500")} />
              {apiOnline ? "API Live" : "Offline"}
            </div> */}
            {/* //option 2 */}
            <div className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors", apiOnline ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>
              <span className={cx("size-2 rounded-full", apiOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
              {apiOnline ? "Online" : "Disconnected"}
            </div>

            {/* option 3 */}
            {/* <div className={cx(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
              apiOnline 
                ? "border-2 border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-200" 
                : "border-2 border-rose-400 bg-rose-50 text-rose-700 shadow-sm shadow-rose-200"
            )}>
              <span className={cx(
                "size-2.5 rounded-full",
                apiOnline 
                  ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]" 
                  : "bg-rose-500"
              )} />
              {apiOnline ? "Online" : "Disconnected"}
            </div> */}
            <IconButton type="button" onClick={logout} className="bg-rose-600 text-white hover:bg-rose-700 shadow-sm">
              <LogOut className="size-4" />
              Logout
            </IconButton>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={CalendarClock} label="Confirmed" value={metrics.confirmed} tone="bg-teal-50 text-teal-600" />
          <Metric icon={Activity} label="High Urgency" value={metrics.highUrgency} tone="bg-rose-50 text-rose-600" />
          <Metric icon={Bell} label="Queued Actions" value={metrics.retryQueue} tone="bg-amber-50 text-amber-600" />
        </div>

        {message && (
          <div className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-medium text-sky-800 shadow-sm">
            <AlertTriangle className="size-4 shrink-0" />
            {message}
          </div>
        )}

        {user.role === "patient" && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={handleBookAppointment} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={ClipboardPlus} title="Book Appointment" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Patient"><Input disabled value={`${user.name} (${user.email})`} /></Field>
                <Field label="Specialization"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><Input className="pl-9" value={booking.specialization} onChange={(e) => setBooking({ ...booking, specialization: e.target.value })} /></div></Field>
                <Field label="Doctor"><Select value={booking.doctorId} onChange={(e) => setBooking({ ...booking, doctorId: e.target.value, time: "" })}><option value="" disabled>Select a doctor</option>{filteredDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} - {doctor.specialization}</option>)}</Select></Field>
                <Field label="Date"><Input type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value, time: "" })} /></Field>
                <Field label="Selected slot"><Input readOnly value={booking.time || "Click a slot below"} className="font-semibold text-teal-700" /></Field>
              </div>
              <div className="mt-6">
                <p className="mb-3 text-sm font-bold text-zinc-700">Available Time Slots</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {slots.length ? slots.map((slot) => <button key={slot.time} type="button" disabled={!slot.available} onClick={() => holdSlot(slot.time)} className={cx("h-10 rounded-lg border text-sm font-semibold", booking.time === slot.time ? "border-teal-600 bg-teal-600 text-white" : slot.available ? "border-zinc-200 bg-white text-zinc-700 hover:border-teal-400 hover:bg-teal-50" : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300")}>{slot.time}</button>) : <div className="col-span-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">Select a doctor and date to view slots</div>}
                </div>
              </div>
              <div className="mt-6"><Field label="Describe symptoms"><TextArea required value={booking.symptoms} onChange={(e) => setBooking({ ...booking, symptoms: e.target.value })} /></Field></div>
              <div className="mt-6 flex justify-end"><IconButton type="submit" loading={loading} className="bg-teal-700 hover:bg-teal-800"><CalendarClock className="size-4" />Confirm Booking</IconButton></div>
            </form>

            <div className="grid gap-6">
              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                <SectionTitle icon={Stethoscope} title="Doctor Profile" />
                {selectedDoctor ? <div className="grid gap-3 text-sm text-zinc-600"><h3 className="text-lg font-bold text-zinc-900">{selectedDoctor.name}</h3><p className="font-medium text-teal-600">{selectedDoctor.specialization}</p><span className="flex items-center gap-2"><Clock3 className="size-4" /> {selectedDoctor.workingHours?.start} to {selectedDoctor.workingHours?.end}</span><span className="flex items-center gap-2"><FileText className="size-4" /> {selectedDoctor.email}</span></div> : <p className="text-sm text-zinc-500">Select a doctor to view profile.</p>}
              </div>
              <AppointmentList appointments={appointments} onCancel={cancelAppointment} />
            </div>
          </section>
        )}

        {user.role === "doctor" && (
          <DoctorWorklist appointments={appointments} visitDrafts={visitDrafts} setVisitDrafts={setVisitDrafts} completeVisit={completeVisit} loading={loading} />
        )}

        {user.role === "admin" && (
          <AdminWorkspace doctors={doctors} appointments={appointments} notifications={notifications} newDoctor={newDoctor} setNewDoctor={setNewDoctor} createDoctor={createDoctor} removeDoctor={removeDoctor} leaveDate={leaveDate} setLeaveDate={setLeaveDate} markLeave={markLeave} loading={loading} />
        )}
      </div>
    </main>
  );
}

function AppointmentList({ appointments, onCancel }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionTitle icon={FileText} title="My Visits" />
      <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
        {appointments.length ? appointments.map((apt) => (
          <article key={apt.id} className="rounded-lg border border-zinc-100 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-zinc-800">{apt.doctor?.name}</p><p className="mt-0.5 text-xs text-zinc-500">{apt.date} at {apt.time}</p></div><div className="flex items-center gap-2"><StatusBadge status={apt.status} />{apt.status === "confirmed" && onCancel && <button type="button" onClick={() => onCancel(apt.id)} className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50">Cancel</button>}</div></div>
            {apt.preVisitSummary && <p className="mt-3 text-sm text-zinc-600"><span className="font-semibold">Urgency:</span> {apt.preVisitSummary.urgency} - {apt.preVisitSummary.chiefComplaint}</p>}
            {apt.postVisitSummary?.summary && <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-600">{apt.postVisitSummary.summary}</p>}
          </article>
        )) : <p className="py-8 text-center text-sm text-zinc-400">No visits recorded yet.</p>}
      </div>
    </div>
  );
}

function DoctorWorklist({ appointments, visitDrafts, setVisitDrafts, completeVisit, loading }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionTitle icon={Stethoscope} title="Doctor Worklist" />
      <div className="grid gap-5">
        {appointments.length ? appointments.map((apt) => (
          <article key={apt.id} className="grid gap-6 rounded-lg border border-zinc-100 bg-white p-5 lg:grid-cols-2">
            <div><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-zinc-900">{apt.patientName}</h3><p className="text-sm text-zinc-500">{apt.date} at {apt.time} - {apt.patientEmail}</p></div><StatusBadge status={apt.status} /></div>{apt.preVisitSummary && <div className="mt-5 rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-700"><p><span className="font-semibold">Urgency:</span> {apt.preVisitSummary.urgency}</p><p><span className="font-semibold">Chief Complaint:</span> {apt.preVisitSummary.chiefComplaint}</p></div>}{apt.postVisitSummary?.summary && <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm text-sky-700">{apt.postVisitSummary.summary}</div>}</div>
            {apt.status === "confirmed" && <div className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4"><Field label="Clinical notes"><TextArea value={visitDrafts[apt.id]?.notes || ""} onChange={(e) => setVisitDrafts({ ...visitDrafts, [apt.id]: { ...visitDrafts[apt.id], notes: e.target.value } })} /></Field><Field label="Prescription and frequency"><Input value={visitDrafts[apt.id]?.prescription || ""} onChange={(e) => setVisitDrafts({ ...visitDrafts, [apt.id]: { ...visitDrafts[apt.id], prescription: e.target.value } })} /></Field><div className="flex justify-end"><IconButton type="button" loading={loading} onClick={() => completeVisit(apt.id)} className="bg-sky-700 hover:bg-sky-800"><CheckCircle2 className="size-4" />Complete Visit</IconButton></div></div>}
          </article>
        )) : <p className="py-12 text-center text-sm text-zinc-400">No appointments assigned to this doctor.</p>}
      </div>
    </section>
  );
}

function AdminWorkspace({ doctors, appointments, notifications, newDoctor, setNewDoctor, createDoctor, removeDoctor, leaveDate, setLeaveDate, markLeave, loading }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={createDoctor} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <SectionTitle icon={UserRoundCog} title="Doctor Management" />
        <div className="grid gap-4 md:grid-cols-2"><Field label="Name"><Input required value={newDoctor.name} onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })} /></Field><Field label="Specialization"><Input required value={newDoctor.specialization} onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })} /></Field><Field label="Email"><Input required type="email" value={newDoctor.email} onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })} /></Field><Field label="Temporary password"><Input required type="password" value={newDoctor.password} onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })} /></Field><Field label="Slot duration"><Input type="number" min="15" step="15" value={newDoctor.slotDuration} onChange={(e) => setNewDoctor({ ...newDoctor, slotDuration: e.target.value })} /></Field><Field label="Start"><Input type="time" value={newDoctor.start} onChange={(e) => setNewDoctor({ ...newDoctor, start: e.target.value })} /></Field><Field label="End"><Input type="time" value={newDoctor.end} onChange={(e) => setNewDoctor({ ...newDoctor, end: e.target.value })} /></Field></div>
        <div className="mt-6 flex justify-end"><IconButton type="submit" loading={loading} className="bg-teal-700 hover:bg-teal-800"><Plus className="size-4" />Add Doctor</IconButton></div>
      </form>
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <SectionTitle icon={AlertTriangle} title="Leave & Conflicts" />
        <Field label="Leave date"><Input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="max-w-xs" /></Field>
        <div className="mt-5 grid max-h-[340px] gap-3 overflow-y-auto pr-1">{doctors.map((doc) => <article key={doc.id} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 p-4"><div><p className="font-bold text-zinc-800">{doc.name}</p><p className="text-xs text-zinc-500">{doc.specialization} - Leaves: {doc.leaveDays.length ? doc.leaveDays.join(", ") : "None"}</p></div><div className="flex gap-2"><IconButton type="button" loading={loading} onClick={() => markLeave(doc.id)} className="bg-amber-500 hover:bg-amber-600"><XCircle className="size-4" />Leave</IconButton><IconButton type="button" loading={loading} onClick={() => removeDoctor(doc.id)} className="bg-rose-600 hover:bg-rose-700"><Trash2 className="size-4" /></IconButton></div></article>)}</div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2"><SectionTitle icon={FileText} title="All Appointments" /><div className="grid gap-3 md:grid-cols-2">{appointments.map((apt) => <article key={apt.id} className="rounded-lg border border-zinc-100 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-zinc-800">{apt.patientName}</p><p className="text-xs text-zinc-500">{apt.doctor?.name} - {apt.date} at {apt.time}</p></div><StatusBadge status={apt.status} /></div></article>)}</div></div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2"><SectionTitle icon={Bell} title="System Notification Queue" /><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{notifications.length ? notifications.slice(0, 9).map((note) => <article key={note.id} className="rounded-lg border border-zinc-100 p-4"><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{note.type.replace(/_/g, " ")}</p><p className="mt-2 text-sm text-zinc-600">{note.message}</p><p className="mt-3 truncate text-[10px] font-medium text-zinc-400">{note.recipient}</p></article>) : <p className="col-span-full py-8 text-center text-sm text-zinc-400">No notifications in queue.</p>}</div></div>
    </section>
  );
}
