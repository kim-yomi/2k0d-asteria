import type { KaDunongProgress } from "@/lib/progress";

export const PLANNER_STORAGE_KEY = "ka-dunong-planner";
export const DEFAULT_STUDY_DURATION = 45;
export const SNAP_INTERVAL_MINUTES = 15;
export const VIEW_START_MINUTES = 6 * 60;
export const VIEW_END_MINUTES = 22 * 60;
export const PLANNING_START_MINUTES = 7 * 60;
export const PLANNING_END_MINUTES = 21 * 60;
export const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;
export const BREAK_LENGTH_OPTIONS = [15, 30, 45] as const;
export const MAX_DAILY_STUDY_OPTIONS = [1, 2, 3] as const;
export const DEFAULT_PREFERRED_WINDOW_START = 17 * 60;
export const DEFAULT_PREFERRED_WINDOW_END = 20 * 60;
export const DEFAULT_PREFERRED_STUDY_DAYS = [0, 1, 2, 3, 4];

export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const FIXED_CATEGORIES = [
  "School",
  "Sleep",
  "Meals",
  "Sports",
  "Church",
  "Homework",
  "Family",
  "Other",
] as const;

export const STUDY_ACTIVITY_TYPES = [
  "Review",
  "Practice",
  "Quiz",
  "Flashcards",
  "Reading",
] as const;

export type PlannerBlockType = "fixed" | "study";
export type FixedCategory = (typeof FIXED_CATEGORIES)[number];
export type StudyActivityType = (typeof STUDY_ACTIVITY_TYPES)[number];
export type BreakLengthOption = (typeof BREAK_LENGTH_OPTIONS)[number];
export type MaxDailyStudyOption = (typeof MAX_DAILY_STUDY_OPTIONS)[number];

export interface PlannerBlockBase {
  id: string;
  title: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
}

export interface FixedScheduleBlock extends PlannerBlockBase {
  type: "fixed";
  category: FixedCategory;
}

export interface StudyScheduleBlock extends PlannerBlockBase {
  type: "study";
  subject: string;
  topic: string;
  activityType?: StudyActivityType;
  isManuallyAdjusted?: boolean;
  durationMinutes: number;
  reasons: string[];
  source: "weak-topic" | "competency" | "quiz" | "recent-session" | "starter";
}

export type PlannerBlock = FixedScheduleBlock | StudyScheduleBlock;

export interface StudyPreferences {
  preferredWindowStart: number;
  preferredWindowEnd: number;
  preferredSessionLength: number;
  preferredBreakLength: number;
  preferredStudyDays: number[];
  avoidBeforeSchool: boolean;
  maxStudySessionsPerDay: number;
  learnedAvoidMornings?: boolean;
  softAvoidDays?: number[];
}

export interface PreferenceSignals {
  morningToEveningMoves: number;
  shortenedSessions: number;
  avoidedDays: Record<string, number>;
}

export interface PlannerState {
  blocks: PlannerBlock[];
  preferredStudyDuration: number;
  studyPreferences: StudyPreferences;
  preferenceSignals: PreferenceSignals;
  updatedAt: string;
}

interface TopicCandidate {
  subject: string;
  topic: string;
  title: string;
  score: number;
  reasons: string[];
  source: StudyScheduleBlock["source"];
}

interface FreeSlot {
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
}

interface ScoredSlot extends FreeSlot {
  score: number;
  reasons: string[];
}

interface PlacementConstraints {
  dayIndex?: number;
  windowStart?: number;
  windowEnd?: number;
  exactStartMinutes?: number;
}

interface ParsedDestination {
  dayIndex?: number;
  windowStart?: number;
  windowEnd?: number;
  exactStartMinutes?: number;
  label: string;
}

export interface NaturalLanguageRescheduleResult {
  state: PlannerState;
  success: boolean;
  message: string;
  selectedBlockId?: string;
}

const STARTER_TOPICS: TopicCandidate[] = [
  {
    subject: "Mathematics",
    topic: "Fractions",
    title: "Fractions Review",
    score: 30,
    source: "starter",
    reasons: ["Starter review while Ka-Dunong gathers more progress data."],
  },
  {
    subject: "Science",
    topic: "Forces and Motion",
    title: "Science Review",
    score: 25,
    source: "starter",
    reasons: ["Balanced starter topic for a quick confidence check."],
  },
  {
    subject: "English",
    topic: "Reading Comprehension",
    title: "Reading Review",
    score: 20,
    source: "starter",
    reasons: ["Short review session to keep study momentum going."],
  },
];

export function defaultPlannerState(): PlannerState {
  const studyPreferences = defaultStudyPreferences();

  return {
    blocks: [],
    preferredStudyDuration: studyPreferences.preferredSessionLength,
    studyPreferences,
    preferenceSignals: defaultPreferenceSignals(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadPlannerState(): PlannerState {
  if (typeof window === "undefined") return defaultPlannerState();

  try {
    const stored = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!stored) return defaultPlannerState();

    const parsed = JSON.parse(stored) as Partial<PlannerState>;
    const studyPreferences = normalizeStudyPreferences(
      parsed.studyPreferences,
      typeof parsed.preferredStudyDuration === "number" ? parsed.preferredStudyDuration : undefined
    );

    return {
      blocks: Array.isArray(parsed.blocks)
        ? parsed.blocks.map(normalizeBlock).filter((block): block is PlannerBlock => block !== null)
        : [],
      preferredStudyDuration: studyPreferences.preferredSessionLength,
      studyPreferences,
      preferenceSignals: normalizePreferenceSignals(parsed.preferenceSignals),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return defaultPlannerState();
  }
}

export function savePlannerState(state: PlannerState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state));
}

export function createFixedScheduleBlock(input: {
  title: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  category: FixedCategory;
}): FixedScheduleBlock {
  return {
    id: createId("fixed"),
    type: "fixed",
    title: input.title.trim(),
    dayIndex: input.dayIndex,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    category: input.category,
  };
}

export function generatePlannerWithStudyBlocks(
  state: PlannerState,
  progress: KaDunongProgress
): PlannerState {
  const preferences = normalizeStudyPreferences(state.studyPreferences, state.preferredStudyDuration);
  const fixedBlocks = state.blocks.filter((block): block is FixedScheduleBlock => block.type === "fixed");
  const preservedStudyBlocks = state.blocks
    .filter((block): block is StudyScheduleBlock => block.type === "study" && block.isManuallyAdjusted === true)
    .map(withManualPreservationReason);
  const preservedTopicKeys = new Set(
    preservedStudyBlocks.map((block) => getTopicKey(block.subject, block.topic))
  );
  const candidates = buildTopicCandidates(progress)
    .filter((candidate) => !preservedTopicKeys.has(getTopicKey(candidate.subject, candidate.topic)))
    .slice(0, 8);
  const generatedStudyBlocks = generateStudyBlocks(
    candidates,
    [...fixedBlocks, ...preservedStudyBlocks],
    preferences.preferredSessionLength,
    preferences,
    Math.max(0, Math.min(6, candidates.length + preservedStudyBlocks.length) - preservedStudyBlocks.length)
  );

  return {
    ...state,
    preferredStudyDuration: preferences.preferredSessionLength,
    studyPreferences: preferences,
    blocks: [...fixedBlocks, ...preservedStudyBlocks, ...generatedStudyBlocks],
    updatedAt: new Date().toISOString(),
  };
}

export function reschedulePlannerFromCommand(
  state: PlannerState,
  command: string,
  now = new Date()
): NaturalLanguageRescheduleResult {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    return {
      state,
      success: false,
      message: "Type a short rescheduling request first.",
    };
  }

  const normalizedCommand = normalizeCommandText(trimmedCommand);
  const preferences = normalizeStudyPreferences(state.studyPreferences, state.preferredStudyDuration);

  if (normalizedCommand.startsWith("move ")) {
    return handleMoveCommand(state, trimmedCommand, normalizedCommand, now, preferences);
  }

  if (isBusyCommand(normalizedCommand)) {
    return handleBusyCommand(state, trimmedCommand, normalizedCommand, now, preferences);
  }

  return {
    state,
    success: false,
    message:
      "Ka-Dunong could not understand that request yet. Try something like \"I'm busy tomorrow at 5 PM\" or \"Move my math review to Friday.\"",
  };
}

export function formatMinutes(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

export function timeToMinutes(time: string) {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function minutesToTimeInput(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function getBlocksForDay(blocks: PlannerBlock[], dayIndex: number) {
  return blocks
    .filter((block) => block.dayIndex === dayIndex)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
}

export function getBlockDuration(block: PlannerBlock) {
  return block.endMinutes - block.startMinutes;
}

export function snapMinutes(minutes: number) {
  return Math.round(minutes / SNAP_INTERVAL_MINUTES) * SNAP_INTERVAL_MINUTES;
}

export function updatePlannerBlock(state: PlannerState, updatedBlock: PlannerBlock): PlannerState {
  return {
    ...state,
    blocks: state.blocks.map((block) => (block.id === updatedBlock.id ? normalizePersistedBlock(updatedBlock) : block)),
    updatedAt: new Date().toISOString(),
  };
}

export function updateStudyPreferences(state: PlannerState, preferences: StudyPreferences): PlannerState {
  const normalizedPreferences = normalizeStudyPreferences(preferences, state.preferredStudyDuration);

  return {
    ...state,
    preferredStudyDuration: normalizedPreferences.preferredSessionLength,
    studyPreferences: normalizedPreferences,
    updatedAt: new Date().toISOString(),
  };
}

export function recordManualStudyAdjustment(
  state: PlannerState,
  previousBlock: PlannerBlock,
  updatedBlock: PlannerBlock
): PlannerState {
  if (previousBlock.type !== "study" || updatedBlock.type !== "study") return state;

  const previousDuration = getBlockDuration(previousBlock);
  const updatedDuration = getBlockDuration(updatedBlock);
  const nextSignals = normalizePreferenceSignals(state.preferenceSignals);
  let nextPreferences = normalizeStudyPreferences(state.studyPreferences, state.preferredStudyDuration);

  if (isMorningToEveningMove(previousBlock, updatedBlock)) {
    nextSignals.morningToEveningMoves += 1;

    if (nextSignals.morningToEveningMoves >= 3) {
      nextPreferences = {
        ...nextPreferences,
        preferredWindowStart: DEFAULT_PREFERRED_WINDOW_START,
        preferredWindowEnd: DEFAULT_PREFERRED_WINDOW_END,
        learnedAvoidMornings: true,
      };
    }
  }

  if (updatedDuration < previousDuration) {
    nextSignals.shortenedSessions += 1;

    if (nextSignals.shortenedSessions >= 3) {
      nextPreferences = {
        ...nextPreferences,
        preferredSessionLength: normalizeDurationOption(updatedDuration, DEFAULT_STUDY_DURATION),
      };
    }
  }

  if (previousBlock.dayIndex !== updatedBlock.dayIndex) {
    const key = String(previousBlock.dayIndex);
    nextSignals.avoidedDays[key] = (nextSignals.avoidedDays[key] || 0) + 1;

    if (nextSignals.avoidedDays[key] >= 3) {
      nextPreferences = {
        ...nextPreferences,
        softAvoidDays: normalizeDayIndexes(
          [...(nextPreferences.softAvoidDays || []), previousBlock.dayIndex],
          []
        ),
      };
    }
  }

  nextPreferences = normalizeStudyPreferences(nextPreferences, state.preferredStudyDuration);

  return {
    ...state,
    preferredStudyDuration: nextPreferences.preferredSessionLength,
    studyPreferences: nextPreferences,
    preferenceSignals: nextSignals,
    updatedAt: new Date().toISOString(),
  };
}

export function markStudyBlockManuallyAdjusted(block: PlannerBlock): PlannerBlock {
  if (block.type !== "study") return block;

  return {
    ...block,
    isManuallyAdjusted: true,
  };
}

export function deletePlannerBlock(state: PlannerState, blockId: string): PlannerState {
  return {
    ...state,
    blocks: state.blocks.filter((block) => block.id !== blockId),
    updatedAt: new Date().toISOString(),
  };
}

export function validateBlockPlacement(block: PlannerBlock, blocks: PlannerBlock[]): string | null {
  if (block.dayIndex < 0 || block.dayIndex >= WEEK_DAYS.length) {
    return "Move this block inside the weekly planner.";
  }

  if (block.startMinutes < VIEW_START_MINUTES || block.endMinutes > VIEW_END_MINUTES) {
    return `Keep blocks between ${formatMinutes(VIEW_START_MINUTES)} and ${formatMinutes(VIEW_END_MINUTES)}.`;
  }

  if (getBlockDuration(block) < SNAP_INTERVAL_MINUTES) {
    return "Planner blocks need at least 15 minutes.";
  }

  if (hasBlockOverlap(block, blocks)) {
    return "That time overlaps another planner block. Try a different slot.";
  }

  return null;
}

export function hasBlockOverlap(block: PlannerBlock, blocks: PlannerBlock[]) {
  return blocks.some(
    (otherBlock) =>
      otherBlock.id !== block.id &&
      otherBlock.dayIndex === block.dayIndex &&
      block.startMinutes < otherBlock.endMinutes &&
      block.endMinutes > otherBlock.startMinutes
  );
}

export function withBlockTiming(
  block: PlannerBlock,
  dayIndex: number,
  startMinutes: number,
  endMinutes: number
): PlannerBlock {
  if (block.type === "study") {
    return {
      ...block,
      dayIndex,
      startMinutes,
      endMinutes,
      durationMinutes: endMinutes - startMinutes,
    };
  }

  return {
    ...block,
    dayIndex,
    startMinutes,
    endMinutes,
  };
}

function generateStudyBlocks(
  candidates: TopicCandidate[],
  baseBlocks: PlannerBlock[],
  durationMinutes: number,
  preferences: StudyPreferences,
  targetCount: number
): StudyScheduleBlock[] {
  const generated: StudyScheduleBlock[] = [];

  for (const candidate of candidates) {
    if (generated.length >= targetCount) break;

    const scheduledBlocks = [...baseBlocks, ...generated];
    const balancedSlot = findBalancedSlot(scheduledBlocks, candidate, durationMinutes, preferences);
    const fallbackSlot = balancedSlot ? null : findFirstAvailableSlot(scheduledBlocks, durationMinutes);
    const slot = balancedSlot || fallbackSlot;
    if (!slot) continue;

    generated.push({
      id: createId("study"),
      type: "study",
      title: candidate.title,
      subject: candidate.subject,
      topic: candidate.topic,
      activityType: candidate.source === "quiz" || candidate.source === "competency" ? "Practice" : "Review",
      dayIndex: slot.dayIndex,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      durationMinutes,
      isManuallyAdjusted: false,
      source: candidate.source,
      reasons: [
        ...candidate.reasons,
        ...(balancedSlot?.reasons || []),
        `Fits your available ${durationMinutes}-minute slot on ${WEEK_DAYS[slot.dayIndex]}.`,
      ],
    });
  }

  return generated;
}

function buildTopicCandidates(progress: KaDunongProgress): TopicCandidate[] {
  const byTopic = new Map<string, TopicCandidate>();

  for (const weakArea of progress.weakAreas) {
    addCandidate(byTopic, {
      subject: weakArea.subject,
      topic: weakArea.topic,
      title: `${weakArea.topic} Review`,
      score: 100 + weakArea.missedCount * 10,
      source: "weak-topic",
      reasons: [
        `${weakArea.topic} has low confidence in your progress tracker.`,
        `It has been flagged ${weakArea.missedCount} time${weakArea.missedCount === 1 ? "" : "s"} for revisit.`,
      ],
    });
  }

  for (const competency of Object.values(progress.competencies)) {
    if (competency.status !== "struggling") continue;

    addCandidate(byTopic, {
      subject: competency.subject,
      topic: competency.label || competency.melc,
      title: `${competency.subject} Practice`,
      score: 80 + competency.attempts,
      source: "competency",
      reasons: [
        `${competency.label || competency.melc} is marked as needing help.`,
        `Current confidence is ${Math.round(competency.lastScore * 100)}%.`,
      ],
    });
  }

  const missedQuizCounts = new Map<string, { subject: string; topic: string; count: number }>();
  for (const quiz of progress.quizzes) {
    if (quiz.isCorrect !== false) continue;
    const key = getTopicKey(quiz.subject, quiz.topic);
    const current = missedQuizCounts.get(key);
    missedQuizCounts.set(key, {
      subject: quiz.subject,
      topic: quiz.topic,
      count: (current?.count || 0) + 1,
    });
  }

  for (const missed of missedQuizCounts.values()) {
    addCandidate(byTopic, {
      subject: missed.subject,
      topic: missed.topic,
      title: `${missed.topic} Practice`,
      score: 65 + missed.count * 5,
      source: "quiz",
      reasons: [
        `${missed.topic} appeared in an incorrect quiz answer.`,
        `A short practice block can reinforce the missed concept.`,
      ],
    });
  }

  for (const session of progress.sessions.slice(0, 3)) {
    for (const topic of session.topics) {
      addCandidate(byTopic, {
        subject: session.subject,
        topic,
        title: `${topic} Refresh`,
        score: 40,
        source: "recent-session",
        reasons: [
          `${topic} appeared in a recent study session.`,
          `A quick refresh helps make the lesson stick.`,
        ],
      });
    }
  }

  if (byTopic.size === 0) {
    for (const starter of STARTER_TOPICS) {
      addCandidate(byTopic, starter);
    }
  }

  return [...byTopic.values()].sort((a, b) => b.score - a.score);
}

function addCandidate(candidates: Map<string, TopicCandidate>, candidate: TopicCandidate) {
  const key = getTopicKey(candidate.subject, candidate.topic);
  const existing = candidates.get(key);
  if (!existing || candidate.score > existing.score) {
    candidates.set(key, candidate);
  }
}

function findBalancedSlot(
  blocks: PlannerBlock[],
  candidate: TopicCandidate,
  durationMinutes: number,
  preferences: StudyPreferences,
  constraints?: PlacementConstraints
): ScoredSlot | null {
  const normalizedPreferences = normalizeStudyPreferences(preferences, durationMinutes);
  const validSlots = findValidSlots(blocks, durationMinutes, constraints);
  const cappedSlots = validSlots.filter(
    (slot) => countStudyBlocksForDay(blocks, slot.dayIndex) < normalizedPreferences.maxStudySessionsPerDay
  );

  if (cappedSlots.length === 0) return null;

  const minStudyCount = Math.min(...cappedSlots.map((slot) => countStudyBlocksForDay(blocks, slot.dayIndex)));
  const minActivityCount = Math.min(...cappedSlots.map((slot) => countActivitiesForDay(blocks, slot.dayIndex)));
  const hasExistingDifficultStudy = blocks.some(isDifficultStudyBlock);
  const isCandidateDifficult = isDifficultSource(candidate.source);

  return cappedSlots
    .map((slot) => {
      const studyCount = countStudyBlocksForDay(blocks, slot.dayIndex);
      const activityCount = countActivitiesForDay(blocks, slot.dayIndex);
      const hasBreak = hasBreakAroundSlot(blocks, slot, normalizedPreferences.preferredBreakLength);
      const adjacentDifficult = isCandidateDifficult && hasAdjacentDifficultStudy(blocks, slot);
      const isPreferredDay = normalizedPreferences.preferredStudyDays.includes(slot.dayIndex);
      const isPreferredWindow = isSlotInsidePreferredWindow(slot, normalizedPreferences);
      const beforeSchool = isBeforeSchoolStudySlot(blocks, slot);
      const learnedMorningConflict = normalizedPreferences.learnedAvoidMornings === true && slot.startMinutes < 12 * 60;
      const softAvoidDay = (normalizedPreferences.softAvoidDays || []).includes(slot.dayIndex);
      const reasons: string[] = [];

      if (isPreferredWindow) {
        reasons.push("Scheduled during your preferred study hours.");
      }

      if (isPreferredDay) {
        reasons.push("Placed on one of your preferred study days.");
      }

      if (normalizedPreferences.learnedAvoidMornings && !learnedMorningConflict) {
        reasons.push("Avoided mornings based on your previous schedule adjustments.");
      }

      if (normalizedPreferences.softAvoidDays?.length && !softAvoidDay) {
        reasons.push("Respects days you usually keep lighter.");
      }

      if (normalizedPreferences.avoidBeforeSchool && !beforeSchool) {
        reasons.push("Avoided study time before school.");
      }

      if (studyCount === minStudyCount && blocks.some((block) => block.type === "study")) {
        reasons.push("Distributed across the week to reduce study overload.");
      }

      if (activityCount === minActivityCount) {
        reasons.push("Scheduled on a lighter day.");
      }

      if (hasExistingDifficultStudy && isCandidateDifficult && !adjacentDifficult) {
        reasons.push("Spaced away from another difficult topic.");
      }

      if (hasBreak) {
        reasons.push(`Leaves your preferred ${normalizedPreferences.preferredBreakLength}-minute break around nearby activities.`);
      }

      return {
        ...slot,
        reasons,
        score:
          (isPreferredWindow ? 0 : 10000) +
          (isPreferredDay ? 0 : 5000) +
          (normalizedPreferences.avoidBeforeSchool && beforeSchool ? 2500 : 0) +
          (learnedMorningConflict ? 2000 : 0) +
          (softAvoidDay ? 1500 : 0) +
          studyCount * 500 +
          activityCount * 50 +
          (hasBreak ? 0 : 120) +
          (adjacentDifficult ? 180 : 0) +
          getAssessmentProximityScore() +
          slot.dayIndex +
          slot.startMinutes / 10000,
      };
    })
    .sort((a, b) => a.score - b.score || a.dayIndex - b.dayIndex || a.startMinutes - b.startMinutes)[0];
}

function findValidSlots(
  blocks: PlannerBlock[],
  durationMinutes: number,
  constraints?: PlacementConstraints
): FreeSlot[] {
  const slots: FreeSlot[] = [];
  const dayIndexes =
    typeof constraints?.dayIndex === "number"
      ? [constraints.dayIndex]
      : WEEK_DAYS.map((_, dayIndex) => dayIndex);

  for (const dayIndex of dayIndexes) {
    const windowStart = Math.max(PLANNING_START_MINUTES, constraints?.windowStart ?? PLANNING_START_MINUTES);
    const windowEnd = Math.min(PLANNING_END_MINUTES, constraints?.windowEnd ?? PLANNING_END_MINUTES);
    const startTimes =
      typeof constraints?.exactStartMinutes === "number"
        ? [constraints.exactStartMinutes]
        : createStartTimes(windowStart, windowEnd, durationMinutes);

    for (const startMinutes of startTimes) {
      const slot = {
        dayIndex,
        startMinutes,
        endMinutes: startMinutes + durationMinutes,
      };

      if (slot.startMinutes < windowStart || slot.endMinutes > windowEnd) continue;

      if (!hasBlockOverlap({ ...slot, id: "candidate", title: "Candidate", type: "study", subject: "", topic: "", durationMinutes, reasons: [], source: "starter" }, blocks)) {
        slots.push(slot);
      }
    }
  }

  return slots;
}

function createStartTimes(windowStart: number, windowEnd: number, durationMinutes: number) {
  const startTimes: number[] = [];

  for (
    let startMinutes = snapMinutes(windowStart);
    startMinutes + durationMinutes <= windowEnd;
    startMinutes += SNAP_INTERVAL_MINUTES
  ) {
    startTimes.push(startMinutes);
  }

  return startTimes;
}

function countStudyBlocksForDay(blocks: PlannerBlock[], dayIndex: number) {
  return blocks.filter((block) => block.type === "study" && block.dayIndex === dayIndex).length;
}

function countActivitiesForDay(blocks: PlannerBlock[], dayIndex: number) {
  return blocks.filter((block) => block.dayIndex === dayIndex).length;
}

function hasBreakAroundSlot(blocks: PlannerBlock[], slot: FreeSlot, breakMinutes = SNAP_INTERVAL_MINUTES) {
  const dayBlocks = getBlocksForDay(blocks, slot.dayIndex);
  const previousBlock = [...dayBlocks].reverse().find((block) => block.endMinutes <= slot.startMinutes);
  const nextBlock = dayBlocks.find((block) => block.startMinutes >= slot.endMinutes);
  const hasBeforeBreak = !previousBlock || slot.startMinutes - previousBlock.endMinutes >= breakMinutes;
  const hasAfterBreak = !nextBlock || nextBlock.startMinutes - slot.endMinutes >= breakMinutes;

  return hasBeforeBreak && hasAfterBreak;
}

function isSlotInsidePreferredWindow(slot: FreeSlot, preferences: StudyPreferences) {
  return slot.startMinutes >= preferences.preferredWindowStart && slot.endMinutes <= preferences.preferredWindowEnd;
}

function isBeforeSchoolStudySlot(blocks: PlannerBlock[], slot: FreeSlot) {
  const schoolBlock = getBlocksForDay(blocks, slot.dayIndex).find(
    (block) => block.type === "fixed" && block.category === "School"
  );

  if (schoolBlock) {
    return slot.endMinutes <= schoolBlock.startMinutes;
  }

  return slot.startMinutes < 8 * 60;
}

function hasAdjacentDifficultStudy(blocks: PlannerBlock[], slot: FreeSlot) {
  return blocks.some(
    (block) =>
      isDifficultStudyBlock(block) &&
      block.dayIndex === slot.dayIndex &&
      (Math.abs(block.endMinutes - slot.startMinutes) < SNAP_INTERVAL_MINUTES ||
        Math.abs(slot.endMinutes - block.startMinutes) < SNAP_INTERVAL_MINUTES)
  );
}

function isDifficultStudyBlock(block: PlannerBlock): block is StudyScheduleBlock {
  return block.type === "study" && isDifficultSource(block.source);
}

function isDifficultSource(source: StudyScheduleBlock["source"]) {
  return source === "weak-topic" || source === "competency" || source === "quiz";
}

function getAssessmentProximityScore() {
  // Current local planner/progress state does not expose upcoming assessments yet.
  return 0;
}

function findFirstAvailableSlot(
  blocks: PlannerBlock[],
  durationMinutes: number,
  constraints?: PlacementConstraints
): FreeSlot | null {
  return findValidSlots(blocks, durationMinutes, constraints)[0] || null;
}

function handleMoveCommand(
  state: PlannerState,
  originalCommand: string,
  normalizedCommand: string,
  now: Date,
  preferences: StudyPreferences
): NaturalLanguageRescheduleResult {
  const moveMatch = normalizedCommand.match(/^move\s+(.+?)\s+to\s+(.+)$/);

  if (!moveMatch) {
    return {
      state,
      success: false,
      message: "Try a move request like \"Move my math review to Friday.\"",
    };
  }

  const selectorText = moveMatch[1];
  const destinationText = moveMatch[2];
  const destination = parseDestination(destinationText, now, preferences);

  if (!destination) {
    return {
      state,
      success: false,
      message: "Ka-Dunong could not find where to move that study block.",
    };
  }

  const sourceDayIndex = parseDayReference(selectorText, now);
  const selectorTokens = getSelectorTokens(selectorText);
  const candidates = state.blocks
    .filter((block): block is StudyScheduleBlock => block.type === "study")
    .filter((block) => sourceDayIndex === undefined || block.dayIndex === sourceDayIndex)
    .filter((block) => selectorTokens.length === 0 || matchesStudySelector(block, selectorTokens))
    .sort(compareBlocksByTime);

  if (candidates.length === 0) {
    return {
      state,
      success: false,
      message: "Ka-Dunong could not find a matching study block to move.",
    };
  }

  const blockToMove = candidates[0];
  return relocateStudyBlocks(state, [blockToMove], preferences, {
    constraints: destinationToConstraints(destination),
    movedReason: `Moved because you asked: "${originalCommand}".`,
    successMessage: `${blockToMove.title} moved to ${destination.label}.`,
  });
}

function handleBusyCommand(
  state: PlannerState,
  originalCommand: string,
  normalizedCommand: string,
  now: Date,
  preferences: StudyPreferences
): NaturalLanguageRescheduleResult {
  const busyWindow = parseBusyWindow(normalizedCommand, now, preferences);

  if (!busyWindow) {
    return {
      state,
      success: false,
      message: "Ka-Dunong could not tell when you are busy. Try \"I'm busy tomorrow at 5 PM.\"",
    };
  }

  const affectedBlocks = state.blocks
    .filter((block): block is StudyScheduleBlock => block.type === "study")
    .filter((block) => block.isManuallyAdjusted !== true)
    .filter((block) => block.dayIndex === busyWindow.dayIndex)
    .filter((block) => rangesOverlap(block.startMinutes, block.endMinutes, busyWindow.startMinutes, busyWindow.endMinutes))
    .sort(compareBlocksByTime);

  if (affectedBlocks.length === 0) {
    return {
      state,
      success: false,
      message: "No untouched Ka-Dunong study block overlaps that busy time, so your planner stayed the same.",
    };
  }

  return relocateStudyBlocks(state, affectedBlocks, preferences, {
    unavailableSlots: [busyWindow],
    movedReason: `Moved because you said you were unavailable: "${originalCommand}".`,
    successMessage: `Moved ${affectedBlocks.length} study block${affectedBlocks.length === 1 ? "" : "s"} away from ${busyWindow.label}.`,
  });
}

function relocateStudyBlocks(
  state: PlannerState,
  blocksToMove: StudyScheduleBlock[],
  preferences: StudyPreferences,
  options: {
    constraints?: PlacementConstraints;
    unavailableSlots?: FreeSlot[];
    movedReason: string;
    successMessage: string;
  }
): NaturalLanguageRescheduleResult {
  const movingIds = new Set(blocksToMove.map((block) => block.id));
  const keptBlocks = state.blocks.filter((block) => !movingIds.has(block.id));
  const temporaryBlocks = (options.unavailableSlots || []).map(createTemporaryBusyBlock);
  const movedBlocks: StudyScheduleBlock[] = [];

  for (const block of blocksToMove) {
    const scheduledBlocks = [...keptBlocks, ...temporaryBlocks, ...movedBlocks];
    const durationMinutes = getBlockDuration(block);
    const candidate = studyBlockToCandidate(block);
    const balancedSlot = findBalancedSlot(
      scheduledBlocks,
      candidate,
      durationMinutes,
      preferences,
      options.constraints
    );
    const fallbackSlot = balancedSlot
      ? null
      : findFirstAvailableSlot(scheduledBlocks, durationMinutes, options.constraints);
    const slot = balancedSlot || fallbackSlot;

    if (!slot) {
      return {
        state,
        success: false,
        message: `${block.title} could not be moved without conflicting with another planner block.`,
      };
    }

    const movedBlock = markStudyBlockManuallyAdjusted(
      withBlockTiming(block, slot.dayIndex, slot.startMinutes, slot.endMinutes)
    ) as StudyScheduleBlock;

    movedBlocks.push({
      ...movedBlock,
      reasons: appendUniqueReasons(
        block.reasons,
        options.movedReason,
        ...(balancedSlot?.reasons || []),
        `Fits your available ${durationMinutes}-minute slot on ${WEEK_DAYS[slot.dayIndex]}.`
      ),
    });
  }

  let nextState: PlannerState = {
    ...state,
    blocks: [...keptBlocks, ...movedBlocks],
    updatedAt: new Date().toISOString(),
  };

  for (const movedBlock of movedBlocks) {
    const previousBlock = blocksToMove.find((block) => block.id === movedBlock.id);
    if (previousBlock) {
      nextState = recordManualStudyAdjustment(nextState, previousBlock, movedBlock);
    }
  }

  return {
    state: nextState,
    success: true,
    message: options.successMessage,
    selectedBlockId: movedBlocks[0]?.id,
  };
}

function parseDestination(
  text: string,
  now: Date,
  preferences: StudyPreferences
): ParsedDestination | null {
  const dayIndex = parseDayReference(text, now);
  const time = parseTimeReference(text);
  const namedWindow = parseNamedWindow(text, preferences);

  if (dayIndex === undefined && time === null && !namedWindow) return null;

  const resolvedDayIndex = dayIndex ?? getCurrentPlannerDayIndex(now);
  const dayLabel = WEEK_DAYS[resolvedDayIndex];

  if (time !== null) {
    return {
      dayIndex: resolvedDayIndex,
      exactStartMinutes: time,
      label: `${dayLabel} at ${formatMinutes(time)}`,
    };
  }

  if (namedWindow) {
    return {
      dayIndex: resolvedDayIndex,
      windowStart: namedWindow.startMinutes,
      windowEnd: namedWindow.endMinutes,
      label: `${dayLabel} ${namedWindow.label}`,
    };
  }

  return {
    dayIndex: resolvedDayIndex,
    label: dayLabel,
  };
}

function parseBusyWindow(
  text: string,
  now: Date,
  preferences: StudyPreferences
): (FreeSlot & { label: string }) | null {
  const dayIndex = parseDayReference(text, now) ?? getCurrentPlannerDayIndex(now);
  const time = parseTimeReference(text);
  const namedWindow = parseNamedWindow(text, preferences);

  if (time !== null) {
    return {
      dayIndex,
      startMinutes: time,
      endMinutes: Math.min(time + SNAP_INTERVAL_MINUTES, VIEW_END_MINUTES),
      label: `${WEEK_DAYS[dayIndex]} at ${formatMinutes(time)}`,
    };
  }

  if (namedWindow) {
    return {
      dayIndex,
      startMinutes: namedWindow.startMinutes,
      endMinutes: namedWindow.endMinutes,
      label: `${WEEK_DAYS[dayIndex]} ${namedWindow.label}`,
    };
  }

  if (mentionsDay(text)) {
    return {
      dayIndex,
      startMinutes: PLANNING_START_MINUTES,
      endMinutes: PLANNING_END_MINUTES,
      label: WEEK_DAYS[dayIndex],
    };
  }

  return null;
}

function destinationToConstraints(destination: ParsedDestination): PlacementConstraints {
  return {
    dayIndex: destination.dayIndex,
    windowStart: destination.windowStart,
    windowEnd: destination.windowEnd,
    exactStartMinutes: destination.exactStartMinutes,
  };
}

function createTemporaryBusyBlock(slot: FreeSlot): FixedScheduleBlock {
  return {
    id: `busy_${slot.dayIndex}_${slot.startMinutes}`,
    type: "fixed",
    title: "Busy",
    category: "Other",
    dayIndex: slot.dayIndex,
    startMinutes: slot.startMinutes,
    endMinutes: slot.endMinutes,
  };
}

function studyBlockToCandidate(block: StudyScheduleBlock): TopicCandidate {
  return {
    subject: block.subject,
    topic: block.topic,
    title: block.title,
    score: 0,
    reasons: [],
    source: block.source,
  };
}

function parseDayReference(text: string, now: Date) {
  const normalizedText = normalizeCommandText(text);
  const currentDayIndex = getCurrentPlannerDayIndex(now);

  if (/\b(today|todays|tonight)\b/.test(normalizedText)) return currentDayIndex;
  if (/\btomorrow\b/.test(normalizedText)) return (currentDayIndex + 1) % WEEK_DAYS.length;

  const matchedDayIndex = WEEK_DAYS.findIndex((day) => {
    const loweredDay = day.toLowerCase();
    return new RegExp(`\\b(${loweredDay}|${loweredDay.slice(0, 3)})\\b`).test(normalizedText);
  });

  return matchedDayIndex >= 0 ? matchedDayIndex : undefined;
}

function parseTimeReference(text: string) {
  const normalizedText = normalizeCommandText(text);
  const meridiemMatch = normalizedText.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);

  if (meridiemMatch) {
    const hourValue = Number(meridiemMatch[1]);
    const minuteValue = Number(meridiemMatch[2] || "0");
    if (hourValue < 1 || hourValue > 12 || minuteValue < 0 || minuteValue > 59) return null;

    const hour24 =
      meridiemMatch[3] === "pm" ? (hourValue % 12) + 12 : hourValue === 12 ? 0 : hourValue;
    return snapMinutes(hour24 * 60 + minuteValue);
  }

  const clockMatch = normalizedText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!clockMatch) return null;

  return snapMinutes(Number(clockMatch[1]) * 60 + Number(clockMatch[2]));
}

function parseNamedWindow(text: string, preferences: StudyPreferences) {
  const normalizedText = normalizeCommandText(text);

  if (/\b(evening|tonight)\b/.test(normalizedText)) {
    const isEveningPreference = preferences.preferredWindowStart >= 15 * 60;

    return {
      startMinutes: isEveningPreference ? preferences.preferredWindowStart : DEFAULT_PREFERRED_WINDOW_START,
      endMinutes: isEveningPreference ? preferences.preferredWindowEnd : DEFAULT_PREFERRED_WINDOW_END,
      label: normalizedText.includes("tonight") ? "tonight" : "evening",
    };
  }

  if (/\bmorning\b/.test(normalizedText)) {
    return {
      startMinutes: PLANNING_START_MINUTES,
      endMinutes: 11 * 60,
      label: "morning",
    };
  }

  if (/\bafternoon\b/.test(normalizedText)) {
    return {
      startMinutes: 12 * 60,
      endMinutes: 17 * 60,
      label: "afternoon",
    };
  }

  return null;
}

function getSelectorTokens(text: string) {
  const ignoredWords = new Set([
    "a",
    "an",
    "block",
    "blocks",
    "current",
    "my",
    "session",
    "sessions",
    "study",
    "the",
    "this",
    "today",
    "todays",
    "tomorrow",
    "tonight",
  ]);

  WEEK_DAYS.forEach((day) => {
    ignoredWords.add(day.toLowerCase());
    ignoredWords.add(day.toLowerCase().slice(0, 3));
  });

  return normalizeCommandText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !ignoredWords.has(token));
}

function matchesStudySelector(block: StudyScheduleBlock, tokens: string[]) {
  const searchableText = normalizeCommandText(
    `${block.title} ${block.subject} ${block.topic} ${block.activityType || "Review"} ${block.source}`
  );

  return tokens.every((token) => searchableText.includes(token));
}

function isBusyCommand(text: string) {
  return /\b(busy|cant study|cannot study|can't study|cant|can't|unavailable)\b/.test(text);
}

function mentionsDay(text: string) {
  return parseDayReference(text, new Date()) !== undefined;
}

function getCurrentPlannerDayIndex(now: Date) {
  return (now.getDay() + 6) % WEEK_DAYS.length;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function compareBlocksByTime(a: PlannerBlock, b: PlannerBlock) {
  return a.dayIndex - b.dayIndex || a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes;
}

function appendUniqueReasons(existingReasons: string[], ...newReasons: string[]) {
  return [...new Set([...existingReasons, ...newReasons.filter(Boolean)])];
}

function normalizeCommandText(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[.?!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function defaultStudyPreferences(): StudyPreferences {
  return {
    preferredWindowStart: DEFAULT_PREFERRED_WINDOW_START,
    preferredWindowEnd: DEFAULT_PREFERRED_WINDOW_END,
    preferredSessionLength: DEFAULT_STUDY_DURATION,
    preferredBreakLength: SNAP_INTERVAL_MINUTES,
    preferredStudyDays: DEFAULT_PREFERRED_STUDY_DAYS,
    avoidBeforeSchool: true,
    maxStudySessionsPerDay: 2,
    learnedAvoidMornings: false,
    softAvoidDays: [],
  };
}

function defaultPreferenceSignals(): PreferenceSignals {
  return {
    morningToEveningMoves: 0,
    shortenedSessions: 0,
    avoidedDays: {},
  };
}

function normalizeStudyPreferences(input: unknown, legacyDuration?: number): StudyPreferences {
  const defaults = defaultStudyPreferences();
  const candidate = isRecord(input) ? input : {};
  const preferredSessionLength = normalizeDurationOption(
    candidate.preferredSessionLength,
    normalizeDurationOption(legacyDuration, defaults.preferredSessionLength)
  );
  const preferredWindowStart = normalizePlannerMinute(candidate.preferredWindowStart, defaults.preferredWindowStart);
  const preferredWindowEnd = normalizePlannerMinute(candidate.preferredWindowEnd, defaults.preferredWindowEnd);
  const hasUsableWindow = preferredWindowEnd - preferredWindowStart >= SNAP_INTERVAL_MINUTES;

  return {
    preferredWindowStart: hasUsableWindow ? preferredWindowStart : defaults.preferredWindowStart,
    preferredWindowEnd: hasUsableWindow ? preferredWindowEnd : defaults.preferredWindowEnd,
    preferredSessionLength,
    preferredBreakLength: normalizeBreakLength(candidate.preferredBreakLength, defaults.preferredBreakLength),
    preferredStudyDays: normalizeDayIndexes(candidate.preferredStudyDays, defaults.preferredStudyDays),
    avoidBeforeSchool:
      typeof candidate.avoidBeforeSchool === "boolean"
        ? candidate.avoidBeforeSchool
        : defaults.avoidBeforeSchool,
    maxStudySessionsPerDay: normalizeMaxStudySessions(
      candidate.maxStudySessionsPerDay,
      defaults.maxStudySessionsPerDay
    ),
    learnedAvoidMornings:
      typeof candidate.learnedAvoidMornings === "boolean"
        ? candidate.learnedAvoidMornings
        : defaults.learnedAvoidMornings,
    softAvoidDays: normalizeDayIndexes(candidate.softAvoidDays, []),
  };
}

function normalizePreferenceSignals(input: unknown): PreferenceSignals {
  const defaults = defaultPreferenceSignals();
  const candidate = isRecord(input) ? input : {};
  const avoidedDays = isRecord(candidate.avoidedDays) ? candidate.avoidedDays : {};

  return {
    morningToEveningMoves: normalizeCount(candidate.morningToEveningMoves, defaults.morningToEveningMoves),
    shortenedSessions: normalizeCount(candidate.shortenedSessions, defaults.shortenedSessions),
    avoidedDays: Object.fromEntries(
      Object.entries(avoidedDays)
        .filter(([dayIndex]) => Number(dayIndex) >= 0 && Number(dayIndex) < WEEK_DAYS.length)
        .map(([dayIndex, count]) => [dayIndex, normalizeCount(count, 0)])
    ),
  };
}

function normalizeDurationOption(value: unknown, fallback: number) {
  return typeof value === "number" && DURATION_OPTIONS.includes(value as (typeof DURATION_OPTIONS)[number])
    ? value
    : fallback;
}

function normalizeBreakLength(value: unknown, fallback: number) {
  return typeof value === "number" && BREAK_LENGTH_OPTIONS.includes(value as BreakLengthOption) ? value : fallback;
}

function normalizeMaxStudySessions(value: unknown, fallback: number) {
  return typeof value === "number" && MAX_DAILY_STUDY_OPTIONS.includes(value as MaxDailyStudyOption)
    ? value
    : fallback;
}

function normalizePlannerMinute(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  const snappedValue = snapMinutes(value);
  return Math.max(VIEW_START_MINUTES, Math.min(VIEW_END_MINUTES, snappedValue));
}

function normalizeDayIndexes(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) return [...fallback];

  const days = [...new Set(value.filter((day): day is number => Number.isInteger(day) && day >= 0 && day < WEEK_DAYS.length))];
  return days.length > 0 || fallback.length === 0 ? days.sort((a, b) => a - b) : [...fallback];
}

function normalizeCount(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function isMorningToEveningMove(previousBlock: StudyScheduleBlock, updatedBlock: StudyScheduleBlock) {
  return previousBlock.startMinutes < 12 * 60 && updatedBlock.startMinutes >= DEFAULT_PREFERRED_WINDOW_START;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBlock(block: unknown): PlannerBlock | null {
  if (!isValidBlock(block)) return null;

  return normalizePersistedBlock(block);
}

function withManualPreservationReason(block: StudyScheduleBlock): StudyScheduleBlock {
  const reason = "Kept because you manually adjusted this study block.";

  return {
    ...block,
    isManuallyAdjusted: true,
    reasons: block.reasons.includes(reason) ? block.reasons : [...block.reasons, reason],
  };
}

function normalizePersistedBlock(block: PlannerBlock): PlannerBlock {
  if (block.type === "fixed") {
    return {
      ...block,
      category: FIXED_CATEGORIES.includes(block.category) ? block.category : "Other",
    };
  }

  return {
    ...block,
    activityType: block.activityType && STUDY_ACTIVITY_TYPES.includes(block.activityType) ? block.activityType : "Review",
    isManuallyAdjusted: block.isManuallyAdjusted === true,
    durationMinutes:
      typeof block.durationMinutes === "number"
        ? block.durationMinutes
        : block.endMinutes - block.startMinutes,
    reasons: Array.isArray(block.reasons) ? block.reasons : [],
  };
}

function isValidBlock(block: unknown): block is PlannerBlock {
  if (!block || typeof block !== "object") return false;

  const candidate = block as Partial<PlannerBlock>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.dayIndex === "number" &&
    typeof candidate.startMinutes === "number" &&
    typeof candidate.endMinutes === "number" &&
    (candidate.type === "fixed" || candidate.type === "study")
  );
}

function getTopicKey(subject: string, topic: string) {
  return `${subject.trim().toLowerCase()}::${topic.trim().toLowerCase()}`;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
