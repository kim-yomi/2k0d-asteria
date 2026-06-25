"""Practice generator: produces flashcards and quizzes via Claude."""

from __future__ import annotations

import json
import re

import anthropic

from app.config import Settings

FLASHCARD_PROMPT = """You are Ka-Dunong, a Filipino K-12 AI study companion.

Generate {count} flashcard pairs for the topic: "{topic}"
Subject: {subject} | Grade: {grade} | Language: {language}

Rules:
- Terms should be key vocabulary, concepts, people, events, or formulas from the topic
- Definitions must be clear, student-friendly, and accurate to the DepEd K-12 curriculum
- Write in {language} naturally (Taglish means mix Filipino and English the way Filipino students speak)
- Do NOT number the items
- Keep definitions to 1-2 sentences maximum

Return ONLY a valid JSON array, no other text:
[
  {{"term": "...", "definition": "..."}},
  ...
]

Context from DepEd materials (use if relevant):
{context}
"""

QUIZ_PROMPT = """You are Ka-Dunong, a Filipino K-12 AI study companion.

Generate {count} quiz questions for the topic: "{topic}"
Subject: {subject} | Grade: {grade} | Language: {language}

Mix of question types:
- About half should be multiple choice (4 options, one correct)
- About half should be open-ended (short answer, 1-2 sentences expected)

Rules:
- Questions must test understanding of WHY and HOW, not just recall
- Use Taglish naturally if language is Taglish
- Multiple choice distractors should be plausible, not obviously wrong
- Open-ended questions should have a clear, checkable correct answer
- Align to DepEd K-12 curriculum

Return ONLY a valid JSON array, no other text:
[
  {{
    "type": "multiple_choice",
    "question": "...",
    "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "A",
    "explanation": "Brief Taglish explanation of why this is correct"
  }},
  {{
    "type": "open_ended",
    "question": "...",
    "correct_answer": "Model answer in 1-2 sentences",
    "explanation": "What a good answer should cover"
  }},
  ...
]

Context from DepEd materials (use if relevant):
{context}
"""

EVALUATE_PROMPT = """You are Ka-Dunong evaluating a student's open-ended quiz answer.

Question: {question}
Expected answer: {correct_answer}
What to look for: {explanation}
Student answered: {student_answer}

Evaluate strictly but fairly. The student must show understanding of the key concept, not just copy keywords.

Return ONLY valid JSON, no other text:
{{
  "is_correct": true or false,
  "score": 0 to 1 (partial credit allowed, e.g. 0.5),
  "feedback": "1-2 sentence Taglish feedback — acknowledge what they got right, gently point out what's missing"
}}
"""


class PracticeGenerator:
    def __init__(self, settings: Settings):
        if not settings.anthropic_api_key:
            raise ValueError("Missing ANTHROPIC_API_KEY")
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.anthropic_model

    def _call(self, prompt: str) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return "\n".join(
            block.text
            for block in response.content
            if getattr(block, "type", None) == "text"
        ).strip()

    def _parse_json(self, raw: str) -> list | dict:
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned.strip())
        return json.loads(cleaned)

    def generate_flashcards(
        self,
        topic: str,
        subject: str,
        grade: str,
        language: str,
        count: int = 10,
        context: str = "",
    ) -> list[dict]:
        prompt = FLASHCARD_PROMPT.format(
            topic=topic,
            subject=subject,
            grade=grade,
            language=language,
            count=count,
            context=context or "No specific material provided. Use curriculum knowledge.",
        )
        raw = self._call(prompt)
        cards = self._parse_json(raw)
        if not isinstance(cards, list):
            raise ValueError("Expected a JSON array of flashcards")
        return [
            {"term": c.get("term", ""), "definition": c.get("definition", "")}
            for c in cards
        ]

    def generate_quiz(
        self,
        topic: str,
        subject: str,
        grade: str,
        language: str,
        count: int = 6,
        context: str = "",
    ) -> list[dict]:
        prompt = QUIZ_PROMPT.format(
            topic=topic,
            subject=subject,
            grade=grade,
            language=language,
            count=count,
            context=context or "No specific material provided. Use curriculum knowledge.",
        )
        raw = self._call(prompt)
        questions = self._parse_json(raw)
        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array of questions")
        return questions

    def evaluate_open_ended(
        self,
        question: str,
        correct_answer: str,
        explanation: str,
        student_answer: str,
    ) -> dict:
        prompt = EVALUATE_PROMPT.format(
            question=question,
            correct_answer=correct_answer,
            explanation=explanation,
            student_answer=student_answer,
        )
        raw = self._call(prompt)
        result = self._parse_json(raw)
        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object for evaluation")
        return result