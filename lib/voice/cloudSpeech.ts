import type {
  BrowserSpeechPlayback,
  BrowserVoiceSettings,
} from "@/lib/voice/browserSpeech";

export type CloudSpeechPlayback = BrowserSpeechPlayback & {
  wasCancelled: () => boolean;
};

export function speakWithCloud(
  text: string,
  settings: BrowserVoiceSettings,
  handlers: {
    onStart?: () => void;
    onEnd?: () => void;
  } = {}
): CloudSpeechPlayback {
  const controller = new AbortController();
  let audio: HTMLAudioElement | null = null;
  let objectUrl = "";
  let cancelled = false;
  let settled = false;
  let resolvePromise = () => {};
  let rejectPromise = (_error: Error) => {};

  const cleanup = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = "";
    audio = null;
  };

  const finish = () => {
    if (settled) return;
    settled = true;
    handlers.onEnd?.();
    cleanup();
    resolvePromise();
  };

  const fail = (error: Error) => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectPromise(error);
  };

  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  void (async () => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          settings: {
            baseUrl: settings.cloudBaseUrl,
            apiKey: settings.cloudApiKey,
            model: settings.cloudModel,
            voice: settings.cloudVoice,
            instructions: settings.cloudInstructions,
            speed: settings.rate,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as
          | { error?: string; details?: string }
          | null;
        throw new Error(payload?.details || payload?.error || `Cloud TTS failed (${response.status}).`);
      }

      const blob = await response.blob();
      if (cancelled) return;

      objectUrl = URL.createObjectURL(blob);
      audio = new Audio(objectUrl);
      audio.preload = "auto";
      audio.onplay = () => handlers.onStart?.();
      audio.onended = finish;
      audio.onerror = () => fail(new Error("The browser could not play the generated audio."));
      await audio.play();
    } catch (error) {
      if (cancelled || controller.signal.aborted) {
        finish();
        return;
      }
      fail(error instanceof Error ? error : new Error("Cloud TTS failed."));
    }
  })();

  return {
    promise,
    wasCancelled: () => cancelled,
    cancel: () => {
      if (settled) return;
      cancelled = true;
      controller.abort();
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      finish();
    },
  };
}
