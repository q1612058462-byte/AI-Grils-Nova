import type {
  BrowserSpeechPlayback,
  BrowserVoiceSettings,
} from "@/lib/voice/browserSpeech";

export type CloudSpeechPlayback = BrowserSpeechPlayback & {
  wasCancelled: () => boolean;
};

const audioCache = new Map<string, Promise<Blob>>();
const MAX_CACHED_AUDIO = 8;

function getAudioCacheKey(text: string, settings: BrowserVoiceSettings) {
  return JSON.stringify([
    text,
    settings.cloudProvider,
    settings.cloudBaseUrl,
    settings.cloudModel,
    settings.cloudVoice,
    settings.cloudInstructions,
    settings.doubaoResourceId,
    settings.rate,
  ]);
}

function requestCloudAudio(text: string, settings: BrowserVoiceSettings) {
  const cacheKey = getAudioCacheKey(text, settings);
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  const request = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      settings: {
        provider: settings.cloudProvider,
        baseUrl: settings.cloudBaseUrl,
        apiKey: settings.cloudApiKey,
        model: settings.cloudModel,
        voice: settings.cloudVoice,
        instructions: settings.cloudInstructions,
        appId: settings.doubaoAppId,
        accessToken: settings.doubaoAccessToken,
        resourceId: settings.doubaoResourceId,
        speed: settings.rate,
      },
    }),
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as
        | { error?: string; details?: string }
        | null;
      throw new Error(
        payload?.details ||
          payload?.error ||
          `Cloud TTS failed (${response.status}).`
      );
    }
    return response.blob();
  }).catch((error) => {
    audioCache.delete(cacheKey);
    throw error;
  });

  audioCache.set(cacheKey, request);
  while (audioCache.size > MAX_CACHED_AUDIO) {
    const oldestKey = audioCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    audioCache.delete(oldestKey);
  }
  return request;
}

export function prefetchCloudSpeech(
  text: string,
  settings: BrowserVoiceSettings
) {
  if (settings.engine !== "cloud" || !text.trim()) return;
  void requestCloudAudio(text, settings).catch(() => {
    // Playback reports provider errors; speculative prefetch stays silent.
  });
}

export function speakWithCloud(
  text: string,
  settings: BrowserVoiceSettings,
  handlers: {
    onStart?: () => void;
    onEnd?: () => void;
  } = {}
): CloudSpeechPlayback {
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
      const blob = await requestCloudAudio(text, settings);
      if (cancelled) return;

      objectUrl = URL.createObjectURL(blob);
      audio = new Audio(objectUrl);
      audio.preload = "auto";
      audio.onplay = () => handlers.onStart?.();
      audio.onended = finish;
      audio.onerror = () => fail(new Error("The browser could not play the generated audio."));
      await audio.play();
    } catch (error) {
      if (cancelled) {
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
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
        audio.load();
      }
      finish();
    },
  };
}
