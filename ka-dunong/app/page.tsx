"use client";
import { extractTextFromPDF } from "@/lib/pdf";
import { useState, useRef, useEffect } from "react";
import { Send, BookOpen, BarChart2, ChevronDown } from "lucide-react";
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
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 bg-[#0f1117] z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
            <span className="text-black font-bold text-sm">K</span>
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">Ka-Dunong</h1>
            <p className="text-xs text-white/40 leading-none mt-0.5">AI Study Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("chat")}
            className={`p-2 rounded-lg transition-colors ${view === "chat" ? "bg-yellow-400/20 text-yellow-400" : "text-white/40 hover:text-white"}`}
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={() => setView("progress")}
            className={`p-2 rounded-lg transition-colors ${view === "progress" ? "bg-yellow-400/20 text-yellow-400" : "text-white/40 hover:text-white"}`}
          >
            <BarChart2 size={18} />
          </button>
        </div>
      </header>

      {view === "chat" ? (
        <>
          {/* Context bar */}
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 flex-wrap bg-[#0f1117]">
            {/* Grade selector */}
            <div className="relative">
              <button
                onClick={() => { setShowGradeMenu(!showGradeMenu); setShowSubjectMenu(false); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
              >
                {grade} <ChevronDown size={14} />
              </button>
              {showGradeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-[#1a1d27] border border-white/10 rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto w-32">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => { setGrade(g); setShowGradeMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${grade === g ? "text-yellow-400" : "text-white"}`}
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
                <div className="absolute top-full left-0 mt-1 bg-[#1a1d27] border border-white/10 rounded-lg overflow-hidden z-20 w-48">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSubject(s); setShowSubjectMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${subject === s ? "text-yellow-400" : "text-white"}`}
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
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${languageMode === mode ? "bg-yellow-400 text-black" : "text-white/50 hover:text-white"}`}
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
                <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center mb-4">
                  <span className="text-black font-bold text-2xl">K</span>
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
                  <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <span className="text-black font-bold text-xs">K</span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-yellow-400 text-black rounded-tr-sm"
                      : "bg-white/8 text-white rounded-tl-sm border border-white/10"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <span className="text-black font-bold text-xs">K</span>
                </div>
                <div className="bg-white/8 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
                  <div className="px-4 py-4 border-t border-white/10 bg-[#0f1117]">
          {moduleFileName && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
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
            <label className={`cursor-pointer flex-shrink-0 ${uploadingPDF ? "opacity-30" : "opacity-60 hover:opacity-100"} transition-opacity`}>
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
              className="p-1.5 rounded-xl bg-yellow-400 text-black disabled:opacity-30 transition-opacity flex-shrink-0"
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
              <span className="text-4xl font-bold text-yellow-400">{score?.percent ?? 0}%</span>
              <span className="text-white/40 text-sm mb-1">{score?.correct ?? 0} / {score?.total ?? 0} tama</span>
            </div>
            {score && score.total > 0 && (
              <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all"
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
                          ? "bg-yellow-400/20 text-yellow-400"
                          : "bg-red-400/20 text-red-400"
                      }`}>
                        {c.status === "mastered" ? "Naintindihan" : c.status === "practicing" ? "Pinag-aaralan" : "Kailangan ng tulong"}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.status === "mastered" ? "bg-green-400" : c.status === "practicing" ? "bg-yellow-400" : "bg-red-400"
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
                  <span key={i} className="px-3 py-1.5 bg-yellow-400/10 text-yellow-400 rounded-full text-sm">
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
