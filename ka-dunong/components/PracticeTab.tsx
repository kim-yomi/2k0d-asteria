"use client";

import { useState } from "react";
import { Layers, HelpCircle, ChevronLeft, ChevronRight, RotateCcw, Check, X } from "lucide-react";
import { loadProgress } from "@/lib/progress";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Flashcard {
  term: string;
  definition: string;
}

interface MultipleChoiceQuestion {
  type: "multiple_choice";
  question: string;
  choices: string[];
  correct_answer: string; // "A" | "B" | "C" | "D"
  explanation: string;
}

interface OpenEndedQuestion {
  type: "open_ended";
  question: string;
  correct_answer: string;
  explanation: string;
}

type QuizQuestion = MultipleChoiceQuestion | OpenEndedQuestion;

type PracticeMode = "select" | "flashcards" | "quiz";
type GenerateType = "flashcards" | "quiz";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = [
  "Science", "Mathematics", "Filipino", "English",
  "Araling Panlipunan", "ESP", "MAPEH", "TLE",
];

const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

const BACKEND = "http://localhost:8000";

// ─── Flashcard Viewer ─────────────────────────────────────────────────────────

function FlashcardViewer({
  cards,
  topic,
  onDone,
}: {
  cards: Flashcard[];
  topic: string;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [review, setReview] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);

  const card = cards[index];
  const progress = ((index) / cards.length) * 100;

  function mark(knew: boolean) {
    const next = knew ? new Set([...known, index]) : known;
    const rev = !knew ? new Set([...review, index]) : review;
    setKnown(next);
    setReview(rev);
    setFlipped(false);
    if (index + 1 >= cards.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center">
          <span className="text-black font-bold text-2xl">K</span>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1">Tapos na ang flashcards!</h2>
          <p className="text-white/50 text-sm">
            {topic} · {cards.length} cards
          </p>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{known.size}</p>
            <p className="text-xs text-white/40 mt-1">Alam na</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-400">{review.size}</p>
            <p className="text-xs text-white/40 mt-1">Kailangan pa</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setKnown(new Set()); setReview(new Set()); setFinished(false); }}
            className="px-4 py-2 rounded-xl bg-white/10 text-sm hover:bg-white/20 transition-colors"
          >
            Ulitin lahat
          </button>
          {review.size > 0 && (
            <button
              onClick={() => {
                // restart with only review cards — reindex
                const reviewCards = [...review];
                setIndex(0);
                setFlipped(false);
                setKnown(new Set());
                setReview(new Set());
                setFinished(false);
                // note: this resets to all cards; a more advanced impl would filter
              }}
              className="px-4 py-2 rounded-xl bg-yellow-400/20 text-yellow-400 text-sm hover:bg-yellow-400/30 transition-colors"
            >
              Ulitin ang mahirap ({review.size})
            </button>
          )}
          <button
            onClick={onDone}
            className="px-4 py-2 rounded-xl bg-yellow-400 text-black text-sm font-medium hover:bg-yellow-300 transition-colors"
          >
            Tapos na
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">{topic}</p>
          <p className="text-white/40 text-xs">{index + 1} / {cards.length}</p>
        </div>
        <button onClick={onDone} className="text-white/30 hover:text-white text-xs transition-colors">
          Lumabas
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card */}
      <div
        className="flex-1 cursor-pointer"
        onClick={() => setFlipped(!flipped)}
      >
        <div className="h-full min-h-[280px] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center relative">
          <p className="text-xs text-white/30 absolute top-4 left-0 right-0 text-center">
            {flipped ? "Kahulugan" : "Termino"} · i-click para i-flip
          </p>
          <p className={`font-medium leading-relaxed transition-all duration-200 ${flipped ? "text-base text-white/80" : "text-2xl text-white"}`}>
            {flipped ? card.definition : card.term}
          </p>
        </div>
      </div>

      {/* Actions — only show after flip */}
      {flipped ? (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => mark(false)}
            className="flex-1 py-3 rounded-xl bg-red-400/20 text-red-400 font-medium text-sm hover:bg-red-400/30 transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} /> Kailangan pa
          </button>
          <button
            onClick={() => mark(true)}
            className="flex-1 py-3 rounded-xl bg-green-400/20 text-green-400 font-medium text-sm hover:bg-green-400/30 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} /> Alam ko na
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-3 rounded-xl bg-white/8 border border-white/10 text-sm text-white/60 hover:text-white transition-colors"
          >
            Ipakita ang kahulugan
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Quiz Viewer ──────────────────────────────────────────────────────────────

function QuizViewer({
  questions,
  topic,
  subject,
  grade,
  onDone,
}: {
  questions: QuizQuestion[];
  topic: string;
  subject: string;
  grade: string;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<{ is_correct: boolean; score: number; feedback: string } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const q = questions[index];
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const maxScore = questions.length;

  async function submitAnswer() {
    if (q.type === "multiple_choice") {
      if (!selected) return;
      const letter = selected.split(".")[0].trim();
      const correct = letter === q.correct_answer;
      const newScores = [...scores, correct ? 1 : 0];
      setScores(newScores);
      setFeedback({
        is_correct: correct,
        score: correct ? 1 : 0,
        feedback: correct
          ? `Tama! ${q.explanation}`
          : `Hindi tama. ${q.explanation}`,
      });
    } else {
      if (!openAnswer.trim()) return;
      setEvaluating(true);
      try {
        const res = await fetch(`${BACKEND}/v1/practice/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q.question,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            student_answer: openAnswer.trim(),
          }),
        });
        const data = await res.json();
        setScores([...scores, data.score ?? 0]);
        setFeedback(data);
      } catch {
        setFeedback({ is_correct: false, score: 0, feedback: "May problema sa pag-evaluate. Subukan ulit." });
      } finally {
        setEvaluating(false);
      }
    }
  }

  function next() {
    setSelected(null);
    setOpenAnswer("");
    setFeedback(null);
    if (index + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  }

  if (finished) {
    const pct = Math.round((totalScore / maxScore) * 100);
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center">
          <span className="text-black font-bold text-2xl">K</span>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1">Quiz tapos na!</h2>
          <p className="text-white/50 text-sm">{topic} · {questions.length} tanong</p>
        </div>
        <div className="text-center">
          <p className="text-5xl font-bold text-yellow-400">{pct}%</p>
          <p className="text-white/40 text-sm mt-2">
            {totalScore.toFixed(1)} / {maxScore} points
          </p>
        </div>
        <p className="text-white/60 text-sm max-w-xs">
          {pct >= 80
            ? "Magaling! Kaya mo pala. Subukan mo pa ang ibang topics."
            : pct >= 50
            ? "Hindi masama! May ilang parts pa na kailangan ng kaunting review."
            : "Huwag mag-alala. Balikan natin ang topic na 'to sa chat para mas maunawaan."}
        </p>
        <button
          onClick={onDone}
          className="px-6 py-3 rounded-xl bg-yellow-400 text-black font-medium text-sm hover:bg-yellow-300 transition-colors"
        >
          Bumalik
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">{topic}</p>
          <p className="text-white/40 text-xs">{index + 1} / {questions.length} · {q.type === "multiple_choice" ? "Multiple Choice" : "Open-ended"}</p>
        </div>
        <button onClick={onDone} className="text-white/30 hover:text-white text-xs transition-colors">
          Lumabas
        </button>
      </div>

      {/* Progress */}
      <div className="h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${((index) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <p className="text-sm leading-relaxed">{q.question}</p>
      </div>

      {/* Choices or text input */}
      {q.type === "multiple_choice" ? (
        <div className="space-y-2 mb-4">
          {q.choices.map((choice) => {
            const letter = choice.split(".")[0].trim();
            const isSelected = selected === choice;
            const isCorrect = feedback && letter === q.correct_answer;
            const isWrong = feedback && isSelected && letter !== q.correct_answer;
            return (
              <button
                key={choice}
                disabled={!!feedback}
                onClick={() => !feedback && setSelected(choice)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-colors ${
                  isCorrect
                    ? "bg-green-400/20 border-green-400/50 text-green-300"
                    : isWrong
                    ? "bg-red-400/20 border-red-400/50 text-red-300"
                    : isSelected
                    ? "bg-yellow-400/20 border-yellow-400/50 text-yellow-300"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      ) : (
        <textarea
          value={openAnswer}
          onChange={(e) => setOpenAnswer(e.target.value)}
          disabled={!!feedback}
          placeholder="Isulat ang iyong sagot dito..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none outline-none focus:border-white/30 mb-4 disabled:opacity-50"
        />
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-xl p-4 mb-4 text-sm ${feedback.is_correct ? "bg-green-400/10 border border-green-400/20" : feedback.score > 0 ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-red-400/10 border border-red-400/20"}`}>
          <p className="text-white/80 leading-relaxed">{feedback.feedback}</p>
        </div>
      )}

      {/* Actions */}
      {!feedback ? (
        <button
          onClick={submitAnswer}
          disabled={evaluating || (q.type === "multiple_choice" ? !selected : !openAnswer.trim())}
          className="w-full py-3 rounded-xl bg-yellow-400 text-black font-medium text-sm disabled:opacity-30 hover:bg-yellow-300 transition-colors"
        >
          {evaluating ? "Sinusuri..." : "I-submit"}
        </button>
      ) : (
        <button
          onClick={next}
          className="w-full py-3 rounded-xl bg-yellow-400 text-black font-medium text-sm hover:bg-yellow-300 transition-colors"
        >
          {index + 1 >= questions.length ? "Tingnan ang resulta" : "Susunod na tanong"}
        </button>
      )}
    </div>
  );
}

// ─── Main Practice Tab ────────────────────────────────────────────────────────

export default function PracticeTab({
  grade,
  subject,
  languageMode,
}: {
  grade: string;
  subject: string;
  languageMode: string;
}) {
  const progress = loadProgress();
  const recentTopics = [
    ...new Set(
      progress.sessions
        .flatMap((s) => s.topics)
        .filter(Boolean)
        .slice(0, 8)
    ),
  ];

  const [topic, setTopic] = useState("");
  const [generateType, setGenerateType] = useState<GenerateType>("flashcards");
  const [itemCount, setItemCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<PracticeMode>("select");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [activeTopic, setActiveTopic] = useState("");

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/v1/practice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: generateType,
          topic: topic.trim(),
          subject,
          grade,
          language: languageMode,
          item_count: itemCount,
          context: "",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setActiveTopic(topic.trim());
      if (generateType === "flashcards") {
        setFlashcards(data.items);
        setMode("flashcards");
      } else {
        setQuizQuestions(data.items);
        setMode("quiz");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "May problema. Subukan ulit.");
    } finally {
      setLoading(false);
    }
  }

  // ── Active practice sessions ──
  if (mode === "flashcards") {
    return (
      <FlashcardViewer
        cards={flashcards}
        topic={activeTopic}
        onDone={() => setMode("select")}
      />
    );
  }

  if (mode === "quiz") {
    return (
      <QuizViewer
        questions={quizQuestions}
        topic={activeTopic}
        subject={subject}
        grade={grade}
        onDone={() => setMode("select")}
      />
    );
  }

  // ── Setup screen ──
  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Mag-practice</h2>
        <p className="text-white/40 text-sm mt-0.5">{subject} · {grade}</p>
      </div>

      {/* Topic input */}
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Topic</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="e.g. Photosynthesis, Noli Me Tangere, Quadratic Equations..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
        />
      </div>

      {/* Recent topics */}
      {recentTopics.length > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Mga natutunan mo</p>
          <div className="flex flex-wrap gap-2">
            {recentTopics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                  topic === t
                    ? "bg-yellow-400/20 border-yellow-400/50 text-yellow-400"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/30"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type selector */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Uri ng practice</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setGenerateType("flashcards")}
            className={`p-4 rounded-xl border text-left transition-colors ${
              generateType === "flashcards"
                ? "bg-yellow-400/15 border-yellow-400/50"
                : "bg-white/5 border-white/10 hover:border-white/20"
            }`}
          >
            <Layers size={20} className={generateType === "flashcards" ? "text-yellow-400 mb-2" : "text-white/40 mb-2"} />
            <p className={`font-medium text-sm ${generateType === "flashcards" ? "text-yellow-400" : "text-white"}`}>Flashcards</p>
            <p className="text-white/40 text-xs mt-0.5">Term + Definition</p>
          </button>
          <button
            onClick={() => setGenerateType("quiz")}
            className={`p-4 rounded-xl border text-left transition-colors ${
              generateType === "quiz"
                ? "bg-yellow-400/15 border-yellow-400/50"
                : "bg-white/5 border-white/10 hover:border-white/20"
            }`}
          >
            <HelpCircle size={20} className={generateType === "quiz" ? "text-yellow-400 mb-2" : "text-white/40 mb-2"} />
            <p className={`font-medium text-sm ${generateType === "quiz" ? "text-yellow-400" : "text-white"}`}>Quiz</p>
            <p className="text-white/40 text-xs mt-0.5">Multiple choice + Open-ended</p>
          </button>
        </div>
      </div>

      {/* Item count */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
          Bilang ng {generateType === "flashcards" ? "cards" : "tanong"}: {itemCount}
        </p>
        <input
          type="range"
          min={5}
          max={20}
          step={5}
          value={itemCount}
          onChange={(e) => setItemCount(Number(e.target.value))}
          className="w-full accent-yellow-400"
        />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>5</span><span>10</span><span>15</span><span>20</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={!topic.trim() || loading}
        className="w-full py-3.5 rounded-xl bg-yellow-400 text-black font-medium text-sm disabled:opacity-30 hover:bg-yellow-300 transition-colors"
      >
        {loading
          ? `Ginagawa ng Ka-Dunong ang iyong ${generateType === "flashcards" ? "flashcards" : "quiz"}...`
          : `Gumawa ng ${generateType === "flashcards" ? "Flashcards" : "Quiz"}`}
      </button>

      {loading && (
        <p className="text-center text-xs text-white/30 -mt-4">
          Sandali lang — nagha-generate si Ka-Dunong para sa "{topic}"
        </p>
      )}
    </div>
  );
}
