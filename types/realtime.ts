import type { AvatarExpression, AvatarState } from "@/types/avatar";

export type RealtimeEventHandlers = {
  onUserTranscript?: (text: string) => void;
  onAssistantTranscript?: (text: string) => void;
  onAssistantAudioStart?: () => void;
  onAssistantAudioEnd?: () => void;
  onStateChange?: (state: AvatarState) => void;
  onExpressionChange?: (expression: AvatarExpression) => void;
  onError?: (error: Error) => void;
};

export type RealtimeConnection = {
  connect: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  disconnect: () => void;
};

export type RealtimeSessionResponse = {
  client_secret?: {
    value?: string;
    expires_at?: number;
  };
  [key: string]: unknown;
};
