import { deriveExpressionFromText } from "@/lib/avatar/expressionMapper";
import type { RealtimeConnection, RealtimeEventHandlers } from "@/types/realtime";

const DEFAULT_USER_TRANSCRIPT = "我今天想试试和数字人对话。";
const DEFAULT_ASSISTANT_REPLY =
  "当然可以。我在这里，你可以直接和我说话，不用再面对一个冷冰冰的聊天框。";

export function createMockRealtimeConnection(
  handlers: RealtimeEventHandlers = {}
): RealtimeConnection {
  let listeningTimer: number | null = null;
  let responseTimer: number | null = null;
  let speakingTimer: number | null = null;
  let connected = false;

  const clearTimers = () => {
    if (listeningTimer !== null) window.clearTimeout(listeningTimer);
    if (responseTimer !== null) window.clearTimeout(responseTimer);
    if (speakingTimer !== null) window.clearTimeout(speakingTimer);
    listeningTimer = null;
    responseTimer = null;
    speakingTimer = null;
  };

  const simulateConversation = () => {
    handlers.onStateChange?.("listening");

    listeningTimer = window.setTimeout(() => {
      handlers.onUserTranscript?.(DEFAULT_USER_TRANSCRIPT);
      handlers.onExpressionChange?.(deriveExpressionFromText(DEFAULT_USER_TRANSCRIPT, "smile"));
      handlers.onStateChange?.("thinking");

      responseTimer = window.setTimeout(() => {
        handlers.onAssistantTranscript?.(DEFAULT_ASSISTANT_REPLY);
        handlers.onExpressionChange?.(deriveExpressionFromText(DEFAULT_ASSISTANT_REPLY, "comfort"));
        handlers.onStateChange?.("speaking");
        handlers.onAssistantAudioStart?.();

        speakingTimer = window.setTimeout(() => {
          handlers.onAssistantAudioEnd?.();
          handlers.onExpressionChange?.("neutral");
          handlers.onStateChange?.("idle");
        }, 4200);
      }, 950);
    }, 2000);
  };

  return {
    async connect() {
      connected = true;
      handlers.onStateChange?.("idle");
    },
    async startListening() {
      if (!connected) {
        await this.connect();
      }
      clearTimers();
      simulateConversation();
    },
    async stopListening() {
      clearTimers();
      handlers.onAssistantAudioEnd?.();
      handlers.onStateChange?.("idle");
    },
    disconnect() {
      clearTimers();
      connected = false;
      handlers.onAssistantAudioEnd?.();
    },
  };
}
