import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TtsSettings = {
  baseUrl?: unknown;
  apiKey?: unknown;
  model?: unknown;
  voice?: unknown;
  instructions?: unknown;
  speed?: unknown;
};

function getSpeechUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/audio/speech")
    ? normalized
    : `${normalized}/audio/speech`;
}

function getString(value: unknown, fallback: string, maxLength = 4096) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function getSpeed(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(4, Math.max(0.25, value))
    : 1;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: unknown;
      settings?: TtsSettings;
    };
    const text = getString(body.text, "", 4096);
    if (!text) {
      return NextResponse.json({ error: "Speech text is required." }, { status: 400 });
    }

    const settings = body.settings ?? {};
    const apiKey =
      getString(settings.apiKey, "") ||
      process.env.TTS_API_KEY ||
      process.env.OPENAI_API_KEY;
    const baseUrl = getString(
      settings.baseUrl,
      process.env.TTS_BASE_URL || "https://api.openai.com/v1",
      2048
    );
    const model = getString(
      settings.model,
      process.env.TTS_MODEL || "gpt-4o-mini-tts",
      128
    );
    const voice = getString(
      settings.voice,
      process.env.TTS_VOICE || "marin",
      128
    );
    const instructions = getString(
      settings.instructions,
      process.env.TTS_INSTRUCTIONS ||
        "Speak naturally in a warm, gentle, conversational tone. Use expressive but restrained intonation and clear pauses.",
      4096
    );

    if (!apiKey) {
      return NextResponse.json(
        { error: "Cloud TTS is not configured. Add TTS_API_KEY or select browser speech." },
        { status: 503 }
      );
    }

    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      return NextResponse.json({ error: "The TTS Base URL is invalid." }, { status: 400 });
    }

    const isLocalHttp =
      parsedBaseUrl.protocol === "http:" &&
      (parsedBaseUrl.hostname === "localhost" ||
        parsedBaseUrl.hostname === "127.0.0.1");
    if (parsedBaseUrl.protocol !== "https:" && !isLocalHttp) {
      return NextResponse.json(
        { error: "The TTS Base URL must use HTTPS, except for localhost development." },
        { status: 400 }
      );
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

    const upstream = await fetch(getSpeechUrl(baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(speechPayload),
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text();
      return NextResponse.json(
        {
          error: `Cloud TTS request failed with status ${upstream.status}.`,
          details,
        },
        { status: upstream.status }
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Model": model,
        "X-TTS-Voice": voice,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown TTS error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
