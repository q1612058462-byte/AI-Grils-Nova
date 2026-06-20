import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PersistedConversations = {
  sessions: unknown[];
  activeSessionId?: unknown;
};

const dataDirectory = path.join(process.cwd(), ".avatar-data");
const dataFile = path.join(dataDirectory, "conversations.json");
const serverFilePersistenceEnabled =
  process.env.AVATAR_SERVER_CONVERSATION_STORE === "true" &&
  process.env.VERCEL !== "1";

function isPersistedConversations(value: unknown): value is PersistedConversations {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as PersistedConversations).sessions)
  );
}

export async function GET() {
  if (!serverFilePersistenceEnabled) {
    return NextResponse.json(
      { sessions: [], activeSessionId: null, serverPersistence: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const content = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(content) as unknown;
    if (!isPersistedConversations(parsed)) {
      return NextResponse.json({ sessions: [], activeSessionId: null });
    }
    return NextResponse.json(parsed, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ sessions: [], activeSessionId: null });
    }
    const message =
      error instanceof Error ? error.message : "Failed to read conversations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as unknown;
    if (!isPersistedConversations(body)) {
      return NextResponse.json(
        { error: "Conversation payload is invalid." },
        { status: 400 }
      );
    }

    if (!serverFilePersistenceEnabled) {
      return NextResponse.json({
        ok: true,
        serverPersistence: false,
      });
    }

    await mkdir(dataDirectory, { recursive: true });
    await writeFile(
      dataFile,
      JSON.stringify({
        sessions: body.sessions,
        activeSessionId:
          typeof body.activeSessionId === "string" ? body.activeSessionId : null,
        savedAt: Date.now(),
      }, null, 2),
      "utf8"
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save conversations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
