import { NextRequest, NextResponse } from "next/server";

const DEFAULT_RAG_API_BASE_URL = "http://127.0.0.1:8000";

interface ClientMessage {
  role?: unknown;
  content?: unknown;
}

function getRagApiBaseUrl() {
  return (process.env.RAG_API_BASE_URL || DEFAULT_RAG_API_BASE_URL).replace(/\/$/, "");
}

function normalizeMessages(messages: unknown): { role: string; content: string }[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message: ClientMessage) => ({
      role: typeof message.role === "string" ? message.role : "user",
      content: typeof message.content === "string" ? message.content : "",
    }))
    .filter((message) => message.content.trim().length > 0);
}

function getLatestQuestion(messages: { role: string; content: string }[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return latestUserMessage?.content.trim() || "";
}

function extractBackendError(data: unknown) {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    return typeof detail === "string" ? detail : "RAG backend request failed.";
  }

  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    return typeof error === "string" ? error : "RAG backend request failed.";
  }

  return "RAG backend request failed.";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = normalizeMessages(body.messages);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Please send at least one message." },
        { status: 400 }
      );
    }

    const question =
      typeof body.question === "string" && body.question.trim()
        ? body.question.trim()
        : getLatestQuestion(messages);

    if (!question) {
      return NextResponse.json(
        { error: "Please send a student question." },
        { status: 400 }
      );
    }

    const studentId =
      typeof body.student_id === "string"
        ? body.student_id
        : typeof body.studentId === "string"
        ? body.studentId
        : "local-student";

    const response = await fetch(`${getRagApiBaseUrl()}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        student_id: studentId,
        question,
        messages,
        student_profile: {
          grade_level: body.grade || body.gradeLevel || "Grade 8",
          preferred_language: body.languageMode || "taglish",
          weak_topics: Array.isArray(body.weakTopics) ? body.weakTopics : [],
        },
        subject: body.subject || "General",
        document_ids: Array.isArray(body.documentIds) ? body.documentIds : undefined,
        top_k: typeof body.topK === "number" ? body.topK : undefined,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: extractBackendError(data) },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("RAG chat proxy error:", error);
    return NextResponse.json(
      {
        error:
          "Could not connect to the Ka-Dunong RAG backend. Start FastAPI on http://127.0.0.1:8000 and try again.",
      },
      { status: 502 }
    );
  }
}
