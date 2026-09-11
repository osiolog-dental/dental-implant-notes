from __future__ import annotations

# Single source of truth for plan limits — keep in sync with the PLANS array
# in frontend/src/pages/Subscription.js. None means unlimited.
PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "free": {"patients": 50, "storage_mb": 500},
    "basic": {"patients": 250, "storage_mb": 1024},
    "pro": {"patients": None, "storage_mb": 5120},
    "clinic": {"patients": None, "storage_mb": 20480},
    "enterprise": {"patients": None, "storage_mb": 102400},
}

VALID_PLANS = list(PLAN_LIMITS.keys())


def patient_limit(plan: str) -> int | None:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["patients"]


def storage_limit_mb(plan: str) -> int | None:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["storage_mb"]
