"""
AI chat assistant service.

Ports the legacy /api/chat feature (backend/server.py) onto the modular
PostgreSQL backend. Claude can call three tools — create a patient, log an
implant, summarise a patient's history — and every tool call is scoped to the
authenticated doctor's organisation through the existing repositories, so a
chat message can never read or write another doctor's data.
"""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.repositories.fpd import FPDRepository
from app.repositories.implant import ImplantRepository
from app.repositories.patient import PatientRepository
from app.schemas.chat import ChatAction, ChatRequest, ChatResponse
from app.schemas.implant import ImplantCreate
from app.schemas.patient import PatientCreate
from app.services.audit import log_event

logger = logging.getLogger("dentalhub.chat")

CHAT_MODEL = "claude-opus-4-8"
MAX_RESPONSE_TOKENS = 1024
MAX_TOOL_ITERATIONS = 5

NOT_CONFIGURED_MESSAGE = (
    "AI chat is not configured yet. Ask your administrator to add the "
    "ANTHROPIC_API_KEY to the server environment."
)

CHAT_TOOLS = [
    {
        "name": "create_patient",
        "description": "Create a new patient record. Call this when the user asks to add or register a new patient.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name":            {"type": "string",  "description": "Full name"},
                "age":             {"type": "integer", "description": "Age in years"},
                "gender":          {"type": "string",  "enum": ["Male", "Female", "Other"]},
                "phone":           {"type": "string",  "description": "Phone number (optional)"},
                "medical_history": {"type": "string",  "description": "Medical conditions, allergies (optional)"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "log_implant",
        "description": (
            "Log a dental implant for an existing patient. Call this when the user describes "
            "placing an implant. Identify the patient by patient_id when available, otherwise by name."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_id":       {"type": "string",  "description": "Patient ID (use the context patient_id if the user is on a patient page)"},
                "patient_name":     {"type": "string",  "description": "Patient name to search when no ID is known"},
                "tooth_number":     {"type": "integer", "description": "FDI tooth number (11-48)"},
                "brand":            {"type": "string",  "description": "Implant brand e.g. Nobel, Straumann, Osstem"},
                "diameter_mm":      {"type": "number",  "description": "Diameter in mm"},
                "length_mm":        {"type": "number",  "description": "Length in mm"},
                "insertion_torque": {"type": "number",  "description": "Insertion torque in Ncm (optional)"},
                "surgery_date":     {"type": "string",  "description": "Surgery date YYYY-MM-DD; default today"},
                "surgeon_name":     {"type": "string",  "description": "Surgeon name (optional)"},
                "notes":            {"type": "string",  "description": "Clinical notes (optional)"},
            },
            "required": ["tooth_number", "brand"],
        },
    },
    {
        "name": "get_patient_summary",
        "description": (
            "Fetch a summary of a patient's record: demographics, medical history, implants and "
            "FPD (bridge) records. Call this before answering questions about a specific patient's history."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_id":   {"type": "string", "description": "Patient ID (use the context patient_id if the user is on a patient page)"},
                "patient_name": {"type": "string", "description": "Patient name to search when no ID is known"},
            },
        },
    },
]


def _parse_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


def _parse_date(value: str | None) -> date:
    if value:
        try:
            return date.fromisoformat(value)
        except ValueError:
            pass
    return date.today()


def _build_system_prompt(context_patient_id: str | None) -> str:
    prompt = (
        "You are the OSIOLOG Assistant, an AI embedded in a dental implant case management system. "
        "You help dentists quickly add patients, log implants, look up a patient's history, and answer "
        "general dental implantology questions — all by chat. "
        "Be concise and clinical. Always confirm what action you took. "
        "Answer general clinical questions directly from your own knowledge; no tool is needed for those. "
        "When logging an implant with no patient_id, pass the patient_name tool input so the system can search. "
        f"Today's date is {datetime.now().strftime('%Y-%m-%d')}."
    )
    if context_patient_id:
        prompt += f"\n\nCurrent page context: the user is viewing patient_id = {context_patient_id}."
    return prompt


class _ChatToolExecutor:
    """Executes the model's tool calls, always scoped to the current doctor's org."""

    def __init__(self, db: AsyncSession, user: User, context_patient_id: str | None) -> None:
        self.db = db
        self.user = user
        self.context_patient_id = context_patient_id
        self.patients = PatientRepository(db)
        self.implants = ImplantRepository(db)
        self.fpds = FPDRepository(db)
        self.action: ChatAction | None = None

    async def _resolve_patient(self, patient_id: str | None, patient_name: str | None):
        """Find a patient by ID or name — only within the current doctor's org."""
        pid = _parse_uuid(patient_id) or _parse_uuid(self.context_patient_id)
        if pid:
            patient = await self.patients.get(pid, self.user.org_id)
            if patient:
                return patient
        if patient_name:
            matches = await self.patients.list(self.user.org_id, search=patient_name, per_page=5)
            if matches:
                return matches[0]
        return None

    async def execute(self, tool_name: str, args: dict) -> tuple[str, bool]:
        """Run one tool call. Returns (result_text, is_error)."""
        try:
            if tool_name == "create_patient":
                return await self._create_patient(args)
            if tool_name == "log_implant":
                return await self._log_implant(args)
            if tool_name == "get_patient_summary":
                return await self._get_patient_summary(args)
            return f"Unknown tool: {tool_name}", True
        except Exception as exc:  # a tool failure must not 500 the whole chat
            logger.exception("Chat tool '%s' failed", tool_name)
            return f"The {tool_name} action failed: {exc}", True

    async def _create_patient(self, args: dict) -> tuple[str, bool]:
        name = (args.get("name") or "").strip()
        if not name:
            return "Cannot create a patient without a name.", True
        body = PatientCreate(
            name=name,
            age=args.get("age"),
            gender=args.get("gender"),
            phone=args.get("phone"),
            medical_history=args.get("medical_history"),
        )
        patient = await self.patients.create(self.user.org_id, self.user.id, body)
        await log_event(self.db, org_id=self.user.org_id, user_id=self.user.id,
                        action="create", entity_type="patient", entity_id=str(patient.id),
                        metadata={"via": "ai_chat"})
        self.action = ChatAction(type="patient_created", patient_id=str(patient.id), name=patient.name)
        return f"Patient '{patient.name}' created successfully. ID: {patient.id}", False

    async def _log_implant(self, args: dict) -> tuple[str, bool]:
        patient = await self._resolve_patient(args.get("patient_id"), args.get("patient_name"))
        if not patient:
            searched = args.get("patient_name") or args.get("patient_id") or "unknown"
            return (
                f"Could not find a patient matching '{searched}' in your records. "
                "Ask the user to confirm the name, or create the patient first."
            ), True

        tooth_number = args.get("tooth_number")
        arch = None
        jaw_region = None
        if isinstance(tooth_number, int) and 11 <= tooth_number <= 48:
            arch = "Upper" if tooth_number <= 28 else "Lower"
            jaw_region = "Anterior" if tooth_number % 10 <= 3 else "Posterior"

        body = ImplantCreate(
            patient_id=patient.id,
            case_id=None,
            tooth_number=tooth_number,
            brand=args.get("brand"),
            diameter_mm=args.get("diameter_mm"),
            length_mm=args.get("length_mm"),
            insertion_torque=args.get("insertion_torque"),
            surgery_date=_parse_date(args.get("surgery_date")),
            surgeon_name=args.get("surgeon_name"),
            clinical_notes=args.get("notes"),
            arch=arch,
            jaw_region=jaw_region,
            implant_outcome="Pending",
        )
        implant = await self.implants.create(body)
        await log_event(self.db, org_id=self.user.org_id, user_id=self.user.id,
                        action="create", entity_type="implant", entity_id=str(implant.id),
                        metadata={"via": "ai_chat"})
        self.action = ChatAction(
            type="implant_logged",
            patient_id=str(patient.id),
            name=patient.name,
            implant_id=str(implant.id),
            tooth=tooth_number if isinstance(tooth_number, int) else None,
        )
        size = ""
        if args.get("diameter_mm") and args.get("length_mm"):
            size = f" {args['diameter_mm']}×{args['length_mm']}mm"
        return (
            f"Implant logged: tooth {tooth_number},{size} {args.get('brand')} "
            f"for patient {patient.name} on {body.surgery_date.isoformat()}."
        ), False

    async def _get_patient_summary(self, args: dict) -> tuple[str, bool]:
        patient = await self._resolve_patient(args.get("patient_id"), args.get("patient_name"))
        if not patient:
            return "Patient not found in your records.", True

        implants = await self.implants.list_by_patient(patient.id, self.user.org_id)
        fpds = await self.fpds.list_by_patient(patient.id, self.user.org_id)

        lines = [f"Patient: {patient.name}, {patient.age or '?'}y {patient.gender or ''}".rstrip()]
        if patient.medical_history:
            lines.append(f"Medical history: {patient.medical_history}")
        lines.append(f"Implants: {len(implants)}")
        for imp in implants:
            size = ""
            if imp.diameter_mm and imp.length_mm:
                size = f" {imp.diameter_mm}×{imp.length_mm}mm"
            lines.append(
                f"  • Tooth {imp.tooth_number or '?'} — {imp.brand or 'unknown brand'}{size}, "
                f"placed {imp.surgery_date.isoformat() if imp.surgery_date else 'date unknown'}, "
                f"stage {imp.current_stage}, outcome: {imp.implant_outcome or 'Pending'}"
            )
        if fpds:
            lines.append(f"FPD (bridge) records: {len(fpds)}")
            for fpd in fpds:
                teeth = ", ".join(str(t) for t in (fpd.tooth_numbers or []))
                lines.append(f"  • Teeth [{teeth}] — {fpd.material or fpd.crown_material or 'material unknown'}")
        return "\n".join(lines), False


async def run_chat(db: AsyncSession, user: User, req: ChatRequest) -> ChatResponse:
    """Run one chat turn: send history to Claude, execute any tool calls, return the reply."""
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return ChatResponse(content=NOT_CONFIGURED_MESSAGE)

    try:
        import anthropic
    except ImportError:
        logger.error("ANTHROPIC_API_KEY is set but the 'anthropic' package is not installed")
        return ChatResponse(content=NOT_CONFIGURED_MESSAGE)

    # Drop the frontend's leading assistant greeting — the API requires the
    # first message to be from the user.
    history = [{"role": m.role, "content": m.content} for m in req.messages]
    while history and history[0]["role"] != "user":
        history.pop(0)
    if not history:
        raise HTTPException(status_code=422, detail="Conversation must contain at least one user message")

    system_prompt = _build_system_prompt(req.patient_id)
    executor = _ChatToolExecutor(db, user, req.patient_id)

    messages: list = list(history)
    reply_text = ""

    try:
        async with anthropic.AsyncAnthropic(api_key=api_key) as client:
            for _ in range(MAX_TOOL_ITERATIONS):
                response = await client.messages.create(
                    model=CHAT_MODEL,
                    max_tokens=MAX_RESPONSE_TOKENS,
                    system=system_prompt,
                    tools=CHAT_TOOLS,
                    messages=messages,
                )

                reply_text = next((b.text for b in response.content if b.type == "text"), reply_text)

                if response.stop_reason == "refusal":
                    reply_text = reply_text or "I can't help with that request."
                    break

                if response.stop_reason != "tool_use":
                    break

                tool_blocks = [b for b in response.content if b.type == "tool_use"]
                if not tool_blocks:
                    break

                # Execute every requested tool and return all results in one user turn.
                tool_results = []
                for block in tool_blocks:
                    result_text, is_error = await executor.execute(block.name, dict(block.input))
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_text,
                        "is_error": is_error,
                    })
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
            else:
                # Tool-loop cap reached — return whatever the model said last.
                reply_text = reply_text or "I ran out of steps while working on that. Please try a simpler request."
    except anthropic.AuthenticationError:
        logger.error("Anthropic authentication failed — check ANTHROPIC_API_KEY")
        raise HTTPException(status_code=502, detail="AI chat is misconfigured on the server (invalid API key).")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="The AI assistant is busy right now. Please try again in a minute.")
    except anthropic.APIConnectionError:
        raise HTTPException(status_code=502, detail="Could not reach the AI service. Please try again.")
    except anthropic.APIStatusError as exc:
        logger.error("Anthropic API error %s: %s", exc.status_code, exc.message)
        raise HTTPException(status_code=502, detail="The AI service returned an error. Please try again.")

    return ChatResponse(content=reply_text or "Done.", action=executor.action)
