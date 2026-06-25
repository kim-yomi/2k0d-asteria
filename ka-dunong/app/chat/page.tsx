"use client";
import ProgressDashboard from "@/components/ProgressDashboard";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  BookOpen,
  BarChart2,
  ChevronDown,
  ArrowLeft,
  Upload,
  Layers,
} from "lucide-react";
import PracticeTab from "@/components/PracticeTab";
import Image from "next/image";

import {
  loadProgress,
  saveProgress,
  updateProgressFromAI,
  getQuizScore,
  type LanguageMode,
  type KaDunongProgress,
  type ProgressData,
} from "@/lib/progress";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface Source {
  document_id: string;
  filename: string;
  page_number: number | null;
  chunk_index: number;
  score: number;
  text: string;
}
interface MaterialUploadResponse {
  document_id?: string;
  filename?: string;
  chunk_count?: number;
  page_count?: number;
  ocr?: {
    enabled: boolean;
    used: boolean;
    unavailable: boolean;
  };
  error?: string;
}

const SUBJECTS = [
  "Science", "Mathematics", "Filipino", "English",
  "Araling Panlipunan", "ESP", "MAPEH", "TLE",
];

const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

const LANGUAGE_LABELS: Record<LanguageMode, string> = {
  taglish: "Taglish",
  filipino: "Filipino",
  english: "English",
};

const STUDENT_ID_KEY = "ka-dunong-student-id";

function generateSessionId() {
  return `session_${Date.now()}`;
}

function getOrCreateStudentId() {
  if (typeof window === "undefined") return "local-student";

  const stored = localStorage.getItem(STUDENT_ID_KEY);
  if (stored) return stored;

  const nextId = `student_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(STUDENT_ID_KEY, nextId);
  return nextId;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Sorry, may problema. Subukan ulit.";
}


export default function KaDunong() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("Science");
  const [grade, setGrade] = useState("Grade 8");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("taglish");
  const [view, setView] = useState<"chat" | "progress" | "practice">("chat");
  const [progress, setProgress] = useState<KaDunongProgress | null>(null);
  const [sessionId] = useState(generateSessionId);
  const [studentId] = useState(getOrCreateStudentId);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [showGradeMenu, setShowGradeMenu] = useState(false);
  const [moduleFileName, setModuleFileName] = useState<string | null>(null);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          question: userMessage.content,
          messages: newMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          grade,
          subject,
          languageMode,
          documentIds,
          weakTopics: progress?.weakAreas
            .filter((area) => area.subject === subject)
            .map((area) => area.topic)
            .slice(0, 8) || [],
        }),
      });

      const data = (await res.json()) as {
        message?: string;
        progress?: ProgressData;
        sources?: Source[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Sorry, may problema sa Claude API.");
      }

      const assistantMessage = data.message?.trim();

      if (!assistantMessage) {
        throw new Error(data.error || "Walang sagot ang Claude API.");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMessage, sources: data.sources || [] },
      ]);

      if (data.progress && progress) {
        const updated = updateProgressFromAI(
          progress,
          data.progress,
          sessionId,
          subject,
          grade
        );
        setProgress(updated);
        saveProgress(updated);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: getErrorMessage(error),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function handleMaterialUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "pdf" && extension !== "docx") {
      alert("PDF o DOCX lang muna ang puwedeng i-upload.");
      e.target.value = "";
      return;
    }

    setUploadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("student_id", studentId);
      formData.append("subject", subject);
      formData.append("grade_level", grade);

      const res = await fetch("/api/materials", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as MaterialUploadResponse;

      if (!res.ok || !data.document_id) {
        throw new Error(data.error || "Hindi ma-process ang learning material.");
      }

      setDocumentIds((prev) => [...prev, data.document_id as string]);
      setModuleFileName(data.filename || file.name);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Na-upload na ang "${data.filename || file.name}" at na-index ang ${data.chunk_count || 0} bahagi nito. Handa na akong tumulong base sa module na 'to. Ano ang hindi mo naiintindihan dito?`,
        },
      ]);
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setUploadingMaterial(false);
      e.target.value = "";
    }
  }

  const score = progress ? getQuizScore(progress, subject) : null;
  const weakAreas = progress?.weakAreas.filter((w) => w.subject === subject) || [];
  const recentSession = progress?.sessions[0];
  const competencies = progress
    ? Object.values(progress.competencies).filter((c) => c.subject === subject)
    : [];

  return (
    <div className="min-h-screen bg-[#1a1212] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 bg-[#1a1212] z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Back to home"
          >
            <ArrowLeft size={16} />
          </Link>
          <Image src="/bird-app.png" alt="Ka-Dunong" width={32} height={32} className="object-contain" />
          <div>
            <h1 className="font-bold text-white leading-none">
              Ka-Dunong<span className="text-[#e8b5b7]">.ai</span>
            </h1>
            <p className="text-xs text-white/40 leading-none mt-0.5">AI Study Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/planner"
            className="p-2 rounded-lg transition-colors text-white/40 hover:text-white hover:bg-white/5"
            title="Study Planner"
          >
            <CalendarDays size={18} />
          </Link>
          <button
            onClick={() => setView("chat")}
            className={`p-2 rounded-lg transition-colors ${view === "chat" ? "bg-[#c97e82]/20 text-[#e8b5b7]" : "text-white/40 hover:text-white"}`}
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={() => setView("practice")}
            className={`p-2 rounded-lg transition-colors ${view === "practice" ? "bg-[#c97e82]/20 text-[#e8b5b7]" : "text-white/40 hover:text-white"}`}
          >
            <Layers size={18} />
          </button>
          <button
            onClick={() => setView("progress")}
            className={`p-2 rounded-lg transition-colors ${view === "progress" ? "bg-[#c97e82]/20 text-[#e8b5b7]" : "text-white/40 hover:text-white"}`}
          >
            <BarChart2 size={18} />
          </button>
        </div>
      </header>

      {view === "chat" ? (
        <>
          {/* Context bar */}
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 flex-wrap bg-[#1a1212]">
            {/* Grade selector */}
            <div className="relative">
              <button
                onClick={() => { setShowGradeMenu(!showGradeMenu); setShowSubjectMenu(false); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
              >
                {grade} <ChevronDown size={14} />
              </button>
              {showGradeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-[#2a1a1a] border border-white/10 rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto w-32">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => { setGrade(g); setShowGradeMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${grade === g ? "text-[#e8b5b7]" : "text-white"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject selector */}
            <div className="relative">
              <button
                onClick={() => { setShowSubjectMenu(!showSubjectMenu); setShowGradeMenu(false); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
              >
                {subject} <ChevronDown size={14} />
              </button>
              {showSubjectMenu && (
                <div className="absolute top-full left-0 mt-1 bg-[#2a1a1a] border border-white/10 rounded-lg overflow-hidden z-20 w-48">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSubject(s); setShowSubjectMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${subject === s ? "text-[#e8b5b7]" : "text-white"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language mode */}
            <div className="flex items-center gap-1 ml-auto bg-white/5 rounded-lg p-1">
              {(["taglish", "filipino", "english"] as LanguageMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLanguageMode(mode)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${languageMode === mode ? "bg-[#c97e82] text-white" : "text-white/50 hover:text-white"}`}
                >
                  {LANGUAGE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center pt-16">
                <Image src="/bird-app.png" alt="Ka-Dunong" width={64} height={64} className="object-contain mb-4" />
                <h2 className="text-xl font-bold mb-2">Kumusta! Ako si Ka-Dunong.</h2>
                <p className="text-white/50 text-sm max-w-xs">
                  Anong gusto mong pag-aralan ngayon? I-type mo ang topic o lesson mo at magsisimula tayo.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <Image src="/bird-app.png" alt="Ka-Dunong" width={28} height={28} className="object-contain mr-2 mt-1 flex-shrink-0" />
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#c97e82] text-white rounded-tr-sm"
                      : "bg-white/[0.06] text-white rounded-tl-sm border border-white/10"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                      {msg.sources.slice(0, 3).map((source, sourceIndex) => (
                        <span
                          key={`${source.document_id}-${source.chunk_index}-${sourceIndex}`}
                          className="text-[11px] leading-tight px-2 py-1 rounded-md bg-[#c97e82]/15 text-[#e8b5b7]"
                          title={source.text}
                        >
                          {source.filename}
                          {source.page_number ? ` p.${source.page_number}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <Image src="/bird-app.png" alt="Ka-Dunong" width={28} height={28} className="object-contain mr-2 mt-1 flex-shrink-0" />
                <div className="bg-white/[0.06] border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#e8b5b7]/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#e8b5b7]/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#e8b5b7]/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-white/10 bg-[#1a1212]">
            {moduleFileName && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full bg-[#c97e82]" />
                <span className="text-xs text-white/40 truncate">{moduleFileName}</span>
                <button
                  onClick={() => { setDocumentIds([]); setModuleFileName(null); }}
                  className="text-xs text-white/20 hover:text-white ml-auto"
                >
                  Remove
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <label className={`cursor-pointer flex-shrink-0 ${uploadingMaterial ? "opacity-30" : "opacity-50 hover:opacity-100"} transition-opacity`}>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={handleMaterialUpload}
                  disabled={uploadingMaterial}
                />
                <Upload size={18} />
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={uploadingMaterial ? "Ina-index ang module..." : "Mag-type ng tanong o topic..."}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none max-h-32"
                style={{ minHeight: "24px" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-xl bg-[#c97e82] text-white disabled:opacity-30 transition-opacity flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-white/20 text-center mt-2">
              Enter para mag-send · Shift+Enter para mag-newline
            </p>
          </div>
        </>
         ) : view === "practice" ? (
        <div className="flex-1 overflow-hidden">
          <PracticeTab grade={grade} subject={subject} languageMode={languageMode} />
        </div>
      ) : (
        /* Progress View */
        progress ? (
          <ProgressDashboard progress={progress} subject={subject} grade={grade} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            Loading...
          </div>
        )
      )}
    </div>
  );
}
