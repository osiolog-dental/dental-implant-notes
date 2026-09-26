"""
The "Refer a Colleague" program: a doctor shares a personal link, a colleague
signs up through it, and once an admin reviews and approves that signup the
referring org gets a permanent storage bonus.

Deliberately not automatic — approval is a human step, so a referral link
opened by mistake (or the doctor testing their own link) never silently
grants a reward. See docs/DECISIONS.md D-017 for the reasoning and the
account-facing UI in Account.js / the admin queue in Admin.js.
"""
from __future__ import annotations

import secrets
import string
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.plans import REFERRAL_BONUS_CAP_MB, REFERRAL_BONUS_MB
from app.models.organization import Organization

_CODE_ALPHABET = string.ascii_uppercase + string.digits
_CODE_LENGTH = 8


async def get_or_create_referral_code(db: AsyncSession, org: Organization) -> str:
    """
    Returns this org's referral code, generating one on first use. A
    collision is astronomically unlikely at 8 chars from a 36-symbol
    alphabet (~2.8 trillion combinations) but is still checked for, since a
    silent collision would let two orgs share one code.
    """
    if org.referral_code:
        return org.referral_code

    for _ in range(5):
        candidate = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))
        exists = await db.execute(select(Organization.id).where(Organization.referral_code == candidate))
        if exists.scalar_one_or_none() is None:
            org.referral_code = candidate
            db.add(org)
            await db.flush()
            return candidate

    raise RuntimeError("Could not generate a unique referral code after 5 attempts")


async def find_referrer(db: AsyncSession, referral_code: str | None) -> Organization | None:
    """Looks up the org a referral code belongs to. None/unknown codes are silently ignored —
    a bad or stale code in a signup link should never block registration."""
    if not referral_code:
        return None
    result = await db.execute(select(Organization).where(Organization.referral_code == referral_code))
    return result.scalar_one_or_none()


async def approve_referral(db: AsyncSession, referred_org: Organization) -> dict:
    """
    Marks one referral approved and grants the referrer their bonus, capped.
    Returns what happened so the caller (an admin endpoint) can report it
    plainly rather than the admin having to infer it from two numbers.
    """
    if referred_org.referral_reward_status != "pending":
        return {"applied": False, "reason": "not_pending"}

    referrer = None
    if referred_org.referred_by_org_id:
        result = await db.execute(select(Organization).where(Organization.id == referred_org.referred_by_org_id))
        referrer = result.scalar_one_or_none()

    referred_org.referral_reward_status = "approved"
    db.add(referred_org)

    if referrer is None:
        # The referrer's org was deleted since this referral came in — still
        # close it out so it doesn't sit in the queue forever.
        await db.flush()
        return {"applied": False, "reason": "referrer_gone"}

    before = referrer.storage_bonus_mb
    referrer.storage_bonus_mb = min(before + REFERRAL_BONUS_MB, REFERRAL_BONUS_CAP_MB)
    db.add(referrer)
    await db.flush()

    return {
        "applied": referrer.storage_bonus_mb > before,
        "reason": "capped" if referrer.storage_bonus_mb == before else "ok",
        "referrer_org_id": str(referrer.id),
        "referrer_new_bonus_mb": referrer.storage_bonus_mb,
    }


async def reject_referral(db: AsyncSession, referred_org: Organization) -> bool:
    if referred_org.referral_reward_status != "pending":
        return False
    referred_org.referral_reward_status = "rejected"
    db.add(referred_org)
    await db.flush()
    return True
