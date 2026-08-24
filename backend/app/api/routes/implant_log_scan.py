from __future__ import annotations

import base64
import json
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

router = APIRouter(tags=["implant-log-scan"])
logger = logging.getLogger("dentalhub.implant_log_scan")

# Keep in sync with app/services/chat.py CHAT_MODEL
_VISION_MODEL = "claude-opus-4-8"

# Field labels/options here MUST match frontend/src/pages/PrintImplantLogSheet.js
_EXTRACTION_PROMPT = """
You are reading a photo of a handwritten dental "Patient & Implant Log" sheet.
Two handwriting styles are used on this sheet:
- Free-text fields (name, phone, email, address, clinic, surgeon, brand, notes, and the
  medication name on the Medical History line) are written as one CAPITAL LETTER or digit
  per square box, boxes placed side by side in a row. A box left blank represents a space
  between words. Read each row of boxes left to right and join the letters (ignoring
  trailing blank boxes) into one string.
- Multiple-choice fields are a row of small square tick-boxes, one per option, each next
  to its printed label. The doctor marks the box for their choice with a tick or an X —
  an empty/unmarked box means that option was NOT chosen.

The sheet has two parts:

1. A Patient section with letter-boxes or tick-boxes next to these printed labels:
   Patient Name, Age, Gender (tick-box: Male/Female/Other), Phone, Email, Address,
   Medical History (tick-boxes: Allergy / Cardiac / Liver / Kidney / Thyroid / BP /
   Diabetic / On Medication — "On Medication" is followed by letter-boxes for the
   medication name), Clinic Name, Surgeon.

2. An Implant Log table with up to 6 rows, one implant per row (no row-number column —
   just count table rows top to bottom). Each row has:
   - Tooth # (2 digit-boxes, FDI tooth number)
   - Brand (handwritten, blank cell)
   - Width (mm) (handwritten number, blank cell — this is diameter_mm)
   - Length (mm) (handwritten number, blank cell — this is length_mm)
   - Connection (tick-box: IH=Internal Hex / EH=External Hex / Con=Conical / MT=Morse Taper)
   - Approach (tick-box: Imm=Immediate Placement / Del=Delayed Placement)
   - Arch (tick-box: U=Upper / L=Lower)
   - Region (tick-box: Ant=Anterior / Post=Posterior)
   - Surgery Date (8 digit-boxes: D D M M Y Y Y Y)
   - CS = Cover Screw (tick-box: Y/N)
   - HA = Healing Abutment (tick-box: Y/N)

   This sheet has no Type, Torque, or Notes fields — always set implant_type,
   insertion_torque, and notes to null for every implant row (the doctor fills
   these in later on the review screen).

Read the photo and return ONLY a JSON object (no markdown fences, no commentary) with this exact shape:

{
  "patient": {
    "name": string or null, "age": integer or null, "gender": "Male"|"Female"|"Other"|null,
    "phone": string or null, "email": string or null, "address": string or null,
    "medical_history": string or null, "clinic_name": string or null, "surgeon_name": string or null
  },
  "implants": [
    {
      "tooth_number": integer or null, "implant_type": "Single"|"Bridge"|"Full Mouth"|null,
      "brand": string or null, "diameter_mm": number or null, "length_mm": number or null,
      "insertion_torque": number or null,
      "connection_type": "Internal Hex"|"External Hex"|"Conical"|"Morse Taper"|null,
      "surgical_approach": "Immediate Placement"|"Delayed Placement"|null,
      "arch": "Upper"|"Lower"|null, "jaw_region": "Anterior"|"Posterior"|null,
      "surgery_date": "YYYY-MM-DD" or null, "cover_screw": true|false|null,
      "healing_abutment": true|false|null, "notes": string or null
    }
  ],
  "warnings": [string, ...]
}

Rules:
- Only include a row in "implants" if Tooth # was filled in on that row. Skip fully blank rows.
- If a field is blank, illegible, or you are not confident, set it to null and add a short note to
  "warnings" describing which field on which row/section is uncertain — never guess.
- Convert dates to YYYY-MM-DD. If the year is written as 2 digits, assume 20XX.
- For "medical_history", build one comma-separated string from every ticked condition
  (e.g. "Allergy, Diabetic"). If "On Medication" is ticked, append "; On medication: "
  followed by the handwritten medication name (or "unspecified" if that box was ticked
  but left blank). If no boxes are ticked at all, set "medical_history" to null.
- Return ONLY the JSON object, nothing else.
"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


@router.post("/implant-log-scan")
async def scan_implant_log_photos(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Reads photos of the printed Patient & Implant Log sheet via Claude vision and
    returns extracted draft data. Nothing is saved here — the frontend shows the
    doctor an editable review screen and only saves what they confirm.
    """
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Photo scanning is not configured yet. Ask your administrator to add ANTHROPIC_API_KEY.",
        )

    try:
        import anthropic
    except ImportError:
        raise HTTPException(status_code=503, detail="Photo scanning is not available on this server.")

    results = []
    async with anthropic.AsyncAnthropic(api_key=api_key) as client:
        for upload in files:
            file_result = {
                "filename": upload.filename,
                "patient": None,
                "implants": [],
                "warnings": [],
                "errors": [],
            }
            try:
                content = await upload.read()
                media_type = upload.content_type or "image/jpeg"
                if media_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
                    media_type = "image/jpeg"
                b64 = base64.b64encode(content).decode("ascii")

                response = await client.messages.create(
                    model=_VISION_MODEL,
                    max_tokens=2048,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                            {"type": "text", "text": _EXTRACTION_PROMPT},
                        ],
                    }],
                )
                text = next((b.text for b in response.content if b.type == "text"), "")
                parsed = _extract_json(text)
                file_result["patient"] = parsed.get("patient") or {}
                file_result["implants"] = parsed.get("implants") or []
                file_result["warnings"] = parsed.get("warnings") or []
            except json.JSONDecodeError:
                file_result["errors"].append(
                    "Could not read a structured result from this photo — try retaking it with better lighting/focus."
                )
            except anthropic.AuthenticationError:
                file_result["errors"].append("AI service is misconfigured on the server (invalid API key).")
            except anthropic.RateLimitError:
                file_result["errors"].append("AI service is busy right now — try again in a minute.")
            except Exception as exc:  # a bad photo must not fail the whole batch
                logger.exception("Failed to scan implant log photo %s", upload.filename)
                file_result["errors"].append(f"Could not process this photo: {exc}")
            results.append(file_result)

    return {"results": results}
