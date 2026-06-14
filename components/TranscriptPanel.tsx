import type { TranscriptEntry } from "@/types/avatar";
import { uiText, useUiLanguage } from "@/lib/i18n/uiLanguage";

function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.speaker === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6",
          isUser
            ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-50"
            : "border-white/10 bg-white/5 text-slate-100",
        ].join(" ")}
      >
        <div className="mb-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">
          {entry.speaker === "user" ? "User" : entry.speaker === "nora" ? "Nora" : "System"}
        </div>
        <p className="whitespace-pre-wrap">{entry.text}</p>
      </div>
    </div>
  );
}

export default function TranscriptPanel({
  messages,
  embedded = false,
}: {
  messages: TranscriptEntry[];
  embedded?: boolean;
}) {
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);

  if (embedded) {
    return (
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
            {t("No messages in this session yet.", "这个会话还没有对话记录。")}
          </div>
        ) : (
          messages.map((entry) => <TranscriptBubble key={entry.id} entry={entry} />)
        )}
      </div>
    );
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-glow backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">{t("Conversation history", "对话记录")}</h2>
          <p className="text-xs text-slate-400">{t("User and Nora context.", "简洁展示用户与 Nora 的上下文。")}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
            {t("Start a conversation with Nora.", "开始与 Nora 对话。")}
          </div>
        ) : (
          messages.map((entry) => <TranscriptBubble key={entry.id} entry={entry} />)
        )}
      </div>
    </aside>
  );
}
