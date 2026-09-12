from __future__ import annotations

# Single source of truth for plan limits — keep in sync with the PLANS array
# in frontend/src/pages/Subscription.js. None means unlimited.
# "clinics" is the base number of clinics an org on that plan can register —
# orgs on basic/pro/clinic can raise this with a paid add-on
# (Organization.extra_clinics, set manually by admin for now — see
# CLINIC_ADDON_OPTIONS). Enterprise is always unlimited so has no add-on.
PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "free": {"patients": 50, "storage_mb": 100, "clinics": 1},
    "basic": {"patients": 250, "storage_mb": 1024, "clinics": 1},
    "pro": {"patients": None, "storage_mb": 5120, "clinics": 1},
    "clinic": {"patients": None, "storage_mb": 20480, "clinics": 5},
    "enterprise": {"patients": None, "storage_mb": 102400, "clinics": None},
}

VALID_PLANS = list(PLAN_LIMITS.keys())

# Clinic add-on tiers available to basic/pro/clinic plans — each entry adds
# `clinics` extra slots on top of the plan's base clinics limit, for
# `price_inr`/month. Admin applies the chosen total manually via the Admin
# panel's Extra Clinics field, same interim pattern as plan changes.
CLINIC_ADDON_OPTIONS = [
    {"clinics": 5, "price_inr": 5},
    {"clinics": 10, "price_inr": 10},
]

PLANS_WITH_CLINIC_ADDON = {"basic", "pro", "clinic"}


def patient_limit(plan: str) -> int | None:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["patients"]


def storage_limit_mb(plan: str) -> int | None:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["storage_mb"]


def base_clinic_limit(plan: str) -> int | None:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["clinics"]


def clinic_limit(plan: str, extra_clinics: int = 0) -> int | None:
    """None means unlimited (enterprise only) — extra_clinics never applies there."""
    base = base_clinic_limit(plan)
    if base is None:
        return None
    return base + extra_clinics
