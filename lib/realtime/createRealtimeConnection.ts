import { createMockRealtimeConnection } from "@/lib/realtime/mockRealtimeConnection";
import type {
  RealtimeConnection,
  RealtimeEventHandlers,
  RealtimeSessionResponse,
} from "@/types/realtime";

type CreateRealtimeConnectionOptions = {
  handlers?: RealtimeEventHandlers;
  useMock?: boolean;
};

function createRealConnection(handlers: RealtimeEventHandlers): RealtimeConnection {
  let pc: RTCPeerConnection | null = null;
  let mediaStream: MediaStream | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let connected = false;
  let fallbackConnection: RealtimeConnection | null = null;
  let assistantTextBuffer = "";

  const ensureFallback = async () => {
    if (!fallbackConnection) {
      fallbackConnection = createMockRealtimeConnection(handlers);
      await fallbackConnection.connect();
    }
    return fallbackConnection;
  };

  const sendEvent = (event: Record<string, unknown>) => {
    if (dataChannel?.readyState === "open") {
      dataChannel.send(JSON.stringify(event));
    }
  };

  const teardown = () => {
    dataChannel?.close();
    dataChannel = null;
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    pc?.close();
    pc = null;
    connected = false;
    assistantTextBuffer = "";
  };

  const flushAssistantTranscript = () => {
    const text = assistantTextBuffer.trim();
    if (text) {
      handlers.onAssistantTranscript?.(text);
    }
    assistantTextBuffer = "";
  };

  const handleAssistantTextDelta = (delta: string) => {
    if (!delta) return;
    assistantTextBuffer += delta;
    handlers.onAssistantTranscript?.(assistantTextBuffer);
    handlers.onExpressionChange?.("neutral");
  };

  return {
    async connect() {
      if (connected) return;

      if (
        typeof window === "undefined" ||
        typeof RTCPeerConnection === "undefined" ||
        typeof navigator === "undefined"
      ) {
        const fallback = await ensureFallback();
        await fallback.connect();
        return;
      }

      try {
        const sessionResponse = await fetch("/api/realtime/session", {
          method: "POST",
        });

        if (!sessionResponse.ok) {
          throw new Error(`Realtime session failed with status ${sessionResponse.status}`);
        }

        const sessionData = (await sessionResponse.json()) as RealtimeSessionResponse;
        const clientSecret = sessionData.client_secret?.value;

        if (!clientSecret) {
          throw new Error("Realtime session response did not include client_secret.value.");
        }

        pc = new RTCPeerConnection();
        const remoteAudio = document.createElement("audio");
        remoteAudio.autoplay = true;
        pc.ontrack = (event) => {
          remoteAudio.srcObject = event.streams[0];
        };

        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStream = localStream;
        localStream.getTracks().forEach((track) => pc?.addTrack(track, localStream));

        dataChannel = pc.createDataChannel("oai-events");
        dataChannel.addEventListener("message", (event) => {
          try {
            const payload = JSON.parse(event.data as string) as {
              type?: string;
              transcript?: string;
              text?: string;
              delta?: string;
              item_id?: string;
              item?: { content?: Array<{ transcript?: string; text?: string }> };
              response?: {
                output?: Array<{
                  content?: Array<{
                    transcript?: string;
                    text?: string;
                    type?: string;
                  }>;
                }>;
              };
            };

            if (payload.type === "input_audio_buffer.speech_started") {
              handlers.onStateChange?.("listening");
              return;
            }

            if (
              payload.type === "input_audio_buffer.speech_stopped" ||
              payload.type === "input_audio_buffer.committed"
            ) {
              handlers.onStateChange?.("thinking");
              return;
            }

            if (payload.type === "conversation.item.input_audio_transcription.completed") {
              const transcript =
                payload.transcript || payload.item?.content?.[0]?.transcript || payload.text || "";
              if (transcript) handlers.onUserTranscript?.(transcript);
              handlers.onStateChange?.("thinking");
              return;
            }

            if (
              payload.type === "response.output_audio_transcript.delta" ||
              payload.type === "response.output_text.delta"
            ) {
              handleAssistantTextDelta(payload.delta || payload.text || "");
              return;
            }

            if (payload.type === "response.output_audio.delta") {
              handlers.onStateChange?.("speaking");
              handlers.onAssistantAudioStart?.();
              return;
            }

            if (
              payload.type === "response.output_audio_transcript.done" ||
              payload.type === "response.output_text.done"
            ) {
              flushAssistantTranscript();
              return;
            }

            if (payload.type === "response.output_audio.done") {
              handlers.onAssistantAudioEnd?.();
              return;
            }

            if (payload.type === "response.done") {
              const responseOutput = payload.response?.output?.[0];
              const part = responseOutput?.content?.[0];
              const finalText = part?.transcript || part?.text;
              if (finalText) {
                handlers.onAssistantTranscript?.(finalText);
                handlers.onExpressionChange?.(finalText.length > 28 ? "serious" : "neutral");
              } else {
                flushAssistantTranscript();
              }
              handlers.onAssistantAudioEnd?.();
              handlers.onStateChange?.("idle");
            }
          } catch {
            // Ignore non-JSON or unsupported events. The realtime event surface can evolve.
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        });

        if (!sdpResponse.ok) {
          throw new Error(`Realtime call failed with status ${sdpResponse.status}`);
        }

        const answer = {
          type: "answer" as const,
          sdp: await sdpResponse.text(),
        };

        await pc.setRemoteDescription(answer);
        connected = true;
        handlers.onStateChange?.("idle");
      } catch (error) {
        const fallbackError = error instanceof Error ? error : new Error("Realtime connection failed.");
        handlers.onError?.(fallbackError);
        teardown();
        const fallback = await ensureFallback();
        await fallback.connect();
      }
    },
    async startListening() {
      if (!connected) {
        await this.connect();
      }

      if (fallbackConnection) {
        await fallbackConnection.startListening();
        return;
      }

      handlers.onStateChange?.("listening");
      sendEvent({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: "Nora should respond warmly and briefly. Use concise spoken language.",
          turn_detection: {
            type: "server_vad",
          },
        },
      });

      sendEvent({
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
        },
      });
    },
    async stopListening() {
      if (fallbackConnection) {
        await fallbackConnection.stopListening();
        return;
      }

      sendEvent({
        type: "input_audio_buffer.commit",
      });
    },
    disconnect() {
      if (fallbackConnection) {
        fallbackConnection.disconnect();
      }
      teardown();
    },
  };
}

export function createRealtimeConnection(
  options: CreateRealtimeConnectionOptions = {}
): RealtimeConnection {
  const handlers = options.handlers ?? {};

  if (options.useMock) {
    return createMockRealtimeConnection(handlers);
  }

  return createRealConnection(handlers);
}
