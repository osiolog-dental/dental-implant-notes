from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.case import CaseRepository

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Returns counts for the dashboard header cards:
    - total_patients
    - active_cases
    - cases_this_month
    - upcoming_followups (implants with follow_up_date within 14 days)
    """
    repo = CaseRepository(db)
    return await repo.dashboard_summary(current_user.org_id)
