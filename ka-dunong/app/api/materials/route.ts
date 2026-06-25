import { NextRequest, NextResponse } from "next/server";

const DEFAULT_RAG_API_BASE_URL = "http://127.0.0.1:8000";

function getRagApiBaseUrl() {
  return (process.env.RAG_API_BASE_URL || DEFAULT_RAG_API_BASE_URL).replace(/\/$/, "");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractBackendError(data: unknown) {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    return typeof detail === "string" ? detail : "Material upload failed.";
  }

  return "Material upload failed.";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a PDF or DOCX file." }, { status: 400 });
    }

    const studentId = getString(formData, "student_id") || getString(formData, "studentId");
    if (!studentId) {
      return NextResponse.json({ error: "Missing student_id." }, { status: 400 });
    }

    const proxyForm = new FormData();
    proxyForm.append("file", file, file.name);
    proxyForm.append("student_id", studentId);

    const subject = getString(formData, "subject");
    const gradeLevel = getString(formData, "grade_level") || getString(formData, "grade");

    if (subject) proxyForm.append("subject", subject);
    if (gradeLevel) proxyForm.append("grade_level", gradeLevel);

    const response = await fetch(`${getRagApiBaseUrl()}/v1/materials`, {
      method: "POST",
      body: proxyForm,
      cache: "no-store",
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
    console.error("RAG material proxy error:", error);
    return NextResponse.json(
      {
        error:
          "Could not connect to the Ka-Dunong RAG backend. Start FastAPI on http://127.0.0.1:8000 and try again.",
      },
      { status: 502 }
    );
  }
}
