import { NextResponse } from "next/server";
import { getNoraSystemPrompt } from "@/lib/prompts/noraSystemPrompt";

const DEFAULT_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
const SAFETY_IDENTIFIER = process.env.OPENAI_SAFETY_IDENTIFIER;

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is missing. Realtime session creation is unavailable.",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(SAFETY_IDENTIFIER ? { "OpenAI-Safety-Identifier": SAFETY_IDENTIFIER } : {}),
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: DEFAULT_REALTIME_MODEL,
          audio: {
            output: {
              voice: "marin",
            },
          },
          instructions: getNoraSystemPrompt(),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Failed to create realtime session.",
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Realtime session request failed.",
        details: message,
      },
      { status: 500 }
    );
  }
}
