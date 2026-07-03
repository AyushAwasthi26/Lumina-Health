import { Loader2, Sparkles } from "lucide-react";

const statusStyles = {
  confirmed: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  reschedule_required: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-400">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-100 shadow-sm backdrop-blur-md outline-none transition-all placeholder:text-zinc-600 focus:border-amber-500/50 focus:bg-white/10 focus:ring-2 focus:ring-amber-500/20",
        props.className,
      )}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={cx(
        "h-11 rounded-xl border border-white/10 bg-zinc-900 px-4 text-sm text-zinc-100 shadow-sm backdrop-blur-md outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20",
        props.className,
      )}
    >
      {props.children}
    </select>
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={cx(
        "min-h-32 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-sm backdrop-blur-md outline-none transition-all placeholder:text-zinc-600 focus:border-amber-500/50 focus:bg-white/10 focus:ring-2 focus:ring-amber-500/20",
        props.className,
      )}
    />
  );
}

export function IconButton({ children, className, loading, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-6 text-sm font-bold text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={cx("inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold backdrop-blur-md", statusStyles[status] || statusStyles.confirmed)}>
      {status.replace("_", " ")}
    </span>
  );
}

export function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
           <Icon className="size-5" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// NEW: Premium Loading Overlay for AI Generation
export function AiLoadingOverlay({ text = "Generating AI Analysis..." }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl border border-amber-500/20 bg-zinc-950/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Sparkles className="size-8 text-amber-400 animate-pulse" />
          <div className="absolute -inset-2 rounded-full bg-amber-500/20 blur-xl animate-ping" />
        </div>
        <p className="text-sm font-bold text-amber-300">{text}</p>
        <p className="text-xs text-zinc-500">Contacting Gemini LLM...</p>
      </div>
    </div>
  );
}