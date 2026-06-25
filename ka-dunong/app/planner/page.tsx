"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  CalendarDays,
  Clock,
  GripVertical,
  Info,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { loadProgress, type KaDunongProgress } from "@/lib/progress";
import {
  BREAK_LENGTH_OPTIONS,
  FIXED_CATEGORIES,
  DURATION_OPTIONS,
  MAX_DAILY_STUDY_OPTIONS,
  PLANNING_END_MINUTES,
  PLANNING_START_MINUTES,
  STUDY_ACTIVITY_TYPES,
  VIEW_END_MINUTES,
  VIEW_START_MINUTES,
  WEEK_DAYS,
  createFixedScheduleBlock,
  defaultPlannerState,
  deletePlannerBlock,
  formatMinutes,
  generatePlannerWithStudyBlocks,
  getBlockDuration,
  getBlocksForDay,
  loadPlannerState,
  markStudyBlockManuallyAdjusted,
  minutesToTimeInput,
  recordManualStudyAdjustment,
  reschedulePlannerFromCommand,
  savePlannerState,
  snapMinutes,
  timeToMinutes,
  updatePlannerBlock,
  updateStudyPreferences,
  validateBlockPlacement,
  withBlockTiming,
  type FixedCategory,
  type PlannerBlock,
  type PlannerState,
  type StudyPreferences,
  type StudyActivityType,
  type StudyScheduleBlock,
} from "@/lib/planner";

const HOUR_HEIGHT = 64;
const GRID_HOURS = Array.from(
  { length: (VIEW_END_MINUTES - VIEW_START_MINUTES) / 60 + 1 },
  (_, index) => VIEW_START_MINUTES + index * 60
);
const CALENDAR_HEIGHT = ((VIEW_END_MINUTES - VIEW_START_MINUTES) / 60) * HOUR_HEIGHT;
const TIME_GUTTER_WIDTH = 72;
const DRAG_CLICK_THRESHOLD_PX = 4;

const CATEGORY_HINTS: Record<FixedCategory, string> = {
  School: "Class time",
  Sleep: "Rest time",
  Meals: "Food break",
  Sports: "Training",
  Church: "Community",
  Homework: "Assignments",
  Family: "Family time",
  Other: "Fixed plan",
};

interface DragCandidate {
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
}

interface DragState {
  blockId: string;
  pointerId: number;
  startedAtX: number;
  startedAtY: number;
  grabOffsetMinutes: number;
  durationMinutes: number;
  didMove: boolean;
  candidate: DragCandidate | null;
}

export default function PlannerPage() {
  const [planner, setPlanner] = useState<PlannerState>(defaultPlannerState);
  const [progress, setProgress] = useState<KaDunongProgress | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "School",
    dayIndex: "0",
    start: "08:00",
    end: "15:00",
    category: "School" as FixedCategory,
  });
  const [formError, setFormError] = useState("");
  const [rescheduleText, setRescheduleText] = useState("");
  const [coachMessage, setCoachMessage] = useState("Add fixed blocks, then let Ka-Dunong place study sessions around them.");
  const [interactionMessage, setInteractionMessage] = useState("Click a block to edit it, or drag it to an open slot.");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const calendarGridRef = useRef<HTMLDivElement | null>(null);
  const plannerRef = useRef(planner);
  const dragStateRef = useRef(dragState);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPlanner(loadPlannerState());
      setProgress(loadProgress());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    plannerRef.current = planner;
  }, [planner]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const isDragging = dragState !== null;

  useEffect(() => {
    if (!isDragging) return;

    function handlePointerMove(event: PointerEvent) {
      const currentDrag = dragStateRef.current;
      if (!currentDrag || event.pointerId !== currentDrag.pointerId) return;

      const movedDistance = Math.hypot(
        event.clientX - currentDrag.startedAtX,
        event.clientY - currentDrag.startedAtY
      );
      const candidate = getDragCandidateFromPointer(event, currentDrag, calendarGridRef.current);

      const nextDragState = {
        ...currentDrag,
        didMove: currentDrag.didMove || movedDistance > DRAG_CLICK_THRESHOLD_PX,
        candidate,
      };

      dragStateRef.current = nextDragState;
      setDragState(nextDragState);
    }

    function handlePointerUp(event: PointerEvent) {
      const currentDrag = dragStateRef.current;
      if (!currentDrag || event.pointerId !== currentDrag.pointerId) return;

      setDragState(null);

      if (!currentDrag.didMove) return;

      const currentPlanner = plannerRef.current;
      const block = currentPlanner.blocks.find((item) => item.id === currentDrag.blockId);
      if (!block || !currentDrag.candidate) {
        setInteractionMessage("Drop the block inside a planner day to move it.");
        return;
      }

      const updatedBlock = withBlockTiming(
        block,
        currentDrag.candidate.dayIndex,
        currentDrag.candidate.startMinutes,
        currentDrag.candidate.endMinutes
      );
      const blockToSave = markStudyBlockManuallyAdjusted(updatedBlock);
      const validationMessage = validateBlockPlacement(blockToSave, currentPlanner.blocks);

      if (validationMessage) {
        setInteractionMessage(validationMessage);
        return;
      }

      const nextPlanner = recordManualStudyAdjustment(
        updatePlannerBlock(currentPlanner, blockToSave),
        block,
        blockToSave
      );
      plannerRef.current = nextPlanner;
      setPlanner(nextPlanner);
      savePlannerState(nextPlanner);
      setSelectedBlockId(blockToSave.id);
      setInteractionMessage(
        `${blockToSave.title} moved to ${WEEK_DAYS[blockToSave.dayIndex]} at ${formatMinutes(blockToSave.startMinutes)}.`
      );
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  const fixedBlocks = useMemo(
    () => planner.blocks.filter((block) => block.type === "fixed"),
    [planner.blocks]
  );
  const studyBlocks = useMemo(
    () => planner.blocks.filter((block): block is StudyScheduleBlock => block.type === "study"),
    [planner.blocks]
  );
  const selectedBlock = planner.blocks.find((block) => block.id === selectedBlockId) || studyBlocks[0] || null;
  const draggedBlock = dragState ? planner.blocks.find((block) => block.id === dragState.blockId) || null : null;
  const dragPreviewBlock =
    draggedBlock && dragState?.candidate
      ? withBlockTiming(
          draggedBlock,
          dragState.candidate.dayIndex,
          dragState.candidate.startMinutes,
          dragState.candidate.endMinutes
        )
      : null;

  function persistPlanner(nextPlanner: PlannerState) {
    plannerRef.current = nextPlanner;
    setPlanner(nextPlanner);
    savePlannerState(nextPlanner);
  }

  function persistBlockUpdate(updatedBlock: PlannerBlock, successMessage: string) {
    const previousBlock = planner.blocks.find((block) => block.id === updatedBlock.id);
    const blockToSave = markStudyBlockManuallyAdjusted(updatedBlock);

    if (!blockToSave.title.trim()) {
      setInteractionMessage("Give this block a short title first.");
      return false;
    }

    if (blockToSave.type === "study" && (!blockToSave.subject.trim() || !blockToSave.topic.trim())) {
      setInteractionMessage("Study blocks need both a subject and a topic.");
      return false;
    }

    const validationMessage = validateBlockPlacement(blockToSave, planner.blocks);
    if (validationMessage) {
      setInteractionMessage(validationMessage);
      return false;
    }

    let nextPlanner = updatePlannerBlock(planner, blockToSave);
    if (previousBlock) {
      nextPlanner = recordManualStudyAdjustment(nextPlanner, previousBlock, blockToSave);
    }

    persistPlanner(nextPlanner);
    setSelectedBlockId(blockToSave.id);
    setInteractionMessage(successMessage);
    return true;
  }

  function handleUpdateStudyPreferences(nextPreferences: StudyPreferences) {
    const nextPlanner = updateStudyPreferences(planner, nextPreferences);
    persistPlanner(nextPlanner);
    setCoachMessage("Study preferences saved. Coach Me will use them for the next plan.");
  }

  function handleDeleteBlock(blockId: string) {
    const block = planner.blocks.find((item) => item.id === blockId);
    if (!block) return;

    const nextPlanner = deletePlannerBlock(planner, blockId);
    persistPlanner(nextPlanner);
    setSelectedBlockId(nextPlanner.blocks[0]?.id || null);
    setInteractionMessage(`${block.title} was removed from your planner.`);
  }

  function handleStartDrag(block: PlannerBlock, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const grabOffsetMinutes = ((event.clientY - rect.top) / HOUR_HEIGHT) * 60;

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setSelectedBlockId(block.id);
    setDragState({
      blockId: block.id,
      pointerId: event.pointerId,
      startedAtX: event.clientX,
      startedAtY: event.clientY,
      grabOffsetMinutes,
      durationMinutes: getBlockDuration(block),
      didMove: false,
      candidate: {
        dayIndex: block.dayIndex,
        startMinutes: block.startMinutes,
        endMinutes: block.endMinutes,
      },
    });
  }

  function handleAddFixedBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addFixedBlock();
  }

  function addFixedBlock() {
    const title = form.title.trim();
    const startMinutes = timeToMinutes(form.start);
    const endMinutes = timeToMinutes(form.end);

    if (!title) {
      setFormError("Add a short title for this fixed block.");
      return;
    }

    if (endMinutes <= startMinutes) {
      setFormError("End time should be after start time.");
      return;
    }

    const nextBlock = createFixedScheduleBlock({
      title,
      dayIndex: Number(form.dayIndex),
      startMinutes,
      endMinutes,
      category: form.category,
    });

    const validationMessage = validateBlockPlacement(nextBlock, planner.blocks);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const nextPlanner = {
      ...planner,
      blocks: [...fixedBlocks, nextBlock, ...studyBlocks],
      updatedAt: new Date().toISOString(),
    };

    persistPlanner(nextPlanner);
    setSelectedBlockId(nextBlock.id);
    setFormError("");
    setInteractionMessage(`${title} is ready on your planner.`);
    setCoachMessage(`${title} is now protected as fixed time.`);
  }

  function handleCoachMe() {
    console.log("Coach Me clicked");
    const latestProgress = loadProgress();
    const nextPlanner = generatePlannerWithStudyBlocks(planner, latestProgress);
    const nextStudyBlocks = nextPlanner.blocks.filter((block) => block.type === "study");

    setProgress(latestProgress);
    persistPlanner(nextPlanner);
    setSelectedBlockId(nextStudyBlocks[0]?.id || null);
    setCoachMessage(
      nextStudyBlocks.length > 0
        ? `Ka-Dunong added ${nextStudyBlocks.length} study block${nextStudyBlocks.length === 1 ? "" : "s"} around your fixed schedule.`
        : "No open study slot was found this week. Try leaving a 45-minute window free."
    );
  }

  function handleRescheduleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = reschedulePlannerFromCommand(planner, rescheduleText);

    if (!result.success) {
      setInteractionMessage(result.message);
      return;
    }

    persistPlanner(result.state);
    setSelectedBlockId(result.selectedBlockId || selectedBlockId);
    setRescheduleText("");
    setCoachMessage(result.message);
    setInteractionMessage("Your planner was updated and saved.");
  }

  return (
    <div className="min-h-screen bg-[#171111] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#171111]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="rounded-lg p-1.5 text-white/45 transition-colors hover:bg-white/5 hover:text-white"
              title="Back to chat"
            >
              <ArrowLeft size={17} />
            </Link>
            <Image src="/bird-app.png" alt="Ka-Dunong" width={34} height={34} className="object-contain" />
            <div>
              <h1 className="text-base font-bold leading-none">
                Study Planner <span className="text-[#e8b5b7]">Coach</span>
              </h1>
              <p className="mt-0.5 text-xs text-white/40">
                Weekly schedule for focused review
              </p>
            </div>
          </div>

          <button
            onClick={handleCoachMe}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c97e82] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#b66e72]"
          >
            <Sparkles size={16} />
            Coach Me
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <section className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays size={17} className="text-[#e8b5b7]" />
              <h2 className="text-sm font-bold">Fixed Schedule</h2>
            </div>

            <form onSubmit={handleAddFixedBlock} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/50">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#e8b5b7]/60"
                  placeholder="School, sleep, meals..."
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/50">Day</span>
                <select
                  value={form.dayIndex}
                  onChange={(event) => setForm((current) => ({ ...current, dayIndex: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#e8b5b7]/60"
                >
                  {WEEK_DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/50">Start</span>
                  <input
                    type="time"
                    min={minutesToTimeInput(VIEW_START_MINUTES)}
                    max={minutesToTimeInput(VIEW_END_MINUTES)}
                    step={900}
                    value={form.start}
                    onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#e8b5b7]/60"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/50">End</span>
                  <input
                    type="time"
                    min={minutesToTimeInput(VIEW_START_MINUTES)}
                    max={minutesToTimeInput(VIEW_END_MINUTES)}
                    step={900}
                    value={form.end}
                    onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#e8b5b7]/60"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/50">Category</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value as FixedCategory }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#e8b5b7]/60"
                >
                  {FIXED_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              {formError && (
                <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-100">
                  {formError}
                </p>
              )}

              <button
                type="button"
                onClick={addFixedBlock}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#3d3535] transition-colors hover:bg-[#f4dada]"
              >
                <Plus size={15} />
                Add Fixed Block
              </button>
            </form>
          </div>

          <StudyPreferencesPanel
            preferences={planner.studyPreferences}
            onUpdatePreferences={handleUpdateStudyPreferences}
          />

          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs font-semibold uppercase text-white/35">Coach status</p>
            <p className="mt-2 text-sm leading-relaxed text-white/72">{coachMessage}</p>
            <p className="mt-3 rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-xs leading-relaxed text-white/62">
              {interactionMessage}
            </p>
            <form onSubmit={handleRescheduleRequest} className="mt-3 space-y-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/50">Reschedule request</span>
                <input
                  value={rescheduleText}
                  onChange={(event) => setRescheduleText(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#9ee9db]/60"
                  placeholder="I'm busy tomorrow at 5 PM"
                />
              </label>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#83d9c7]/25 bg-[#83d9c7]/12 px-3 py-2 text-sm font-semibold text-[#d5fff7] transition-colors hover:bg-[#83d9c7]/18"
              >
                <Sparkles size={15} />
                Reschedule
              </button>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-white/[0.06] px-3 py-2">
                <p className="text-lg font-bold text-white">{fixedBlocks.length}</p>
                <p className="text-[11px] text-white/40">fixed</p>
              </div>
              <div className="rounded-lg bg-[#83d9c7]/10 px-3 py-2">
                <p className="text-lg font-bold text-[#9ee9db]">{studyBlocks.length}</p>
                <p className="text-[11px] text-[#9ee9db]/65">study</p>
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-white/10 bg-[#211818]">
          <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold">This Week</h2>
              <p className="text-xs text-white/40">
                Study planning window: {formatMinutes(PLANNING_START_MINUTES)} to {formatMinutes(PLANNING_END_MINUTES)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-[#f0be77]/30 bg-[#f0be77]/10 px-2 py-1 text-[#ffd89c]">
                Fixed
              </span>
              <span className="rounded-md border border-[#83d9c7]/30 bg-[#83d9c7]/10 px-2 py-1 text-[#9ee9db]">
                Ka-Dunong study
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1030px]">
              <div
                className="grid border-b border-white/10"
                style={{ gridTemplateColumns: "72px repeat(7, minmax(136px, 1fr))" }}
              >
                <div className="border-r border-white/10" />
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="border-r border-white/10 px-3 py-2 last:border-r-0">
                    <p className="text-xs font-semibold text-white">{day}</p>
                  </div>
                ))}
              </div>

              <div
                ref={calendarGridRef}
                className="grid"
                style={{ gridTemplateColumns: "72px repeat(7, minmax(136px, 1fr))" }}
              >
                <div className="relative border-r border-white/10" style={{ height: CALENDAR_HEIGHT }}>
                  {GRID_HOURS.slice(0, -1).map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 -translate-y-2 pr-2 text-right text-[11px] text-white/35"
                      style={{ top: index * HOUR_HEIGHT }}
                    >
                      {formatMinutes(hour)}
                    </div>
                  ))}
                </div>

                {WEEK_DAYS.map((day, dayIndex) => (
                  <DayColumn
                    key={day}
                    dayIndex={dayIndex}
                    blocks={getBlocksForDay(planner.blocks, dayIndex)}
                    dragPreviewBlock={dragPreviewBlock?.dayIndex === dayIndex ? dragPreviewBlock : null}
                    draggedBlockId={dragState?.blockId || null}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={setSelectedBlockId}
                    onStartDrag={handleStartDrag}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Info size={17} className="text-[#9ee9db]" />
            <h2 className="text-sm font-bold">Explainability</h2>
          </div>

          {selectedBlock ? (
            <BlockEditor
              block={selectedBlock}
              progress={progress}
              onUpdateBlock={persistBlockUpdate}
              onDeleteBlock={handleDeleteBlock}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 px-4 py-8 text-center">
              <Brain size={28} className="mx-auto mb-3 text-white/25" />
              <p className="text-sm font-medium text-white/75">No study plan yet</p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Add fixed time blocks, press Coach Me, then click a study block to see why it was scheduled.
              </p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function StudyPreferencesPanel({
  preferences,
  onUpdatePreferences,
}: {
  preferences: StudyPreferences;
  onUpdatePreferences: (preferences: StudyPreferences) => void;
}) {
  function updatePreferences(next: Partial<StudyPreferences>) {
    onUpdatePreferences({
      ...preferences,
      ...next,
    });
  }

  function togglePreferredDay(dayIndex: number) {
    const currentDays = new Set(preferences.preferredStudyDays);

    if (currentDays.has(dayIndex)) {
      currentDays.delete(dayIndex);
    } else {
      currentDays.add(dayIndex);
    }

    const nextDays = [...currentDays].sort((a, b) => a - b);
    if (nextDays.length === 0) return;

    updatePreferences({ preferredStudyDays: nextDays });
  }

  const learnedHabits = [
    preferences.learnedAvoidMornings ? "Evening study" : null,
    ...(preferences.softAvoidDays || []).map((dayIndex) => `Lighter ${WEEK_DAYS[dayIndex]}`),
  ].filter((habit): habit is string => Boolean(habit));

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal size={17} className="text-[#9ee9db]" />
        <h2 className="text-sm font-bold">Study Preferences</h2>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/50">Window start</span>
            <input
              type="time"
              min={minutesToTimeInput(VIEW_START_MINUTES)}
              max={minutesToTimeInput(VIEW_END_MINUTES)}
              step={900}
              value={minutesToTimeInput(preferences.preferredWindowStart)}
              onChange={(event) =>
                updatePreferences({ preferredWindowStart: timeToMinutes(event.target.value) })
              }
              className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/50">Window end</span>
            <input
              type="time"
              min={minutesToTimeInput(VIEW_START_MINUTES)}
              max={minutesToTimeInput(VIEW_END_MINUTES)}
              step={900}
              value={minutesToTimeInput(preferences.preferredWindowEnd)}
              onChange={(event) =>
                updatePreferences({ preferredWindowEnd: timeToMinutes(event.target.value) })
              }
              className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/50">Session</span>
            <select
              value={preferences.preferredSessionLength}
              onChange={(event) =>
                updatePreferences({ preferredSessionLength: Number(event.target.value) })
              }
              className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} min
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/50">Break</span>
            <select
              value={preferences.preferredBreakLength}
              onChange={(event) =>
                updatePreferences({ preferredBreakLength: Number(event.target.value) })
              }
              className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
            >
              {BREAK_LENGTH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} min
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/50">Max sessions per day</span>
          <select
            value={preferences.maxStudySessionsPerDay}
            onChange={(event) =>
              updatePreferences({ maxStudySessionsPerDay: Number(event.target.value) })
            }
            className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
          >
            {MAX_DAILY_STUDY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-2 block text-xs font-medium text-white/50">Study days</span>
          <div className="grid grid-cols-7 gap-1">
            {WEEK_DAYS.map((day, index) => {
              const isSelected = preferences.preferredStudyDays.includes(index);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => togglePreferredDay(index)}
                  className={`rounded-md border px-0 py-1.5 text-[11px] font-semibold transition-colors ${
                    isSelected
                      ? "border-[#83d9c7]/45 bg-[#83d9c7]/18 text-[#d5fff7]"
                      : "border-white/10 bg-[#211818] text-white/45 hover:text-white/70"
                  }`}
                  title={day}
                >
                  {day.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={preferences.avoidBeforeSchool}
            onChange={(event) => updatePreferences({ avoidBeforeSchool: event.target.checked })}
            className="h-4 w-4 accent-[#83d9c7]"
          />
          Avoid study before school
        </label>

        {learnedHabits.length > 0 && (
          <div className="rounded-lg border border-[#83d9c7]/20 bg-[#83d9c7]/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase text-[#9ee9db]/75">Learned habits</p>
            <p className="mt-1 text-xs leading-relaxed text-[#d5fff7]/75">{learnedHabits.join(" / ")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DayColumn({
  dayIndex,
  blocks,
  dragPreviewBlock,
  draggedBlockId,
  selectedBlockId,
  onSelectBlock,
  onStartDrag,
}: {
  dayIndex: number;
  blocks: PlannerBlock[];
  dragPreviewBlock: PlannerBlock | null;
  draggedBlockId: string | null;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onStartDrag: (block: PlannerBlock, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const visibleBlocks = blocks.filter((block) => block.id !== draggedBlockId || !dragPreviewBlock);
  const renderedBlocks =
    dragPreviewBlock?.dayIndex === dayIndex ? [...visibleBlocks, dragPreviewBlock] : visibleBlocks;

  return (
    <div className="relative border-r border-white/10 last:border-r-0" style={{ height: CALENDAR_HEIGHT }}>
      {GRID_HOURS.slice(0, -1).map((hour, index) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-white/[0.075]"
          style={{ top: index * HOUR_HEIGHT }}
        />
      ))}

      {renderedBlocks.map((block) => (
        <button
          key={block.id}
          onClick={() => onSelectBlock(block.id)}
          onPointerDown={(event) => onStartDrag(block, event)}
          className={`touch-none absolute left-1 right-1 cursor-grab overflow-hidden rounded-lg border px-2 py-1.5 text-left shadow-sm outline-none transition-colors active:cursor-grabbing focus:ring-2 focus:ring-white/35 ${
            block.type === "study"
              ? "border-[#83d9c7]/45 bg-[#17443d] text-[#d5fff7] hover:bg-[#1d524a]"
              : "border-[#f0be77]/40 bg-[#4a3520] text-[#ffe5bc] hover:bg-[#593f26]"
          } ${selectedBlockId === block.id ? "ring-2 ring-white/55" : ""} ${
            draggedBlockId === block.id ? "z-20 opacity-85" : ""
          }`}
          style={getBlockStyle(block)}
        >
          <div className="flex items-center gap-1">
            <GripVertical size={12} className="flex-shrink-0 opacity-65" />
            <p className="truncate text-xs font-bold">{block.title}</p>
          </div>
          <p className="mt-0.5 truncate text-[11px] opacity-75">
            {formatMinutes(block.startMinutes)} - {formatMinutes(block.endMinutes)}
          </p>
          <p className="mt-1 truncate text-[11px] opacity-70">
            {block.type === "study" ? `${block.subject} · ${block.activityType || "Review"}` : CATEGORY_HINTS[block.category]}
          </p>
        </button>
      ))}
    </div>
  );
}

function BlockEditor({
  block,
  progress,
  onUpdateBlock,
  onDeleteBlock,
}: {
  block: PlannerBlock;
  progress: KaDunongProgress | null;
  onUpdateBlock: (block: PlannerBlock, successMessage: string) => boolean;
  onDeleteBlock: (blockId: string) => void;
}) {
  const duration = getBlockDuration(block);
  const durationOptions = getDurationOptions(duration);

  function updateTiming(next: { dayIndex?: number; startMinutes?: number; durationMinutes?: number }) {
    const nextDayIndex = next.dayIndex ?? block.dayIndex;
    const nextStartMinutes = next.startMinutes ?? block.startMinutes;
    const nextDurationMinutes = next.durationMinutes ?? duration;
    const updatedBlock = withBlockTiming(
      block,
      nextDayIndex,
      nextStartMinutes,
      nextStartMinutes + nextDurationMinutes
    );

    onUpdateBlock(
      updatedBlock,
      `${updatedBlock.title} updated for ${WEEK_DAYS[updatedBlock.dayIndex]} at ${formatMinutes(updatedBlock.startMinutes)}.`
    );
  }

  if (block.type === "fixed") {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[#ffd89c]/70">Fixed time</p>
            <h3 className="mt-1 text-lg font-bold text-white">{block.title}</h3>
            <p className="text-sm text-white/45">
              {WEEK_DAYS[block.dayIndex]} · {formatMinutes(block.startMinutes)} - {formatMinutes(block.endMinutes)}
            </p>
          </div>
          <button
            onClick={() => onDeleteBlock(block.id)}
            className="rounded-lg border border-red-300/20 bg-red-300/10 p-2 text-red-100 transition-colors hover:bg-red-300/18"
            title="Delete block"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/50">Title</span>
            <input
              value={block.title}
              onChange={(event) =>
                onUpdateBlock({ ...block, title: event.target.value }, `${event.target.value || "Block"} renamed.`)
              }
              className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#e8b5b7]/60"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/50">Category</span>
            <select
              value={block.category}
              onChange={(event) =>
                onUpdateBlock(
                  { ...block, category: event.target.value as FixedCategory },
                  `${block.title} category updated.`
                )
              }
              className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#e8b5b7]/60"
            >
              {FIXED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <ScheduleFields block={block} durationOptions={durationOptions} onUpdateTiming={updateTiming} />
        </div>

        <div className="rounded-lg border border-[#f0be77]/25 bg-[#f0be77]/10 p-3">
          <p className="text-sm font-medium text-[#ffd89c]">{block.category}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#ffd89c]/70">
            Ka-Dunong treats this as protected time when generating study blocks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[#9ee9db]/70">Ka-Dunong study block</p>
          <h3 className="mt-1 text-lg font-bold text-white">{block.topic}</h3>
          <p className="text-sm text-white/45">
            {block.subject} · {block.activityType || "Review"}
          </p>
        </div>
        <button
          onClick={() => onDeleteBlock(block.id)}
          className="rounded-lg border border-red-300/20 bg-red-300/10 p-2 text-red-100 transition-colors hover:bg-red-300/18"
          title="Delete block"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/50">Title</span>
          <input
            value={block.title}
            onChange={(event) =>
              onUpdateBlock({ ...block, title: event.target.value }, `${event.target.value || "Block"} renamed.`)
            }
            className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/50">Subject</span>
          <input
            value={block.subject}
            onChange={(event) =>
              onUpdateBlock({ ...block, subject: event.target.value }, `${block.title} subject updated.`)
            }
            className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/50">Topic</span>
          <input
            value={block.topic}
            onChange={(event) =>
              onUpdateBlock({ ...block, topic: event.target.value }, `${block.title} topic updated.`)
            }
            className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/50">Activity</span>
          <select
            value={block.activityType || "Review"}
            onChange={(event) =>
              onUpdateBlock(
                { ...block, activityType: event.target.value as StudyActivityType },
                `${block.title} activity updated.`
              )
            }
            className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-[#9ee9db]/60"
          >
            {STUDY_ACTIVITY_TYPES.map((activityType) => (
              <option key={activityType} value={activityType}>
                {activityType}
              </option>
            ))}
          </select>
        </label>

        <ScheduleFields block={block} durationOptions={durationOptions} onUpdateTiming={updateTiming} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.06] p-3">
          <Clock size={15} className="mb-2 text-[#9ee9db]" />
          <p className="text-xs text-white/35">Duration</p>
          <p className="text-sm font-semibold">{duration} minutes</p>
        </div>
        <div className="rounded-lg bg-white/[0.06] p-3">
          <CalendarDays size={15} className="mb-2 text-[#9ee9db]" />
          <p className="text-xs text-white/35">When</p>
          <p className="text-sm font-semibold">
            {WEEK_DAYS[block.dayIndex]}, {formatMinutes(block.startMinutes)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#83d9c7]/25 bg-[#83d9c7]/10 p-3">
        <p className="text-sm font-semibold text-[#d5fff7]">Scheduled because:</p>
        <ul className="mt-2 space-y-2">
          {block.reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-sm leading-relaxed text-[#d5fff7]/78">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#83d9c7]" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {progress && progress.weakAreas.length === 0 && block.source === "starter" && (
        <p className="text-xs leading-relaxed text-white/35">
          This is a demo-friendly starter plan. Once tutoring sessions flag weak topics, Coach Me will prioritize those first.
        </p>
      )}
    </div>
  );
}

function ScheduleFields({
  block,
  durationOptions,
  onUpdateTiming,
}: {
  block: PlannerBlock;
  durationOptions: number[];
  onUpdateTiming: (next: { dayIndex?: number; startMinutes?: number; durationMinutes?: number }) => void;
}) {
  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-white/50">Day</span>
        <select
          value={block.dayIndex}
          onChange={(event) => onUpdateTiming({ dayIndex: Number(event.target.value) })}
          className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-white/35"
        >
          {WEEK_DAYS.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/50">Start</span>
          <input
            type="time"
            min={minutesToTimeInput(VIEW_START_MINUTES)}
            max={minutesToTimeInput(VIEW_END_MINUTES)}
            step={900}
            value={minutesToTimeInput(block.startMinutes)}
            onChange={(event) => onUpdateTiming({ startMinutes: timeToMinutes(event.target.value) })}
            className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-white/35"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/50">Duration</span>
          <select
            value={getBlockDuration(block)}
            onChange={(event) => onUpdateTiming({ durationMinutes: Number(event.target.value) })}
            className="w-full rounded-lg border border-white/10 bg-[#211818] px-3 py-2 text-sm text-white outline-none focus:border-white/35"
          >
            {durationOptions.map((option) => (
              <option key={option} value={option}>
                {option} min
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

function getDurationOptions(duration: number) {
  const options = new Set<number>(DURATION_OPTIONS);
  options.add(duration);
  return [...options].sort((a, b) => a - b);
}

function getDragCandidateFromPointer(
  event: PointerEvent,
  drag: DragState,
  grid: HTMLDivElement | null
): DragCandidate | null {
  if (!grid) return null;

  const rect = grid.getBoundingClientRect();
  const columnWidth = (rect.width - TIME_GUTTER_WIDTH) / WEEK_DAYS.length;
  const relativeX = event.clientX - rect.left - TIME_GUTTER_WIDTH;
  const relativeY = event.clientY - rect.top;
  const dayIndex = Math.floor(relativeX / columnWidth);

  if (dayIndex < 0 || dayIndex >= WEEK_DAYS.length) return null;

  const rawStartMinutes = VIEW_START_MINUTES + (relativeY / HOUR_HEIGHT) * 60 - drag.grabOffsetMinutes;
  const startMinutes = snapMinutes(rawStartMinutes);

  return {
    dayIndex,
    startMinutes,
    endMinutes: startMinutes + drag.durationMinutes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyBlockDetails({
  block,
  progress,
}: {
  block: PlannerBlock;
  progress: KaDunongProgress | null;
}) {
  if (block.type === "fixed") {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[#ffd89c]/70">Fixed time</p>
          <h3 className="mt-1 text-lg font-bold text-white">{block.title}</h3>
          <p className="text-sm text-white/45">
            {WEEK_DAYS[block.dayIndex]} · {formatMinutes(block.startMinutes)} - {formatMinutes(block.endMinutes)}
          </p>
        </div>
        <div className="rounded-lg border border-[#f0be77]/25 bg-[#f0be77]/10 p-3">
          <p className="text-sm font-medium text-[#ffd89c]">{block.category}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#ffd89c]/70">
            Ka-Dunong treats this as protected time when generating study blocks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-[#9ee9db]/70">Ka-Dunong study block</p>
        <h3 className="mt-1 text-lg font-bold text-white">{block.topic}</h3>
        <p className="text-sm text-white/45">{block.subject}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.06] p-3">
          <Clock size={15} className="mb-2 text-[#9ee9db]" />
          <p className="text-xs text-white/35">Duration</p>
          <p className="text-sm font-semibold">{block.durationMinutes} minutes</p>
        </div>
        <div className="rounded-lg bg-white/[0.06] p-3">
          <CalendarDays size={15} className="mb-2 text-[#9ee9db]" />
          <p className="text-xs text-white/35">When</p>
          <p className="text-sm font-semibold">
            {WEEK_DAYS[block.dayIndex]}, {formatMinutes(block.startMinutes)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#83d9c7]/25 bg-[#83d9c7]/10 p-3">
        <p className="text-sm font-semibold text-[#d5fff7]">Scheduled because:</p>
        <ul className="mt-2 space-y-2">
          {block.reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-sm leading-relaxed text-[#d5fff7]/78">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#83d9c7]" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {progress && progress.weakAreas.length === 0 && block.source === "starter" && (
        <p className="text-xs leading-relaxed text-white/35">
          This is a demo-friendly starter plan. Once tutoring sessions flag weak topics, Coach Me will prioritize those first.
        </p>
      )}
    </div>
  );
}

function getBlockStyle(block: PlannerBlock) {
  const top = ((block.startMinutes - VIEW_START_MINUTES) / 60) * HOUR_HEIGHT;
  const rawHeight = ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT;

  return {
    top: `${Math.max(0, top + 2)}px`,
    height: `${Math.max(36, rawHeight - 4)}px`,
  };
}
