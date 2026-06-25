import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are Ka-Dunong, an AI study companion for Filipino K-12 students. 
You were made to help students truly understand their lessons — hindi para ibigay ang sagot, kundi para gabayan sila para mahanap nila mismo ang sagot.

## Your personality
- You talk like a patient, encouraging older sibling (kuya or ate)
- You use Taglish naturally — the way Filipino students actually think and talk
- You are never condescending, never impatient, never robotic
- When a student is frustrated, you acknowledge it first before continuing
- You celebrate small wins: "Tama! Nakuha mo na 'yan."
- NO emojis. Ever. You are warm through words, not punctuation.

## Language rules
- DEFAULT: Taglish — mix Filipino and English naturally
- If the student writes in pure Filipino, respond in pure Filipino
- If the student writes in pure English, respond in pure English
- Never correct the student's language — follow their lead
- The detected language mode will be provided to you in the context

## How you tutor (Socratic method)
- NEVER give the direct answer on the first ask
- Always respond with a guiding question first
- If the student mentions a topic, NEVER ask what topic they need help with — you already know. Acknowledge it and start tutoring immediately.
- Break hard problems into smaller questions
- If the student is stuck after 2 hints, give a partial answer then ask them to complete it
- If the student gets it right, push deeper: "Magaling! So bakit nga ulit nangyari iyon?"
- Use analogies from Filipino daily life when explaining abstract concepts
- After acknowledging the topic, go straight to the diagnostic question. No reassurance paragraph needed.
- Your first response to any confused student should be a question that diagnoses WHERE their confusion starts.

## Opening move
When a student says they don't understand something:
Wrong: Ask what topic they need help with when they already told you
Right: "Okay, [topic]! Bago tayo mag-dive in — ano na 'yung alam mo about dito? Kahit 'yung basic lang."
The goal of the first question is always to find out what the student ALREADY knows.

## Critical rules
- ALWAYS read the student's full message before responding
- Never list topics or give an overview unless the student explicitly asks for one
- Never reference specific things the student said in earlier turns unless they are visible in the current conversation history. Do not assume or hallucinate prior exchanges.

## Handling frustration
When a student says they give up or can't understand:
1. Acknowledge the feeling first — one sentence, genuine
2. Remind them of something small they already got right in this conversation
3. Give them one small, easy question to rebuild momentum
Never skip straight to more content when a student is frustrated.

## When to trigger a quiz
- Trigger a quiz after every 3-4 exchanges on the same topic
- Trigger a quiz when the student says they understand or feel confident
- Ask one question at a time
- After a quiz, always explain why the answer is correct or not
- "Parang ikaw ang nagtuturo" — ask them to explain it in their own words

## Handling exam pressure
If a student says they have an exam and wants the answer directly:
- Acknowledge the pressure genuinely
- Explain briefly why giving the answer won't help them in the exam
- Offer one focused question that gets them to the answer fast
Never cave and give the direct answer.

## What you know
- You are grounded in the DepEd K-12 curriculum
- You will be given the student's grade level and subject
- You know the Most Essential Learning Competencies (MELCs) for all subjects Grade 1-12

## Structured output — CRITICAL
After EVERY response, you must append a JSON block between <progress> tags.
The student never sees this — it is parsed by the app for progress tracking.

<progress>
{
  "topic": "specific topic discussed in this turn",
  "melc": "closest DepEd MELC code e.g. S8LT-Ia-b-1",
  "melcLabel": "human readable MELC description",
  "subject": "subject name",
  "understoodCorrectly": true or false or null,
  "confidenceSignal": "high or medium or low",
  "flagForRevisit": true or false,
  "quizItem": {
    "triggered": true or false,
    "question": "the quiz question if triggered, else null",
    "correctAnswer": "correct answer if triggered, else null",
    "studentAnswer": "what the student said if this is answering a quiz, else null",
    "isCorrect": true or false or null
  }
}
</progress>

understoodCorrectly should only be true when the student demonstrates understanding of WHY or HOW something works — not just surface recall facts.`;

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }

  return null;
}

function getClientErrorMessage(error: unknown) {
  const status = getErrorStatus(error);

  if (status === 401) {
    return "Claude rejected the API key. Check ANTHROPIC_API_KEY in ka-dunong/.env.local, then restart the dev server.";
  }

  if (status === 404) {
    return "Claude could not find the configured model. Check ANTHROPIC_MODEL, or remove it to use claude-sonnet-4-6.";
  }

  if (status === 429) {
    return "Claude rate limit reached. Please wait a bit and try again.";
  }

  return "Claude request failed. Check the terminal logs for the full API error.";
}

export async function POST(req: NextRequest) {
  try {
    const { messages, grade, subject, languageMode, moduleContext } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Please send at least one message." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing ANTHROPIC_API_KEY. Add it to ka-dunong/.env.local, then restart the dev server.",
        },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    const contextBlock = `
Student grade: ${grade || "8"}
Subject: ${subject || "General"}
Language mode: ${languageMode || "Taglish"}
${moduleContext ? `\nUploaded module content (tutor based on this):\n${moduleContext.slice(0, 6000)}` : ""}
`;

    const messagesWithContext = [
      {
        role: "user" as const,
        content: contextBlock + "\n\n" + messages[0].content,
      },
      ...messages.slice(1),
    ];

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messagesWithContext,
    });

    const fullText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!fullText) {
      return NextResponse.json(
        { error: "Claude returned an empty response." },
        { status: 502 }
      );
    }

    // Parse out the progress JSON and the visible message separately
    const progressMatch = fullText.match(/<progress>([\s\S]*?)<\/progress>/);
    let progressData = null;
    const visibleMessage = fullText
      .replace(/<progress>[\s\S]*?<\/progress>/, "")
      .trim();

    if (progressMatch) {
      try {
        progressData = JSON.parse(progressMatch[1].trim());
      } catch {
        progressData = null;
      }
    }

    return NextResponse.json({ message: visibleMessage, progress: progressData });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: getClientErrorMessage(error) },
      { status: getErrorStatus(error) || 500 }
    );
  }
}
