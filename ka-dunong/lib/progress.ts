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
  startTime: string;
  endTime: string | null;
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
  score: number;
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
  scoreHistory: number[];
}

export interface SubjectActivity {
  subject: string;
  lastStudied: string;
  sessionCount: number;
  totalMinutes: number;
}

export interface KaDunongProgress {
  student: {
    grade: string;
    languagePreference: LanguageMode;
    lastActiveDate: string;
    streakDays: number;
    activeDates: string[];
  };
  sessions: SessionEntry[];
  quizzes: QuizRecord[];
  weakAreas: WeakArea[];
  competencies: Record<string, CompetencyRecord>;
  subjectActivity: Record<string, SubjectActivity>;
}

const STORAGE_KEY = "ka-dunong-progress";

export function loadProgress(): KaDunongProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultProgress();
    return migrateProgress(JSON.parse(stored));
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
    student: {
      grade: "8",
      languagePreference: "taglish",
      lastActiveDate: "",
      streakDays: 0,
      activeDates: [],
    },
    sessions: [],
    quizzes: [],
    weakAreas: [],
    competencies: {},
    subjectActivity: {},
  };
}

function migrateProgress(data: KaDunongProgress): KaDunongProgress {
  const defaults = defaultProgress();
  return {
    ...defaults,
    ...data,
    student: { ...defaults.student, ...data.student },
    subjectActivity: data.subjectActivity ?? {},
    sessions: (data.sessions ?? []).map((s) => ({
  ...s,
      startTime: s.startTime ?? (s.date ? `${s.date}T00:00:00.000Z` : new Date().toISOString()),
      endTime: s.endTime ?? null,
    })),
    quizzes: (data.quizzes ?? []).map((q) => ({
      ...q,
      score: q.score ?? (q.isCorrect ? 1 : 0),
    })),
    competencies: Object.fromEntries(
      Object.entries(data.competencies ?? {}).map(([k, v]) => [
        k,
        { ...v, scoreHistory: v.scoreHistory ?? [] },
      ])
    ),
  };
}

function updateStreak(
  student: KaDunongProgress["student"]
): KaDunongProgress["student"] {
  const today = new Date().toISOString().split("T")[0];
  const activeDates = student.activeDates ?? [];
  if (activeDates.includes(today)) return { ...student, lastActiveDate: today };
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newStreak = activeDates.includes(yesterday) ? (student.streakDays ?? 0) + 1 : 1;
  return {
    ...student,
    lastActiveDate: today,
    streakDays: newStreak,
    activeDates: [...activeDates, today],
  };
}

export function startSession(
  progress: KaDunongProgress,
  sessionId: string,
  subject: string,
  grade: string
): KaDunongProgress {
  const updated = { ...progress };
  updated.student = updateStreak(updated.student);
  if (!updated.sessions.find((s) => s.id === sessionId)) {
    const now = new Date().toISOString();
    updated.sessions = [
      {
        id: sessionId,
        date: now.split("T")[0],
        subject,
        grade,
        topics: [],
        melcs: [],
        duration: 0,
        messageCount: 0,
        startTime: now,
        endTime: null,
      },
      ...updated.sessions,
    ];
  }
  return updated;
}

export function endSession(
  progress: KaDunongProgress,
  sessionId: string
): KaDunongProgress {
  const updated = { ...progress };
  const session = updated.sessions.find((s) => s.id === sessionId);
  if (session && !session.endTime) {
    const now = new Date();
    session.endTime = now.toISOString();
    session.duration = Math.round(
      (now.getTime() - new Date(session.startTime).getTime()) / 60000
    );
  }
  return updated;
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

  updated.student = updateStreak(updated.student);

  let session = updated.sessions.find((s) => s.id === sessionId);
  if (!session) {
    const now = new Date().toISOString();
    session = {
      id: sessionId,
      date: today,
      subject,
      grade,
      topics: [],
      melcs: [],
      duration: 0,
      messageCount: 0,
      startTime: now,
      endTime: null,
    };
    updated.sessions = [session, ...updated.sessions];
  }

  if (session.startTime) {
    session.duration = Math.round(
      (Date.now() - new Date(session.startTime).getTime()) / 60000
    );
  }

  if (data.topic && !session.topics.includes(data.topic)) {
    session.topics = [...session.topics, data.topic];
  }

  if (data.melc && data.melcLabel) {
    const exists = session.melcs.find((m) => m.code === data.melc);
    if (!exists) {
      session.melcs = [...session.melcs, { code: data.melc, label: data.melcLabel }];
    }
  }

  session.messageCount += 1;

  // Subject activity
  const prevActivity = updated.subjectActivity[subject] ?? {
    subject,
    lastStudied: today,
    sessionCount: 0,
    totalMinutes: 0,
  };
  updated.subjectActivity[subject] = {
    ...prevActivity,
    lastStudied: today,
    sessionCount:
      session.messageCount === 1
        ? prevActivity.sessionCount + 1
        : prevActivity.sessionCount,
    totalMinutes: prevActivity.totalMinutes + (session.duration > 0 ? 1 : 0),
  };

  // Competency
  if (data.melc) {
    const existing = updated.competencies[data.melc];
    const correct = data.understoodCorrectly === true ? 1 : 0;
    const attempts = (existing?.attempts || 0) + 1;
    const correctCount = (existing?.correctCount || 0) + correct;
    const lastScore = correctCount / attempts;
    const scoreHistory = [...(existing?.scoreHistory ?? []), correct];

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
      scoreHistory,
    };
  }

  // Weak areas
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

  // Quiz record
  if (data.quizItem.triggered && data.quizItem.question && data.quizItem.correctAnswer) {
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
        score: data.quizItem.isCorrect ? 1 : 0,
      },
    ];
  }

  return updated;
}

// ─── Derived stats ────────────────────────────────────────────────────────────

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

export function getScoreTrend(
  progress: KaDunongProgress,
  subject?: string
): { date: string; score: number }[] {
  const quizzes = (
    subject
      ? progress.quizzes.filter((q) => q.subject === subject)
      : progress.quizzes
  ).filter((q) => q.isCorrect !== null);

  const byDate: Record<string, number[]> = {};
  for (const q of quizzes) {
    if (!byDate[q.date]) byDate[q.date] = [];
    byDate[q.date].push(q.isCorrect ? 1 : 0);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({
      date,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100),
    }));
}

export function getRecommendedTopics(
  progress: KaDunongProgress,
  subject: string,
  limit = 3
): WeakArea[] {
  return progress.weakAreas
    .filter((w) => w.subject === subject && w.flaggedForRevisit)
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, limit);
}

export function getTotalStudyTime(progress: KaDunongProgress): number {
  return progress.sessions.reduce((total, s) => total + (s.duration || 0), 0);
}

export function getSubjectCoverage(progress: KaDunongProgress): {
  subject: string;
  studied: boolean;
  lastStudied: string | null;
  sessionCount: number;
}[] {
  const ALL_SUBJECTS = [
    "Science", "Mathematics", "Filipino", "English",
    "Araling Panlipunan", "ESP", "MAPEH", "TLE",
  ];
  return ALL_SUBJECTS.map((subject) => {
    const activity = progress.subjectActivity[subject];
    return {
      subject,
      studied: !!activity,
      lastStudied: activity?.lastStudied ?? null,
      sessionCount: activity?.sessionCount ?? 0,
    };
  });
}

// ─── Buffalo Evolution ────────────────────────────────────────────────────────

export interface EvolutionStatus {
  stage: "base" | "evolved";
  evolutionPercent: number; // 0–100
  components: {
    sessions: number;  // 0–100
    streak: number;    // 0–100
    quiz: number;      // 0–100
  };
}

function getSessionComponent(sessionCount: number): number {
  if (sessionCount >= 10) return 100;
  if (sessionCount >= 5) return 50 + ((sessionCount - 5) / 5) * 50;
  if (sessionCount >= 3) return 20 + ((sessionCount - 3) / 2) * 30;
  return (sessionCount / 3) * 20;
}

function getStreakComponent(streakDays: number): number {
  return Math.min(100, Math.round((streakDays / 7) * 100));
}

function getQuizComponent(quizPercent: number): number {
  return Math.min(100, Math.round((quizPercent / 85) * 100));
}

export function getEvolutionStatus(progress: KaDunongProgress): EvolutionStatus {
  const totalSessions = progress.sessions.length;
  const streak = progress.student.streakDays ?? 0;
  const quizScore = getQuizScore(progress);
  const quizPercent = quizScore.total > 0 ? quizScore.percent : 0;

  const sessionsComp = getSessionComponent(totalSessions);
  const streakComp = getStreakComponent(streak);
  const quizComp = getQuizComponent(quizPercent);

  const evolutionPercent = Math.round(
    sessionsComp * 0.33 + streakComp * 0.33 + quizComp * 0.34
  );

  return {
    stage: evolutionPercent >= 100 ? "evolved" : "base",
    evolutionPercent: Math.min(100, evolutionPercent),
    components: {
      sessions: Math.round(sessionsComp),
      streak: Math.round(streakComp),
      quiz: Math.round(quizComp),
    },
  };
}