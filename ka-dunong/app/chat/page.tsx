"use client";
import { extractTextFromPDF } from "@/lib/pdf";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, BookOpen, BarChart2, ChevronDown, ArrowLeft } from "lucide-react";
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

function generateSessionId() {
  return `session_${Date.now()}`;
}

function KaDunongBookIcon({ size = 18, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 79.511719 69.09375" fill="none">
      <path
        fillRule="evenodd"
        d="M 39.757812 69.09375 C 39.191406 69.09375 38.65625 68.835938 38.300781 68.394531 C 34.097656 63.136719 27.101562 58.269531 4.570312 58.269531 C 1.964844 58.269531 0 56.164062 0 53.371094 L 0 4.980469 C 0 2.457031 2.046875 0.410156 4.558594 0.410156 C 23.90625 0.496094 35.050781 4.519531 39.757812 13.320312 C 44.460938 4.519531 55.601562 0.496094 74.933594 0.410156 C 77.464844 0.410156 79.511719 2.457031 79.511719 4.96875 L 79.511719 53.699219 C 79.511719 56.21875 77.460938 58.269531 74.941406 58.269531 C 52.414062 58.269531 45.417969 63.132812 41.210938 68.394531 C 40.859375 68.835938 40.324219 69.09375 39.757812 69.09375 Z M 4.5625 4.136719 C 4.101562 4.136719 3.726562 4.511719 3.726562 4.96875 L 3.726562 53.371094 C 3.726562 53.644531 3.789062 54.542969 4.570312 54.542969 C 22.671875 54.542969 33.117188 57.425781 39.757812 64.398438 C 46.398438 57.425781 56.84375 54.542969 74.941406 54.542969 C 75.40625 54.542969 75.785156 54.164062 75.785156 53.699219 L 75.785156 4.980469 C 75.785156 4.507812 75.410156 4.136719 74.953125 4.136719 C 54.4375 4.226562 44.136719 8.804688 41.5625 18.96875 C 41.351562 19.796875 40.609375 20.375 39.757812 20.375 C 38.902344 20.375 38.160156 19.796875 37.949219 18.96875 C 35.375 8.804688 25.078125 4.226562 4.5625 4.136719 Z"
        fill={color}
      />
      <path
        fillRule="evenodd"
        d="M 39.757812 69.09375 C 38.726562 69.09375 37.894531 68.261719 37.894531 67.230469 L 37.894531 30.425781 C 37.894531 29.394531 38.726562 28.5625 39.757812 28.5625 C 40.785156 28.5625 41.621094 29.394531 41.621094 30.425781 L 41.621094 67.230469 C 41.621094 68.261719 40.785156 69.09375 39.757812 69.09375 Z"
        fill={color}
      />
    </svg>
  );
}

export default function KaDunong() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("Science");
  const [grade, setGrade] = useState("Grade 8");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("taglish");
  const [view, setView] = useState<"chat" | "progress">("chat");
  const [progress, setProgress] = useState<KaDunongProgress | null>(null);
  const [sessionId] = useState(generateSessionId);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [showGradeMenu, setShowGradeMenu] = useState(false);
  const [moduleContext, setModuleContext] = useState<string | null>(null);
  const [moduleFileName, setModuleFileName] = useState<string | null>(null);
  const [uploadingPDF, setUploadingPDF] = useState(false);
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
          messages: newMessages,
          grade,
          subject,
          languageMode,
          moduleContext,
        }),
      });

      const data = await res.json();

      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);

        if (data.progress && progress) {
          const updated = updateProgressFromAI(
            progress,
            data.progress as ProgressData,
            sessionId,
            subject,
            grade
          );
          setProgress(updated);
          saveProgress(updated);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, may problema. Subukan ulit.",
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

  async function handlePDFUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPDF(true);
    try {
      const text = await extractTextFromPDF(file);
      setModuleContext(text);
      setModuleFileName(file.name);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Na-upload na ang "${file.name}". Handa na akong tumulong sa iyo base sa module na 'to. Ano ang hindi mo naiintindihan dito?`,
        },
      ]);
    } catch {
      alert("Hindi ma-read ang PDF. Subukan ulit.");
    } finally {
      setUploadingPDF(false);
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
    <div className="min-h-screen bg-[#0a1e23] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 bg-[#0a1e23] z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Back to home"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-[#3d9185] flex items-center justify-center">
            <KaDunongBookIcon size={18} color="white" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">
              Ka-Dunong<span className="text-[#80bbb2]">.ai</span>
            </h1>
            <p className="text-xs text-white/40 leading-none mt-0.5">AI Study Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("chat")}
            className={`p-2 rounded-lg transition-colors ${view === "chat" ? "bg-[#3d9185]/20 text-[#80bbb2]" : "text-white/40 hover:text-white"}`}
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={() => setView("progress")}
            className={`p-2 rounded-lg transition-colors ${view === "progress" ? "bg-[#3d9185]/20 text-[#80bbb2]" : "text-white/40 hover:text-white"}`}
          >
            <BarChart2 size={18} />
          </button>
        </div>
      </header>

      {view === "chat" ? (
        <>
          {/* Context bar */}
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 flex-wrap bg-[#0a1e23]">
            {/* Grade selector */}
            <div className="relative">
              <button
                onClick={() => { setShowGradeMenu(!showGradeMenu); setShowSubjectMenu(false); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
              >
                {grade} <ChevronDown size={14} />
              </button>
              {showGradeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-[#0d2d35] border border-white/10 rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto w-32">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => { setGrade(g); setShowGradeMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${grade === g ? "text-[#80bbb2]" : "text-white"}`}
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
                <div className="absolute top-full left-0 mt-1 bg-[#0d2d35] border border-white/10 rounded-lg overflow-hidden z-20 w-48">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSubject(s); setShowSubjectMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${subject === s ? "text-[#80bbb2]" : "text-white"}`}
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
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${languageMode === mode ? "bg-[#3d9185] text-white" : "text-white/50 hover:text-white"}`}
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
                <div className="w-16 h-16 rounded-2xl bg-[#3d9185] flex items-center justify-center mb-4">
                  <KaDunongBookIcon size={32} color="white" />
                </div>
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
                  <div className="w-7 h-7 rounded-lg bg-[#3d9185] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <KaDunongBookIcon size={13} color="white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#3d9185] text-white rounded-tr-sm"
                      : "bg-white/[0.06] text-white rounded-tl-sm border border-white/10"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-lg bg-[#3d9185] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <KaDunongBookIcon size={13} color="white" />
                </div>
                <div className="bg-white/[0.06] border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#80bbb2]/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#80bbb2]/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#80bbb2]/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-white/10 bg-[#0a1e23]">
            {moduleFileName && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full bg-[#3d9185]" />
                <span className="text-xs text-white/40 truncate">{moduleFileName}</span>
                <button
                  onClick={() => { setModuleContext(null); setModuleFileName(null); }}
                  className="text-xs text-white/20 hover:text-white ml-auto"
                >
                  Remove
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <label className={`cursor-pointer flex-shrink-0 ${uploadingPDF ? "opacity-30" : "opacity-50 hover:opacity-100"} transition-opacity`}>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handlePDFUpload}
                  disabled={uploadingPDF}
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={uploadingPDF ? "Nag-uupload..." : "Mag-type ng tanong o topic..."}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none max-h-32"
                style={{ minHeight: "24px" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-xl bg-[#3d9185] text-white disabled:opacity-30 transition-opacity flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-white/20 text-center mt-2">
              Enter para mag-send · Shift+Enter para mag-newline
            </p>
          </div>
        </>
      ) : (
        /* Progress View */
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-1">Iyong Progreso</h2>
            <p className="text-white/40 text-sm">{subject} · {grade}</p>
          </div>

          {/* Quiz score card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Quiz Performance</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-[#80bbb2]">{score?.percent ?? 0}%</span>
              <span className="text-white/40 text-sm mb-1">{score?.correct ?? 0} / {score?.total ?? 0} tama</span>
            </div>
            {score && score.total > 0 && (
              <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3d9185] rounded-full transition-all"
                  style={{ width: `${score.percent}%` }}
                />
              </div>
            )}
            {score?.total === 0 && (
              <p className="text-white/30 text-sm mt-2">Wala pang quiz. Mag-aral muna tayo.</p>
            )}
          </div>

          {/* Weak areas */}
          {weakAreas.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Para Pag-aralan Ulit</p>
              <div className="space-y-2">
                {weakAreas.map((w, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{w.topic}</p>
                      {w.melcLabel && <p className="text-xs text-white/40">{w.melcLabel}</p>}
                      <p className="text-xs text-white/30">{w.missedCount}x na na-flag</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competencies */}
          {competencies.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">DepEd Competencies (MELCs)</p>
              <div className="space-y-3">
                {competencies.map((c) => (
                  <div key={c.melc}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{c.label || c.melc}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "mastered"
                          ? "bg-green-400/20 text-green-400"
                          : c.status === "practicing"
                          ? "bg-[#3d9185]/20 text-[#80bbb2]"
                          : "bg-red-400/20 text-red-400"
                      }`}>
                        {c.status === "mastered" ? "Naintindihan" : c.status === "practicing" ? "Pinag-aaralan" : "Kailangan ng tulong"}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.status === "mastered" ? "bg-green-400" : c.status === "practicing" ? "bg-[#3d9185]" : "bg-red-400"
                        }`}
                        style={{ width: `${Math.round(c.lastScore * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/30 mt-1">{c.melc} · {c.attempts} attempt{c.attempts !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent session topics */}
          {recentSession && recentSession.topics.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Mga Natutunan Ngayon</p>
              <div className="flex flex-wrap gap-2">
                {recentSession.topics.map((topic, i) => (
                  <span key={i} className="px-3 py-1.5 bg-[#3d9185]/10 text-[#80bbb2] rounded-full text-sm">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {competencies.length === 0 && weakAreas.length === 0 && (!recentSession || recentSession.topics.length === 0) && (
            <div className="text-center py-16 text-white/30">
              <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Wala pang data. Magsimula ka nang mag-aral para makita ang iyong progreso.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
