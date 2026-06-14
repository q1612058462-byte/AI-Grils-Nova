import type { AvatarState } from "@/types/avatar";

type MicButtonProps = {
  state: AvatarState;
  disabled?: boolean;
  onClick: () => void;
};

const labelMap: Record<AvatarState, string> = {
  idle: "按住说话",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Nora is speaking…",
};

export default function MicButton({ state, disabled, onClick }: MicButtonProps) {
  const isBusy = state === "thinking" || state === "speaking" || disabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className={[
        "group inline-flex w-full items-center justify-center gap-3 rounded-2xl border px-5 py-4 text-base font-medium transition",
        "border-emerald-400/30 bg-emerald-400/10 text-emerald-50 shadow-glow",
        "hover:-translate-y-0.5 hover:border-emerald-300/50 hover:bg-emerald-400/15",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
      ].join(" ")}
    >
      <span
        className={[
          "relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300/15 ring-1 ring-inset ring-emerald-200/20",
          state === "listening" ? "animate-pulse" : "",
        ].join(" ")}
      >
        <span className="h-4 w-4 rounded-full bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.9)]" />
        {state === "listening" ? (
          <span className="absolute h-8 w-8 rounded-full border border-emerald-300/40 animate-ping" />
        ) : null}
      </span>
      <span>{labelMap[state]}</span>
    </button>
  );
}
