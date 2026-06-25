export type LanguageMode = "taglish" | "filipino" | "english";

export interface QuizItem {
  triggered: boolean;
  question: string | null;
  correctAnswer: string | null;
  studentAnswer: string | null;
  isCorrect: boolean | null;
}

export interface ProgressData {
  topic: string;
  melc: string | null;
  melcLabel: string | null;
  subject: string;
  understoodCorrectly: boolean | null;
  confidenceSignal: "high" | "medium" | "low" | null;
  flagForRevisit: boolean;
  quizItem: QuizItem;
}

export interface SessionEntry {
  id: string;
  date: string;
  subject: string;
  grade: string;
  topics: string[];
  melcs: { code: string; label: string }[];
  duration: number;
  messageCount: number;
}

export interface QuizRecord {
  sessionId: string;
  date: string;
  subject: string;
  topic: string;
  melc: string | null;
  question: string;
  correctAnswer: string;
  studentAnswer: string | null;
  isCorrect: boolean | null;
}

export interface WeakArea {
  subject: string;
  topic: string;
  melc: string | null;
  melcLabel: string | null;
  missedCount: number;
  lastAttempt: string;
  flaggedForRevisit: boolean;
}

export interface CompetencyRecord {
  melc: string;
  label: string;
  subject: string;
  status: "mastered" | "practicing" | "struggling";
  attempts: number;
  correctCount: number;
  lastScore: number;
  lastAttempt: string;
}

export interface KaDunongProgress {
  student: {
    grade: string;
    languagePreference: LanguageMode;
  };
  sessions: SessionEntry[];
  quizzes: QuizRecord[];
  weakAreas: WeakArea[];
  competencies: Record<string, CompetencyRecord>;
}

const STORAGE_KEY = "ka-dunong-progress";

export function loadProgress(): KaDunongProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: KaDunongProgress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function defaultProgress(): KaDunongProgress {
  return {
    student: { grade: "8", languagePreference: "taglish" },
    sessions: [],
    quizzes: [],
    weakAreas: [],
    competencies: {},
  };
}

export function updateProgressFromAI(
  progress: KaDunongProgress,
  data: ProgressData,
  sessionId: string,
  subject: string,
  grade: string
): KaDunongProgress {
  const updated = { ...progress };
  const today = new Date().toISOString().split("T")[0];

  // Update or create session
  let session = updated.sessions.find((s) => s.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      date: today,
      subject,
      grade,
      topics: [],
      melcs: [],
      duration: 0,
      messageCount: 0,
    };
    updated.sessions = [session, ...updated.sessions];
  }

  // Add topic if new
  if (data.topic && !session.topics.includes(data.topic)) {
    session.topics = [...session.topics, data.topic];
  }

  // Add MELC if new
  if (data.melc && data.melcLabel) {
    const exists = session.melcs.find((m) => m.code === data.melc);
    if (!exists) {
      session.melcs = [...session.melcs, { code: data.melc, label: data.melcLabel }];
    }
  }

  session.messageCount += 1;

  // Update competency record
  if (data.melc) {
    const existing = updated.competencies[data.melc];
    const correct = data.understoodCorrectly === true ? 1 : 0;
    const attempts = (existing?.attempts || 0) + 1;
    const correctCount = (existing?.correctCount || 0) + correct;
    const lastScore = correctCount / attempts;

    updated.competencies[data.melc] = {
      melc: data.melc,
      label: data.melcLabel || existing?.label || "",
      subject,
      status:
        lastScore >= 0.8 ? "mastered" : lastScore >= 0.5 ? "practicing" : "struggling",
      attempts,
      correctCount,
      lastScore,
      lastAttempt: today,
    };
  }

  // Handle weak areas
  if (data.flagForRevisit && data.topic) {
    const existingWeak = updated.weakAreas.find(
      (w) => w.topic === data.topic && w.subject === subject
    );
    if (existingWeak) {
      existingWeak.missedCount += 1;
      existingWeak.lastAttempt = today;
      existingWeak.flaggedForRevisit = true;
    } else {
      updated.weakAreas = [
        ...updated.weakAreas,
        {
          subject,
          topic: data.topic,
          melc: data.melc,
          melcLabel: data.melcLabel,
          missedCount: 1,
          lastAttempt: today,
          flaggedForRevisit: true,
        },
      ];
    }
  }

  // Record quiz if triggered and answered
  if (
    data.quizItem.triggered &&
    data.quizItem.question &&
    data.quizItem.correctAnswer
  ) {
    updated.quizzes = [
      ...updated.quizzes,
      {
        sessionId,
        date: today,
        subject,
        topic: data.topic,
        melc: data.melc,
        question: data.quizItem.question,
        correctAnswer: data.quizItem.correctAnswer,
        studentAnswer: data.quizItem.studentAnswer,
        isCorrect: data.quizItem.isCorrect,
      },
    ];
  }

  return updated;
}

export function getQuizScore(
  progress: KaDunongProgress,
  subject?: string
): { correct: number; total: number; percent: number } {
  const quizzes = subject
    ? progress.quizzes.filter((q) => q.subject === subject)
    : progress.quizzes;
  const answered = quizzes.filter((q) => q.isCorrect !== null);
  const correct = answered.filter((q) => q.isCorrect).length;
  return {
    correct,
    total: answered.length,
    percent: answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0,
  };
}
