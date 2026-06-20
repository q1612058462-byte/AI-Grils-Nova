import { NextResponse } from "next/server";
import {
  normalizeModelApiSettings,
  type ModelApiSettings,
} from "@/lib/model/modelApiSettings";
import { getNoraSystemPrompt } from "@/lib/prompts/noraSystemPrompt";

export const runtime = "nodejs";
export const maxDuration = 60;

type CompatibleMessage = {
  role: "user" | "assistant";
  content: string;
};

function isCompatibleMessage(value: unknown): value is CompatibleMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<CompatibleMessage>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: unknown;
      apiSettings?: Partial<ModelApiSettings>;
    };
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isCompatibleMessage).slice(-24)
      : [];
    const clientSettings = normalizeModelApiSettings(body.apiSettings ?? {});
    const apiKey =
      clientSettings.apiKey ||
      process.env.OPENAI_COMPATIBLE_API_KEY ||
      process.env.DEEPSEEK_API_KEY;
    const baseUrl =
      clientSettings.baseUrl ||
      process.env.OPENAI_COMPATIBLE_BASE_URL ||
      "https://api.deepseek.com";
    const model =
      clientSettings.model ||
      process.env.OPENAI_COMPATIBLE_MODEL ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-v4-flash";

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "API Key 未配置。请在页面设置或 .env.local 中填写。",
        },
        { status: 500 }
      );
    }

    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      return NextResponse.json({ error: "Base URL 格式无效。" }, { status: 400 });
    }
    const isLocalHttp =
      parsedBaseUrl.protocol === "http:" &&
      (parsedBaseUrl.hostname === "localhost" ||
        parsedBaseUrl.hostname === "127.0.0.1");
    if (parsedBaseUrl.protocol !== "https:" && !isLocalHttp) {
      return NextResponse.json(
        { error: "Base URL 必须使用 HTTPS，本地开发可使用 localhost。" },
        { status: 400 }
      );
    }

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "A final user message is required." }, { status: 400 });
    }

    const upstream = await fetch(getChatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: getNoraSystemPrompt() },
          ...messages,
        ],
        temperature: clientSettings.temperature,
        top_p: clientSettings.topP,
        max_tokens: clientSettings.maxTokens,
        stream: true,
      }),
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text();
      return NextResponse.json(
        {
          error: `Compatible API request failed with status ${upstream.status}.`,
          details,
        },
        { status: upstream.status }
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Model": model,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown compatible API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
