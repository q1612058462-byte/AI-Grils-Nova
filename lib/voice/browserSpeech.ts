type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

export type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export type SpeechRecognitionHandlers = {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
};

function getRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function supportsBrowserSpeechRecognition() {
  return Boolean(getRecognitionConstructor());
}

export function createBrowserSpeechRecognition(
  handlers: SpeechRecognitionHandlers
): BrowserSpeechRecognition | null {
  const Recognition = getRecognitionConstructor();
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = "";
    let isFinal = true;

    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      transcript += result[0]?.transcript ?? "";
      isFinal = isFinal && result.isFinal;
    }

    handlers.onTranscript(transcript.trim(), isFinal);
  };
  recognition.onerror = (event) => {
    const messages: Record<string, string> = {
      "audio-capture": "没有检测到可用的麦克风。",
      "not-allowed": "麦克风权限被拒绝，请在浏览器中允许访问。",
      "no-speech": "没有听到清晰的语音，请再试一次。",
      network: "浏览器语音识别服务暂时不可用。",
    };
    handlers.onError(messages[event.error] ?? `语音识别失败：${event.error}`);
  };
  recognition.onend = handlers.onEnd;

  return recognition;
}

export type BrowserSpeechPlayback = {
  promise: Promise<void>;
  cancel: () => void;
};

export type BrowserVoiceOption = {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
};

export type BrowserVoiceSettings = {
  voiceURI: string;
  rate: number;
  pitch: number;
};

export function getBrowserVoices(): BrowserVoiceOption[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];

  return window.speechSynthesis
    .getVoices()
    .map((voice) => ({
      voiceURI: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
    }))
    .sort((left, right) => {
      const leftChinese = left.lang.toLowerCase().startsWith("zh") ? 0 : 1;
      const rightChinese = right.lang.toLowerCase().startsWith("zh") ? 0 : 1;
      return leftChinese - rightChinese || left.name.localeCompare(right.name);
    });
}

export function speakWithBrowser(
  text: string,
  settings: BrowserVoiceSettings,
  handlers: {
    onStart?: () => void;
    onEnd?: () => void;
  } = {}
): BrowserSpeechPlayback | null {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window)
  ) {
    return null;
  }

  const synthesis = window.speechSynthesis;
  synthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;

  const voices = synthesis.getVoices();
  const selectedVoice = voices.find((voice) => voice.voiceURI === settings.voiceURI);
  const chineseVoice = selectedVoice
    ?? voices.find((voice) => voice.lang.toLowerCase() === "zh-cn")
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("zh"));
  if (chineseVoice) {
    utterance.voice = chineseVoice;
    utterance.lang = chineseVoice.lang;
  }

  let settled = false;
  let resolvePromise = () => {};
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  const finish = () => {
    if (settled) return;
    settled = true;
    handlers.onEnd?.();
    resolvePromise();
  };

  utterance.onstart = () => handlers.onStart?.();
  utterance.onend = finish;
  utterance.onerror = finish;
  synthesis.speak(utterance);

  return {
    promise,
    cancel: () => {
      synthesis.cancel();
      finish();
    },
  };
}
