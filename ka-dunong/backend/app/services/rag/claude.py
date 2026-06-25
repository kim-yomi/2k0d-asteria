import json
import re

import anthropic

from app.config import Settings
from app.models import ChatResponse, Source
from app.services.rag.prompt import KA_DUNONG_SYSTEM_PROMPT


class ClaudeClient:
    def __init__(self, settings: Settings):
        if not settings.anthropic_api_key:
            raise ValueError("Missing ANTHROPIC_API_KEY for Claude requests.")
        self.model = settings.anthropic_model
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def complete(self, prompt: str, sources: list[Source]) -> ChatResponse:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=KA_DUNONG_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        full_text = "\n".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ).strip()

        if not full_text:
            raise ValueError("Claude returned an empty response.")

        progress = None
        match = re.search(r"<progress>([\s\S]*?)</progress>", full_text)
        if match:
            try:
                progress = json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                progress = None

        visible_message = re.sub(r"<progress>[\s\S]*?</progress>", "", full_text).strip()
        return ChatResponse(message=visible_message, progress=progress, sources=sources)
