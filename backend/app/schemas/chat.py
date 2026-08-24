from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Sanity caps — reject absurdly large payloads with a 422 before they reach the AI.
MAX_MESSAGES = 40
MAX_MESSAGE_CHARS = 4000


class ChatMessageIn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessageIn] = Field(min_length=1, max_length=MAX_MESSAGES)
    # Context: which patient page the user is currently viewing (optional).
    patient_id: str | None = None


class ChatAction(BaseModel):
    type: Literal["patient_created", "implant_logged"]
    patient_id: str
    name: str | None = None
    implant_id: str | None = None
    tooth: int | None = None


class ChatResponse(BaseModel):
    role: Literal["assistant"] = "assistant"
    content: str
    action: ChatAction | None = None
