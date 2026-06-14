import type { AvatarState } from "@/types/avatar";

const labels: Record<AvatarState, string> = {
  idle: "待机",
  listening: "聆听中",
  thinking: "思考中",
  speaking: "发言中",
};

export default function StatusBadge({ state }: { state: AvatarState }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 shadow-sm backdrop-blur">
      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
      <span>{labels[state]}</span>
    </div>
  );
}
