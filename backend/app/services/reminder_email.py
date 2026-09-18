"""
Composes and sends the daily reminder digest to a doctor.

Rows are grouped one-per-patient, matching the header bell and the Dashboard —
a patient with eleven implants due for second stage is one line listing eleven
teeth, not eleven lines. The grouping rule is deliberately identical to
`frontend/src/lib/reminderGroups.js`; the two are separate only because one is
Python and the other JavaScript.
"""
from __future__ import annotations

import logging

from app.services import email as email_service

logger = logging.getLogger("osiolog.reminder_email")

APP_URL = "https://osiolog.com"


def group_by_patient(items: list[dict], teeth_of, rank) -> list[dict]:
    """
    Collapse a due-feed into one entry per patient.

    `rank` returns an urgency where lower is more urgent; a group takes its most
    urgent member, which is the only choice that cannot hide an overdue tooth
    behind a comfortable one. Mirrors reminderGroups.js on the frontend.
    """
    groups: dict[str, dict] = {}
    for item in items:
        pid = item["patient_id"]
        g = groups.get(pid)
        if g is None:
            g = {
                "patient_name": item["patient_name"],
                "teeth": [],
                "count": 0,
                "urgency": None,
                "lead": item,
            }
            groups[pid] = g

        teeth = [t for t in teeth_of(item) if t is not None]
        g["teeth"].extend(teeth)
        # Count teeth where known, else the record, so a missing tooth number
        # never reads as zero.
        g["count"] += len(teeth) or 1

        r = rank(item)
        if g["urgency"] is None or r < g["urgency"]:
            g["urgency"] = r
            g["lead"] = item

    return sorted(groups.values(), key=lambda g: g["urgency"])


def _teeth(group: dict) -> str:
    """"tooth 14" for one, "teeth 14, 13" for several."""
    teeth = group["teeth"]
    if not teeth:
        return "tooth not recorded"
    word = "tooth" if len(teeth) == 1 else "teeth"
    return f"{word} " + ", ".join(str(t) for t in teeth)


def _follow_up_timing(days: int) -> str:
    if days < 0:
        late = abs(days)
        return f"overdue by {late} day{'s' if late > 1 else ''}"
    if days == 0:
        return "due today"
    return f"due in {days} day{'s' if days > 1 else ''}"


def _section(heading: str, lines: list[str]) -> list[str]:
    if not lines:
        return []
    out = [f"{heading} ({len(lines)})", ""]
    out.extend(f"  - {line}" for line in lines)
    out.append("")
    return out


def compose(name: str | None, follow_ups: list[dict], second_stage: list[dict],
            extractions: list[dict]) -> tuple[str, str]:
    """Return (subject, body) for the digest. Kept pure so it can be tested without sending."""
    who = email_service._honorific(name)

    fu_groups = group_by_patient(follow_ups, lambda i: [i["tooth_number"]], lambda i: i["days_until"])
    ss_groups = group_by_patient(second_stage, lambda i: [i["tooth_number"]], lambda i: -i["days_elapsed"])
    ex_groups = group_by_patient(extractions, lambda i: i["tooth_numbers"], lambda i: -i["days_elapsed"])

    total = len(fu_groups) + len(ss_groups) + len(ex_groups)
    subject = (
        "Osiolog: 1 patient needs attention"
        if total == 1
        else f"Osiolog: {total} patients need attention"
    )

    lines: list[str] = [f"Hi {who},", "", "Here is what is due today.", ""]

    lines += _section("IMPLANT FOLLOW-UPS", [
        f"{g['patient_name']} - {_teeth(g)} - {_follow_up_timing(g['urgency'])}"
        for g in fu_groups
    ])

    lines += _section("READY FOR SECOND STAGE", [
        f"{g['patient_name']} - {_teeth(g)} - day {-g['urgency']}"
        f" of {g['lead']['osseointegration_days']}"
        for g in ss_groups
    ])

    lines += _section("READY FOR IMPLANT PLACEMENT", [
        f"{g['patient_name']} - {_teeth(g)} - day {-g['urgency']}"
        f" of {g['lead']['reminder_days']}"
        for g in ex_groups
    ])

    lines += [
        f"Open Osiolog to see the full record: {APP_URL}",
        "",
        "To stop these emails, turn off reminder emails in Account settings.",
        "",
        "- Osiolog",
        "",
    ]

    return subject, "\n".join(lines)


def send_digest(to_email: str, name: str | None, follow_ups: list[dict],
                second_stage: list[dict], extractions: list[dict]) -> bool:
    """
    Send one doctor's digest. Returns False and logs on failure — a failed send
    must never stop the job from reaching the remaining doctors.
    """
    if not (follow_ups or second_stage or extractions):
        return False

    subject, body = compose(name, follow_ups, second_stage, extractions)
    sent = email_service.send_email(
        to_email, subject, body, reply_to=email_service.CONTACT_RECIPIENT
    )
    if sent:
        logger.info("Reminder digest sent to %s", to_email)
    else:
        logger.error("Reminder digest FAILED for %s", to_email)
    return sent
