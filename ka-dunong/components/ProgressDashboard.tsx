"use client";

import { useMemo } from "react";
import { BarChart2, Flame, Clock, BookOpen, Target, TrendingUp, RefreshCw } from "lucide-react";
import BuffaloPet from "@/components/BuffaloPet";
import {
  type KaDunongProgress,
  getQuizScore,
  getScoreTrend,
  getRecommendedTopics,
  getTotalStudyTime,
  getSubjectCoverage,
  getEvolutionStatus,
} from "@/lib/progress";

const SUBJECT_ICONS: Record<string, string> = {
  Science: "🔬",
  Mathematics: "📐",
  Filipino: "📖",
  English: "📚",
  "Araling Panlipunan": "🗺️",
  ESP: "💡",
  MAPEH: "🎨",
  "TLE": "🔧",
};

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-yellow-400/20 text-yellow-400" : "bg-white/10 text-white/60"}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
        <p className="text-xs text-white/40 mt-1">{label}</p>
      </div>
    </div>
  );
}

function ScoreTrendChart({ trend }: { trend: { date: string; score: number }[] }) {
  if (trend.length < 2) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Score Trend</p>
        <p className="text-white/30 text-sm text-center py-6">
          Sagutin ang mas maraming quiz para makita ang trend.
        </p>
      </div>
    );
  }

  const max = 100;
  const min = 0;
  const width = 300;
  const height = 80;
  const pad = 8;

  const points = trend.map((d, i) => {
    const x = pad + (i / (trend.length - 1)) * (width - pad * 2);
    const y = height - pad - ((d.score - min) / (max - min)) * (height - pad * 2);
    return { x, y, score: d.score, date: d.date };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;

  const latest = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const improving = latest.score >= prev.score;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 uppercase tracking-wider">Score Trend</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${improving ? "bg-green-400/15 text-green-400" : "bg-red-400/15 text-red-400"}`}>
          {improving ? "↑ Papabuti" : "↓ Bumababa"}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        {/* Area fill */}
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c97e82" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#c97e82" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#trendGrad)" />
        <path d={pathD} fill="none" stroke="#c97e82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#c97e82" />
        ))}
      </svg>

      <div className="flex justify-between mt-2">
        <span className="text-xs text-white/30">{trend[0].date.slice(5)}</span>
        <span className="text-xs text-white/60 font-medium">Latest: {latest.score}%</span>
        <span className="text-xs text-white/30">{latest.date.slice(5)}</span>
      </div>
    </div>
  );
}

function SubjectCoverage({ coverage }: { coverage: ReturnType<typeof getSubjectCoverage> }) {
  const studied = coverage.filter((c) => c.studied);
  const untouched = coverage.filter((c) => !c.studied);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 uppercase tracking-wider">Subject Coverage</p>
        <span className="text-xs text-white/40">{studied.length} / {coverage.length} subjects</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {coverage.map((c) => (
          <div
            key={c.subject}
            className={`rounded-xl p-2.5 text-center transition-colors ${
              c.studied
                ? "bg-[#c97e82]/15 border border-[#c97e82]/30"
                : "bg-white/5 border border-white/10 opacity-40"
            }`}
          >
            <div className="text-lg mb-1">{SUBJECT_ICONS[c.subject] ?? "📘"}</div>
            <p className={`text-[10px] leading-tight font-medium ${c.studied ? "text-[#e8b5b7]" : "text-white/40"}`}>
              {c.subject === "Araling Panlipunan" ? "Aral. Pan." : c.subject}
            </p>
            {c.studied && c.lastStudied && (
              <p className="text-[9px] text-white/30 mt-0.5">{c.lastStudied.slice(5)}</p>
            )}
          </div>
        ))}
      </div>

      {untouched.length > 0 && (
        <p className="text-xs text-white/30 mt-3 text-center">
          Hindi pa natutukan: {untouched.map((c) => c.subject).join(", ")}
        </p>
      )}
    </div>
  );
}

function RecommendedTopics({
  topics,
  subject,
}: {
  topics: ReturnType<typeof getRecommendedTopics>;
  subject: string;
}) {
  if (topics.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-wider mb-3">I-review Next</p>
      <div className="space-y-2">
        {topics.map((t, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#c97e82]/20 text-[#e8b5b7] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{t.topic}</p>
              {t.melcLabel && (
                <p className="text-xs text-white/40 mt-0.5 truncate">{t.melcLabel}</p>
              )}
              <p className="text-xs text-white/30 mt-0.5">{t.missedCount}x na na-flag</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetencyList({
  competencies,
}: {
  competencies: KaDunongProgress["competencies"];
}) {
  const list = Object.values(competencies);
  if (list.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-wider mb-3">DepEd Competencies</p>
      <div className="space-y-3">
        {list.map((c) => {
          const trend =
            c.scoreHistory.length >= 2
              ? c.scoreHistory[c.scoreHistory.length - 1] >
                c.scoreHistory[c.scoreHistory.length - 2]
                ? "↑"
                : c.scoreHistory[c.scoreHistory.length - 1] <
                  c.scoreHistory[c.scoreHistory.length - 2]
                ? "↓"
                : "→"
              : null;

          return (
            <div key={c.melc}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white truncate pr-2">
                  {c.label || c.melc}
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {trend && (
                    <span className={`text-xs ${trend === "↑" ? "text-green-400" : trend === "↓" ? "text-red-400" : "text-white/40"}`}>
                      {trend}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === "mastered"
                      ? "bg-green-400/20 text-green-400"
                      : c.status === "practicing"
                      ? "bg-[#c97e82]/20 text-[#e8b5b7]"
                      : "bg-red-400/20 text-red-400"
                  }`}>
                    {c.status === "mastered" ? "Naintindihan" : c.status === "practicing" ? "Pinag-aaralan" : "Kailangan ng tulong"}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    c.status === "mastered" ? "bg-green-400" : c.status === "practicing" ? "bg-[#c97e82]" : "bg-red-400"
                  }`}
                  style={{ width: `${Math.round(c.lastScore * 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/30 mt-1">{c.melc} · {c.attempts} attempt{c.attempts !== 1 ? "s" : ""}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ProgressDashboard({
  progress,
  subject,
  grade,
}: {
  progress: KaDunongProgress;
  subject: string;
  grade: string;
}) {
  const evolution = useMemo(() => getEvolutionStatus(progress), [progress]);
  const score = useMemo(() => getQuizScore(progress, subject), [progress, subject]);
  const trend = useMemo(() => getScoreTrend(progress, subject), [progress, subject]);
  const recommended = useMemo(() => getRecommendedTopics(progress, subject), [progress, subject]);
  const coverage = useMemo(() => getSubjectCoverage(progress), [progress]);
  const totalMinutes = useMemo(() => getTotalStudyTime(progress), [progress]);
  const subjectCompetencies = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(progress.competencies).filter(([, v]) => v.subject === subject)
      ),
    [progress, subject]
  );

  const streak = progress.student.streakDays ?? 0;
  const totalSessions = progress.sessions.length;

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const isEmpty =
    totalSessions === 0 &&
    progress.quizzes.length === 0 &&
    progress.weakAreas.length === 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold mb-0.5">Iyong Progreso</h2>
        <p className="text-white/40 text-sm">{subject} · {grade}</p>
      </div>

      {/* Buffalo pet */}
      <BuffaloPet evolution={evolution} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Flame size={16} />}
          label="Day streak"
          value={`${streak}`}
          sub={streak === 1 ? "araw" : "araw"}
          accent={streak >= 3}
        />
        <StatCard
          icon={<Clock size={16} />}
          label="Study time"
          value={formatTime(totalMinutes)}
          sub="total"
        />
        <StatCard
          icon={<BookOpen size={16} />}
          label="Sessions"
          value={`${totalSessions}`}
          sub="lahat"
        />
      </div>

      {/* Quiz score */}
      {score.total > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">
            Quiz Performance · {subject}
          </p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-[#e8b5b7]">{score.percent}%</span>
            <span className="text-white/40 text-sm mb-1">
              {score.correct} / {score.total} tama
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c97e82] rounded-full transition-all"
              style={{ width: `${score.percent}%` }}
            />
          </div>
          {score.percent >= 85 && (
            <p className="text-xs text-green-400 mt-2">
              ✓ Na-reach na ang 85% target para sa evolution!
            </p>
          )}
        </div>
      )}

      {/* Score trend */}
      <ScoreTrendChart trend={trend} />

      {/* Subject coverage */}
      <SubjectCoverage coverage={coverage} />

      {/* Recommended topics */}
      <RecommendedTopics topics={recommended} subject={subject} />

      {/* MELC competencies */}
      <CompetencyList competencies={subjectCompetencies} />

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-12 text-white/30">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Wala pang data.</p>
          <p className="text-xs mt-1">Magsimula ka nang mag-aral para makita ang iyong progreso.</p>
        </div>
      )}
    </div>
  );
}
