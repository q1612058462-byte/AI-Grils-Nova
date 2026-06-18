"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AvatarStage from "@/components/AvatarStage";
import {
  deriveExpressionFromText,
  getSpeakableText,
  parseAvatarResponse,
} from "@/lib/avatar/expressionMapper";
import { startFakeLipSync } from "@/lib/avatar/lipSync";
import {
  AVATAR_PRESETS,
  type ScenePresetId,
} from "@/lib/avatar/appearanceLibrary";
import {
  DEFAULT_MODEL_API_SETTINGS,
  normalizeModelApiSettings,
  type ModelApiSettings,
} from "@/lib/model/modelApiSettings";
import {
  UiLanguageProvider,
  type UiLanguage,
} from "@/lib/i18n/uiLanguage";
import { splitDialogueSentences } from "@/lib/dialogue/splitDialogueSentences";
import {
  createBrowserSpeechRecognition,
  getBrowserVoices,
  speakWithBrowser,
  supportsBrowserSpeechRecognition,
  type BrowserSpeechRecognition,
  type BrowserVoiceOption,
  type BrowserVoiceSettings,
} from "@/lib/voice/browserSpeech";
import {
  prefetchCloudSpeech,
  speakWithCloud,
} from "@/lib/voice/cloudSpeech";
import type {
  AvatarConversation,
  AvatarExpression,
  AvatarState,
  TranscriptEntry,
} from "@/types/avatar";

const VOICE_OUTPUT_STORAGE_KEY = "avatar.voiceOutputEnabled.v1";
const VOICE_SETTINGS_STORAGE_KEY = "avatar.voiceSettings.v1";
const CONVERSATIONS_STORAGE_KEY = "avatar.conversations.v1";
const APPEARANCE_STORAGE_KEY = "avatar.appearance.v1";
const MODEL_API_SETTINGS_STORAGE_KEY = "avatar.modelApiSettings.v1";
const UI_LANGUAGE_STORAGE_KEY = "avatar.uiLanguage.v1";
const CONVERSATIONS_API_PATH = "/api/conversations";
const DEFAULT_VOICE_SETTINGS: BrowserVoiceSettings = {
  engine: "cloud",
  cloudProvider: "doubao",
  voiceURI: "",
  cloudBaseUrl: "",
  cloudApiKey: "",
  cloudModel: "seed-tts-2.0",
  cloudVoice: "zh_female_vv_uranus_bigtts",
  cloudInstructions:
    "Speak naturally in a warm, gentle, conversational tone. Use expressive but restrained intonation and clear pauses.",
  doubaoAppId: "",
  doubaoAccessToken: "",
  doubaoResourceId: "seed-tts-2.0",
  rate: 0.95,
  pitch: 1.05,
};

function createConversation(title = "New session"): AvatarConversation {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    messages: [],
    dialogueQueue: [],
    draft: "",
    createdAt: now,
    updatedAt: now,
  };
}

function isConversation(value: unknown): value is AvatarConversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AvatarConversation>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    Array.isArray(item.messages) &&
    Array.isArray(item.dialogueQueue) &&
    typeof item.draft === "string" &&
    typeof item.createdAt === "number" &&
    typeof item.updatedAt === "number"
  );
}

function normalizeStoredConversations(value: unknown) {
  if (!value || typeof value !== "object") {
    return { sessions: [] as AvatarConversation[], activeSessionId: null };
  }
  const parsed = value as {
    sessions?: unknown;
    activeSessionId?: unknown;
  };
  const sessions = Array.isArray(parsed.sessions)
    ? parsed.sessions.filter(isConversation)
    : [];
  const activeSessionId =
    typeof parsed.activeSessionId === "string" &&
    sessions.some((session) => session.id === parsed.activeSessionId)
      ? parsed.activeSessionId
      : sessions[0]?.id ?? null;
  return { sessions, activeSessionId };
}

function getConversationsTimestamp(sessions: AvatarConversation[]) {
  return sessions.reduce(
    (latest, session) => Math.max(latest, session.updatedAt, session.createdAt),
    0
  );
}

function getConversationTitle(prompt: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
}

export default function AvatarWorkbench() {
  const initialConversation = useMemo(() => createConversation(), []);
  const [state, setState] = useState<AvatarState>("idle");
  const [expression, setExpression] = useState<AvatarExpression>("smile");
  const [mouthOpen, setMouthOpen] = useState(0);
  const [sessions, setSessions] = useState<AvatarConversation[]>([initialConversation]);
  const [activeSessionId, setActiveSessionId] = useState(initialConversation.id);
  const [sessionsHydrated, setSessionsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [voiceInputActive, setVoiceInputActive] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [voices, setVoices] = useState<BrowserVoiceOption[]>([]);
  const [voiceSettings, setVoiceSettings] = useState(DEFAULT_VOICE_SETTINGS);
  const [scenePresetId, setScenePresetId] = useState<ScenePresetId>("sunset-street");
  const [avatarModelUrl, setAvatarModelUrl] = useState(AVATAR_PRESETS[0].modelUrl);
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);
  const [modelApiSettings, setModelApiSettings] = useState(DEFAULT_MODEL_API_SETTINGS);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("en");

  const lipSyncStopRef = useRef<(() => void) | null>(null);
  const modelAbortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechCancelRef = useRef<(() => void) | null>(null);
  const speechGenerationRef = useRef(0);
  const sentenceExpressionRef = useRef<AvatarExpression>("smile");
  const cloudTtsUnavailableRef = useRef(false);
  const saveConversationsTimerRef = useRef<number | null>(null);
  const uploadedAvatarUrlRef = useRef<string | null>(null);
  const uploadedBackgroundUrlRef = useRef<string | null>(null);

  const nextId = useMemo(() => {
    let counter = 0;
    return () => `${Date.now()}-${counter += 1}`;
  }, []);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? initialConversation,
    [activeSessionId, initialConversation, sessions]
  );

  const updateSession = useCallback((
    id: string,
    updater: (session: AvatarConversation) => AvatarConversation
  ) => {
    setSessions((current) =>
      current.map((session) => session.id === id ? updater(session) : session)
    );
  }, []);

  const stopLipSync = useCallback(() => {
    lipSyncStopRef.current?.();
    lipSyncStopRef.current = null;
    setMouthOpen(0);
  }, []);

  const stopVoiceInput = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      recognition.stop();
    }
    setVoiceInputActive(false);
    setState((current) => current === "listening" ? "idle" : current);
  }, []);

  const cancelSpeech = useCallback(() => {
    speechGenerationRef.current += 1;
    const cancelActiveSpeech = speechCancelRef.current;
    speechCancelRef.current = null;
    cancelActiveSpeech?.();
    stopLipSync();
    setState((current) => current === "speaking" ? "idle" : current);
  }, [stopLipSync]);

  useEffect(() => {
    let cancelled = false;

    const hydrateConversations = async () => {
      let localConversations = {
        sessions: [] as AvatarConversation[],
        activeSessionId: null as string | null,
      };
      const storedSessions = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (storedSessions) {
        try {
          localConversations = normalizeStoredConversations(JSON.parse(storedSessions));
        } catch {
          window.localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
        }
      }

      let serverConversations = {
        sessions: [] as AvatarConversation[],
        activeSessionId: null as string | null,
      };
      try {
        const response = await fetch(CONVERSATIONS_API_PATH, { cache: "no-store" });
        if (response.ok) {
          serverConversations = normalizeStoredConversations(await response.json());
        }
      } catch {
        // Local browser storage remains the fallback when the server store is unavailable.
      }

      if (cancelled) return;

      const restored =
        getConversationsTimestamp(serverConversations.sessions) >
        getConversationsTimestamp(localConversations.sessions)
          ? serverConversations
          : localConversations;

      if (restored.sessions.length > 0) {
        setSessions(restored.sessions);
        setActiveSessionId(restored.activeSessionId ?? restored.sessions[0].id);
      }
      setSessionsHydrated(true);
    };

    void hydrateConversations();

    const storedAppearance = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (storedAppearance) {
      try {
        const parsed = JSON.parse(storedAppearance) as {
          scenePresetId?: ScenePresetId;
          avatarModelUrl?: string;
        };
        if (
          parsed.scenePresetId === "cc0-lounge" ||
          parsed.scenePresetId === "cozy-study" ||
          parsed.scenePresetId === "night-loft" ||
          parsed.scenePresetId === "soft-studio" ||
          parsed.scenePresetId === "illustrated-bedroom" ||
          parsed.scenePresetId === "cherry-park" ||
          parsed.scenePresetId === "seaside" ||
          parsed.scenePresetId === "sunset-street"
        ) {
          setScenePresetId(parsed.scenePresetId);
        }
        if (
          typeof parsed.avatarModelUrl === "string" &&
          parsed.avatarModelUrl.trim() &&
          !parsed.avatarModelUrl.startsWith("blob:")
        ) {
          setAvatarModelUrl(parsed.avatarModelUrl);
        }
      } catch {
        window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
      }
    }

    const storedModelSettings = window.localStorage.getItem(MODEL_API_SETTINGS_STORAGE_KEY);
    if (storedModelSettings) {
      try {
        setModelApiSettings(
          normalizeModelApiSettings(JSON.parse(storedModelSettings) as Partial<ModelApiSettings>)
        );
      } catch {
        window.localStorage.removeItem(MODEL_API_SETTINGS_STORAGE_KEY);
      }
    }
    const storedLanguage = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    if (storedLanguage === "en" || storedLanguage === "zh") {
      setUiLanguage(storedLanguage);
    }

    setVoiceInputSupported(supportsBrowserSpeechRecognition());
    const storedVoiceOutput = window.localStorage.getItem(VOICE_OUTPUT_STORAGE_KEY);
    if (storedVoiceOutput === "false") setVoiceOutputEnabled(false);
    const storedVoiceSettings = window.localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
    if (storedVoiceSettings) {
      try {
        const parsed = JSON.parse(storedVoiceSettings) as Partial<BrowserVoiceSettings>;
        const cloudProvider =
          parsed.cloudProvider === "openai" || parsed.cloudProvider === "doubao"
            ? parsed.cloudProvider
            : parsed.cloudModel === "gpt-4o-mini-tts" || parsed.cloudVoice === "marin"
              ? "openai"
              : DEFAULT_VOICE_SETTINGS.cloudProvider;
        setVoiceSettings({
          engine:
            parsed.engine === "browser" || parsed.engine === "cloud"
              ? parsed.engine
              : DEFAULT_VOICE_SETTINGS.engine,
          cloudProvider,
          voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : "",
          cloudBaseUrl:
            typeof parsed.cloudBaseUrl === "string" ? parsed.cloudBaseUrl : "",
          cloudApiKey:
            typeof parsed.cloudApiKey === "string" ? parsed.cloudApiKey : "",
          cloudModel:
            typeof parsed.cloudModel === "string" && parsed.cloudModel.trim()
              ? parsed.cloudModel
              : cloudProvider === "doubao"
                ? "seed-tts-2.0"
                : "gpt-4o-mini-tts",
          cloudVoice:
            typeof parsed.cloudVoice === "string" && parsed.cloudVoice.trim()
              ? parsed.cloudVoice
              : cloudProvider === "doubao"
                ? "zh_female_vv_uranus_bigtts"
                : "marin",
          cloudInstructions:
            typeof parsed.cloudInstructions === "string"
              ? parsed.cloudInstructions
              : DEFAULT_VOICE_SETTINGS.cloudInstructions,
          doubaoAppId:
            typeof parsed.doubaoAppId === "string" ? parsed.doubaoAppId : "",
          doubaoAccessToken:
            typeof parsed.doubaoAccessToken === "string" ? parsed.doubaoAccessToken : "",
          doubaoResourceId:
            typeof parsed.doubaoResourceId === "string" && parsed.doubaoResourceId.trim()
              ? parsed.doubaoResourceId
              : DEFAULT_VOICE_SETTINGS.doubaoResourceId,
          rate: typeof parsed.rate === "number" ? parsed.rate : DEFAULT_VOICE_SETTINGS.rate,
          pitch: typeof parsed.pitch === "number" ? parsed.pitch : DEFAULT_VOICE_SETTINGS.pitch,
        });
      } catch {
        window.localStorage.removeItem(VOICE_SETTINGS_STORAGE_KEY);
      }
    }

    const refreshVoices = () => setVoices(getBrowserVoices());
    refreshVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", refreshVoices);

    return () => {
      cancelled = true;
      if (saveConversationsTimerRef.current) {
        window.clearTimeout(saveConversationsTimerRef.current);
      }
      window.speechSynthesis?.removeEventListener("voiceschanged", refreshVoices);
      lipSyncStopRef.current?.();
      modelAbortRef.current?.abort();
      recognitionRef.current?.abort();
      speechCancelRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!sessionsHydrated) return;
    const payload = {
      sessions,
      activeSessionId,
    };
    const serializedPayload = JSON.stringify(payload);
    try {
      window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, serializedPayload);
    } catch {
      // Long histories can exceed browser storage quotas. The local file store
      // remains the durable source in the desktop/dev app.
    }
    if (saveConversationsTimerRef.current) {
      window.clearTimeout(saveConversationsTimerRef.current);
    }
    saveConversationsTimerRef.current = window.setTimeout(() => {
      void fetch(CONVERSATIONS_API_PATH, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: serializedPayload,
      }).catch(() => {
        // The browser cache has already been updated; server persistence can retry later.
      });
    }, 250);
  }, [activeSessionId, sessions, sessionsHydrated]);

  const activeDialogue = useMemo(
    () => activeSession.messages.find((entry) => entry.id === activeSession.dialogueQueue[0]),
    [activeSession]
  );
  const recentNoraDialogues = useMemo(
    () => activeSession.messages.filter(
      (entry) =>
        entry.speaker === "nora" &&
        entry.id !== activeSession.dialogueQueue[0] &&
        entry.text.trim()
    ).slice(-5),
    [activeSession]
  );

  const dismissActiveDialogue = useCallback(() => {
    cancelSpeech();
    updateSession(activeSession.id, (session) => ({
      ...session,
      dialogueQueue: session.dialogueQueue.slice(1),
    }));
  }, [activeSession.id, cancelSpeech, updateSession]);

  const updateDraft = useCallback((draft: string) => {
    updateSession(activeSession.id, (session) => ({ ...session, draft }));
  }, [activeSession.id, updateSession]);

  const createSession = useCallback(() => {
    if (isModelLoading) return;
    stopVoiceInput();
    cancelSpeech();
    const session = createConversation(
      uiLanguage === "zh"
        ? `新会话 ${sessions.length + 1}`
        : `New session ${sessions.length + 1}`
    );
    setSessions((current) => [...current, session]);
    setActiveSessionId(session.id);
    setExpression("comfort");
    setError(null);
  }, [cancelSpeech, isModelLoading, sessions.length, stopVoiceInput, uiLanguage]);

  const selectSession = useCallback((id: string) => {
    if (isModelLoading || id === activeSessionId) return;
    stopVoiceInput();
    cancelSpeech();
    setActiveSessionId(id);
    setExpression("comfort");
    setError(null);
  }, [activeSessionId, cancelSpeech, isModelLoading, stopVoiceInput]);

  const renameSession = useCallback((id: string, title: string) => {
    updateSession(id, (session) => ({
      ...session,
      title: title.slice(0, 40),
      updatedAt: Date.now(),
    }));
  }, [updateSession]);

  const deleteSession = useCallback((id: string) => {
    if (isModelLoading || sessions.length === 1) return;
    cancelSpeech();
    setSessions((current) => {
      const remaining = current.filter((session) => session.id !== id);
      if (id === activeSessionId) setActiveSessionId(remaining[0].id);
      return remaining;
    });
  }, [activeSessionId, cancelSpeech, isModelLoading, sessions.length]);

  const toggleVoiceInput = useCallback(() => {
    if (voiceInputActive) {
      stopVoiceInput();
      return;
    }
    if (!voiceInputSupported || state !== "idle" || isModelLoading) return;

    const sessionId = activeSession.id;
    const baseInput = activeSession.draft.trim();
    const recognition = createBrowserSpeechRecognition({
      onTranscript: (transcript) => {
        const separator = baseInput && transcript ? " " : "";
        updateSession(sessionId, (session) => ({
          ...session,
          draft: `${baseInput}${separator}${transcript}`,
        }));
      },
      onError: (message) => setError(message),
      onEnd: () => {
        recognitionRef.current = null;
        setVoiceInputActive(false);
        setState((current) => current === "listening" ? "idle" : current);
      },
    });

    if (!recognition) {
      setVoiceInputSupported(false);
      setError("当前浏览器不支持语音识别，请使用最新版 Chrome 或 Edge。");
      return;
    }

    setError(null);
    recognitionRef.current = recognition;
    setVoiceInputActive(true);
    setState("listening");

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceInputActive(false);
      setState("idle");
      setError("无法启动语音识别，请检查麦克风权限。");
    }
  }, [
    activeSession,
    isModelLoading,
    state,
    stopVoiceInput,
    updateSession,
    voiceInputActive,
    voiceInputSupported,
  ]);

  const toggleVoiceOutput = useCallback(() => {
    setVoiceOutputEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(VOICE_OUTPUT_STORAGE_KEY, String(next));
      if (!next) cancelSpeech();
      return next;
    });
  }, [cancelSpeech]);

  const updateVoiceSettings = useCallback((settings: BrowserVoiceSettings) => {
    const normalized = {
      engine: settings.engine,
      cloudProvider: settings.cloudProvider,
      voiceURI: settings.voiceURI,
      cloudBaseUrl: settings.cloudBaseUrl.trim(),
      cloudApiKey: settings.cloudApiKey.trim(),
      cloudModel: settings.cloudModel.trim() || DEFAULT_VOICE_SETTINGS.cloudModel,
      cloudVoice: settings.cloudVoice.trim() || DEFAULT_VOICE_SETTINGS.cloudVoice,
      cloudInstructions: settings.cloudInstructions.trim(),
      doubaoAppId: settings.doubaoAppId.trim(),
      doubaoAccessToken: settings.doubaoAccessToken.trim(),
      doubaoResourceId:
        settings.doubaoResourceId.trim() || DEFAULT_VOICE_SETTINGS.doubaoResourceId,
      rate: Math.min(1.6, Math.max(0.5, settings.rate)),
      pitch: Math.min(1.6, Math.max(0.5, settings.pitch)),
    };
    cloudTtsUnavailableRef.current = false;
    setVoiceSettings(normalized);
    window.localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const speakSentence = useCallback(async (text: string) => {
    cancelSpeech();
    const speechGeneration = ++speechGenerationRef.current;
    const speakableText = getSpeakableText(text);
    if (!speakableText) {
      setState("idle");
      return;
    }

    const playbackHandlers = {
      onStart: () => {
        if (speechGenerationRef.current !== speechGeneration) return;
        setState("speaking");
        lipSyncStopRef.current?.();
        lipSyncStopRef.current = startFakeLipSync(setMouthOpen);
      },
      onEnd: () => {
        if (speechGenerationRef.current !== speechGeneration) return;
        speechCancelRef.current = null;
        stopLipSync();
        setState("idle");
      },
    };

    if (voiceSettings.engine === "cloud" && !cloudTtsUnavailableRef.current) {
      const cloudPlayback = speakWithCloud(speakableText, voiceSettings, playbackHandlers);
      speechCancelRef.current = cloudPlayback.cancel;

      try {
        await cloudPlayback.promise;
        if (speechGenerationRef.current === speechGeneration) {
          speechCancelRef.current = null;
        }
        return;
      } catch (cloudError) {
        if (
          cloudPlayback.wasCancelled() ||
          speechGenerationRef.current !== speechGeneration
        ) return;
        cloudTtsUnavailableRef.current = true;
        setError(
          cloudError instanceof Error
            ? `Cloud voice unavailable; using the system voice. ${cloudError.message}`
            : "Cloud voice unavailable; using the system voice."
        );
      }
    }

    const playback = speakWithBrowser(speakableText, voiceSettings, playbackHandlers);

    if (!playback) {
      setError("当前浏览器不支持语音朗读，文字回复仍可正常使用。");
      setState("idle");
      return;
    }

    speechCancelRef.current = playback.cancel;
    await playback.promise;
  }, [cancelSpeech, stopLipSync, voiceSettings]);

  const prefetchSentence = useCallback((text: string) => {
    if (cloudTtsUnavailableRef.current) return;
    const speakableText = getSpeakableText(text);
    if (speakableText) prefetchCloudSpeech(speakableText, voiceSettings);
  }, [voiceSettings]);

  const updateSentenceExpression = useCallback((
    text: string,
    sentenceIndex: number
  ) => {
    const expressionCycle: AvatarExpression[] = [
      "smile",
      "serious",
      "happy",
      "comfort",
      "surprised",
    ];
    let nextExpression = deriveExpressionFromText(
      text,
      expressionCycle[sentenceIndex % expressionCycle.length]
    );
    if (nextExpression === sentenceExpressionRef.current) {
      nextExpression =
        expressionCycle[(sentenceIndex + 1) % expressionCycle.length];
    }
    sentenceExpressionRef.current = nextExpression;
    setExpression(nextExpression);
  }, []);

  const handleModelSubmit = async () => {
    const targetSession = activeSession;
    const prompt = targetSession.draft.trim();
    if (!prompt || isModelLoading || (state !== "idle" && state !== "listening")) return;

    stopVoiceInput();
    cancelSpeech();

    const history = targetSession.messages
      .filter((entry) => entry.speaker === "user" || entry.speaker === "nora")
      .slice(-20)
      .map((entry) => ({
        role: entry.speaker === "user" ? "user" as const : "assistant" as const,
        content: entry.text,
      }));

    const userId = nextId();
    const assistantId = nextId();
    updateSession(targetSession.id, (session) => ({
      ...session,
      title: session.messages.length === 0 ? getConversationTitle(prompt) : session.title,
      messages: [
        ...session.messages,
        { id: userId, speaker: "user", text: prompt },
        { id: assistantId, speaker: "nora", text: "" },
      ],
      dialogueQueue: [assistantId],
      draft: "",
      updatedAt: Date.now(),
    }));
    setError(null);
    setIsModelLoading(true);
    setState("thinking");
    setExpression("serious");

    const controller = new AbortController();
    modelAbortRef.current = controller;
    let reply = "";
    let firstSentencePrefetched = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: prompt }],
          apiSettings: modelApiSettings,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null) as
          | { error?: string; details?: string }
          | null;
        throw new Error(payload?.details || payload?.error || `模型请求失败：${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const eventBlock of events) {
          for (const line of eventBlock.split(/\r?\n/)) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            const chunk = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string | null } }>;
            };
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;

            reply += delta;
            const parsedReply = parseAvatarResponse(reply, "comfort");
            updateSession(targetSession.id, (session) => ({
              ...session,
              messages: session.messages.map((entry) =>
                entry.id === assistantId
                  ? { ...entry, text: parsedReply.text }
                  : entry
              ),
              updatedAt: Date.now(),
            }));

            if (!firstSentencePrefetched) {
              const firstSentence = splitDialogueSentences(parsedReply.text)[0];
              if (
                firstSentence &&
                /[。！？!?."”’）】)]$/.test(firstSentence)
              ) {
                firstSentencePrefetched = true;
                prefetchSentence(firstSentence);
              }
            }
          }
        }
      }

      if (!reply.trim()) throw new Error("模型返回了空回复。");
      const finalReply = parseAvatarResponse(reply, "comfort");
      if (!finalReply.text) {
        updateSession(targetSession.id, (session) => ({
          ...session,
          messages: session.messages.map((entry) =>
            entry.id === assistantId ? { ...entry, text: "…" } : entry
          ),
          updatedAt: Date.now(),
        }));
      }
      setState("idle");
    } catch (requestError) {
      if (controller.signal.aborted) return;
      const message = requestError instanceof Error ? requestError.message : "模型请求失败";
      setError(message);
      updateSession(targetSession.id, (session) => ({
        ...session,
        messages: session.messages.filter((entry) => entry.id !== assistantId),
        dialogueQueue: session.dialogueQueue.filter((id) => id !== assistantId),
        updatedAt: Date.now(),
      }));
      setState("idle");
    } finally {
      if (!controller.signal.aborted) {
        setIsModelLoading(false);
        modelAbortRef.current = null;
      }
    }
  };

  const inputDisabled = isModelLoading || (state !== "idle" && state !== "listening");
  const updateScenePreset = useCallback((id: ScenePresetId) => {
    setScenePresetId(id);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({
      scenePresetId: id,
      avatarModelUrl: avatarModelUrl.startsWith("blob:") ? AVATAR_PRESETS[0].modelUrl : avatarModelUrl,
    }));
  }, [avatarModelUrl]);
  const updateAvatarModel = useCallback((url: string) => {
    const normalized = url.trim();
    if (!normalized) return;
    if (uploadedAvatarUrlRef.current && uploadedAvatarUrlRef.current !== normalized) {
      URL.revokeObjectURL(uploadedAvatarUrlRef.current);
      uploadedAvatarUrlRef.current = null;
    }
    if (normalized.startsWith("blob:")) {
      uploadedAvatarUrlRef.current = normalized;
    }
    setAvatarModelUrl(normalized);
    if (normalized.startsWith("blob:")) return;
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({
      scenePresetId,
      avatarModelUrl: normalized,
    }));
  }, [scenePresetId]);
  const updateUploadedBackground = useCallback((url: string | null) => {
    if (uploadedBackgroundUrlRef.current) {
      URL.revokeObjectURL(uploadedBackgroundUrlRef.current);
      uploadedBackgroundUrlRef.current = null;
    }
    if (url) {
      uploadedBackgroundUrlRef.current = url;
    }
    setCustomBackgroundUrl(url);
  }, []);
  const updateModelApiSettings = useCallback((settings: ModelApiSettings) => {
    const normalized = normalizeModelApiSettings(settings);
    setModelApiSettings(normalized);
    window.localStorage.setItem(
      MODEL_API_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalized)
    );
  }, []);
  const updateUiLanguage = useCallback((language: UiLanguage) => {
    setUiLanguage(language);
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  }, []);

  useEffect(() => {
    return () => {
      if (uploadedAvatarUrlRef.current) URL.revokeObjectURL(uploadedAvatarUrlRef.current);
      if (uploadedBackgroundUrlRef.current) URL.revokeObjectURL(uploadedBackgroundUrlRef.current);
    };
  }, []);

  return (
    <UiLanguageProvider language={uiLanguage} setLanguage={updateUiLanguage}>
      <main className="relative h-dvh w-full overflow-hidden bg-slate-950">
      <AvatarStage
        state={state}
        mouthOpen={mouthOpen}
        expression={expression}
        dialogue={activeDialogue}
        recentDialogues={recentNoraDialogues}
        onDismissDialogue={dismissActiveDialogue}
        modelInput={activeSession.draft}
        modelInputDisabled={inputDisabled}
        modelLoading={isModelLoading}
        voiceInputSupported={voiceInputSupported}
        voiceInputActive={voiceInputActive}
        voiceOutputEnabled={voiceOutputEnabled}
        voices={voices}
        voiceSettings={voiceSettings}
        onModelInputChange={updateDraft}
        onModelSubmit={() => {
          void handleModelSubmit();
        }}
        onToggleVoiceInput={toggleVoiceInput}
        onToggleVoiceOutput={toggleVoiceOutput}
        onVoiceSettingsChange={updateVoiceSettings}
        onSpeakSentence={speakSentence}
        onPrefetchSentence={prefetchSentence}
        onStopSpeech={cancelSpeech}
        onSentenceChange={updateSentenceExpression}
        sessions={sessions}
        activeSession={activeSession}
        sessionBusy={isModelLoading}
        onCreateSession={createSession}
        onSelectSession={selectSession}
        onRenameSession={renameSession}
        onDeleteSession={deleteSession}
        scenePresetId={scenePresetId}
        avatarModelUrl={avatarModelUrl}
        customBackgroundUrl={customBackgroundUrl}
        onScenePresetChange={updateScenePreset}
        onAvatarModelChange={updateAvatarModel}
        onBackgroundUpload={updateUploadedBackground}
        modelApiSettings={modelApiSettings}
        onModelApiSettingsChange={updateModelApiSettings}
      />

      {error ? (
        <button
          type="button"
          onClick={() => setError(null)}
          className="absolute bottom-4 left-1/2 z-[60] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-amber-300/25 bg-slate-950/90 px-4 py-3 text-left text-sm text-amber-100 shadow-2xl backdrop-blur"
        >
          {error}
        </button>
      ) : null}
      </main>
    </UiLanguageProvider>
  );
}
