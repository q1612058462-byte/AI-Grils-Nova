import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSpeakableText } from "@/lib/avatar/expressionMapper";

export const runtime = "nodejs";
export const maxDuration = 60;

type TtsSettings = {
  provider?: unknown;
  baseUrl?: unknown;
  apiKey?: unknown;
  model?: unknown;
  voice?: unknown;
  instructions?: unknown;
  appId?: unknown;
  accessToken?: unknown;
  resourceId?: unknown;
  speed?: unknown;
};

type DoubaoChunk = {
  code?: number;
  message?: string;
  data?: string;
};

const DOUBAO_SUCCESS_CODES = new Set([0, 20000000]);

function getString(value: unknown, fallback: string, maxLength = 4096) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function getSpeed(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1.6, Math.max(0.5, value))
    : 1;
}

function validateBaseUrl(baseUrl: string) {
  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    return "The TTS Base URL is invalid.";
  }

  const isLocalHttp =
    parsedBaseUrl.protocol === "http:" &&
    (parsedBaseUrl.hostname === "localhost" ||
      parsedBaseUrl.hostname === "127.0.0.1");
  return parsedBaseUrl.protocol === "https:" || isLocalHttp
    ? null
    : "The TTS Base URL must use HTTPS, except for localhost development.";
}

function getOpenAiSpeechUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/audio/speech")
    ? normalized
    : `${normalized}/audio/speech`;
}

async function createOpenAiSpeech(
  request: Request,
  text: string,
  settings: TtsSettings
) {
  const apiKey = getString(settings.apiKey, "");
  const baseUrl = getString(settings.baseUrl, "https://api.openai.com/v1", 2048);
  const model = getString(settings.model, "gpt-4o-mini-tts", 128);
  const voice = getString(settings.voice, "marin", 128);
  const instructions = getString(
    settings.instructions,
    "Speak naturally in a warm, gentle, conversational tone. Use expressive but restrained intonation and clear pauses.",
    4096
  );

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI-compatible TTS is not configured in this browser." },
      { status: 503 }
    );
  }

  const baseUrlError = validateBaseUrl(baseUrl);
  if (baseUrlError) {
    return NextResponse.json({ error: baseUrlError }, { status: 400 });
  }

  const speechPayload: Record<string, string | number> = {
    model,
    input: text,
    voice,
    response_format: "mp3",
    speed: getSpeed(settings.speed),
  };
  if (instructions && !/^tts-1(?:$|-)/i.test(model)) {
    speechPayload.instructions = instructions;
  }

  const upstream = await fetch(getOpenAiSpeechUrl(baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(speechPayload),
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return upstreamError(upstream, "OpenAI-compatible TTS");
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
      "Cache-Control": "no-store",
      "X-TTS-Provider": "openai",
      "X-TTS-Model": model,
      "X-TTS-Voice": voice,
    },
  });
}

async function createDoubaoSpeech(
  request: Request,
  text: string,
  settings: TtsSettings
) {
  const apiKey = getString(settings.apiKey, "");
  const appId = getString(settings.appId, "");
  const accessToken = getString(settings.accessToken, "");
  const baseUrl = getString(
    settings.baseUrl,
    "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
    2048
  );
  const resourceId = getString(settings.resourceId, "seed-tts-2.0", 128);
  const speaker = getString(settings.voice, "zh_female_vv_uranus_bigtts", 256);

  if (!apiKey && !(appId && accessToken)) {
    return NextResponse.json(
      {
        error:
          "Doubao TTS is not configured in this browser. Add a Doubao API Key, or use App ID with Access Token.",
      },
      { status: 503 }
    );
  }

  const baseUrlError = validateBaseUrl(baseUrl);
  if (baseUrlError) {
    return NextResponse.json({ error: baseUrlError }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Api-Resource-Id": resourceId,
    "X-Api-Request-Id": randomUUID(),
  };
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  } else {
    headers["X-Api-App-Id"] = appId;
    headers["X-Api-Access-Key"] = accessToken;
  }

  const speechRate = Math.round((getSpeed(settings.speed) - 1) * 100);
  const upstream = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user: {
        uid: "nora-web-avatar",
      },
      req_params: {
        text,
        speaker,
        audio_params: {
          format: "mp3",
          sample_rate: 24000,
          speech_rate: Math.min(100, Math.max(-50, speechRate)),
        },
      },
    }),
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return upstreamError(upstream, "Doubao TTS");
  }

  const contentType = upstream.headers.get("Content-Type") || "";
  if (contentType.startsWith("audio/")) {
    return new Response(upstream.body, {
      status: 200,
      headers: doubaoResponseHeaders(contentType, resourceId, speaker),
    });
  }

  const responseText = await upstream.text();
  const chunks = parseJsonObjects(responseText);
  const audioParts: Buffer[] = [];

  for (const chunk of chunks) {
    if (
      typeof chunk.code === "number" &&
      !DOUBAO_SUCCESS_CODES.has(chunk.code)
    ) {
      return NextResponse.json(
        {
          error: `Doubao TTS returned code ${chunk.code}.`,
          details: chunk.message || responseText.slice(0, 1000),
        },
        { status: 502 }
      );
    }
    if (chunk.data) audioParts.push(Buffer.from(chunk.data, "base64"));
  }

  if (audioParts.length === 0) {
    return NextResponse.json(
      {
        error: "Doubao TTS returned no audio data.",
        details: responseText.slice(0, 1000),
      },
      { status: 502 }
    );
  }

  return new Response(Buffer.concat(audioParts), {
    status: 200,
    headers: doubaoResponseHeaders("audio/mpeg", resourceId, speaker),
  });
}

function doubaoResponseHeaders(
  contentType: string,
  resourceId: string,
  speaker: string
) {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-TTS-Provider": "doubao",
    "X-TTS-Model": resourceId,
    "X-TTS-Voice": speaker,
  };
}

function parseJsonObjects(value: string): DoubaoChunk[] {
  const objects: DoubaoChunk[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }
    if (character === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (character !== "}") continue;

    depth -= 1;
    if (depth !== 0 || start < 0) continue;

    try {
      objects.push(JSON.parse(value.slice(start, index + 1)) as DoubaoChunk);
    } catch {
      // Skip malformed transport fragments and continue scanning.
    }
    start = -1;
  }

  return objects;
}

async function upstreamError(upstream: Response, provider: string) {
  const details = await upstream.text();
  return NextResponse.json(
    {
      error: `${provider} request failed with status ${upstream.status}.`,
      details,
    },
    { status: upstream.status }
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: unknown;
      settings?: TtsSettings;
    };
    const text = getSpeakableText(getString(body.text, "", 4096));
    if (!text) {
      return NextResponse.json({ error: "Speech text is required." }, { status: 400 });
    }

    const settings = body.settings ?? {};
    return settings.provider === "openai"
      ? createOpenAiSpeech(request, text, settings)
      : createDoubaoSpeech(request, text, settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown TTS error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
