from __future__ import annotations

import logging
import re
import urllib.parse
import uuid

import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.clinic import ClinicRepository
from app.schemas.clinic import ClinicCreate, ClinicRead, ClinicUpdate, ResolveMapsLinkRequest, ResolveMapsLinkResponse

logger = logging.getLogger("dentalhub.clinics")

router = APIRouter(prefix="/clinics", tags=["clinics"])

# Matches the lat/lng Google embeds in a maps.google.com URL's own path,
# e.g. ".../@17.6868,83.2185,15z/..." — no API key needed for this part.
_LATLNG_RE = re.compile(r"@(-?\d+\.\d+),(-?\d+\.\d+)")


def _extract_place_name(url: str) -> str | None:
    """Pulls the business name out of a Maps URL's own /place/<name>/ segment."""
    match = re.search(r"/place/([^/@]+)", url)
    if not match:
        return None
    return urllib.parse.unquote(match.group(1)).replace("+", " ").strip() or None


def _extract_name_from_search_query(url: str) -> str | None:
    """
    Newer share.google links redirect to a plain google.com/search results
    page (no /place/ segment at all) with the business name in the ?q=
    parameter, e.g. "MOHAN DENTAL CLINIC (మోహన్ ...)" —
    take the part before any parenthetical translation/alt-name.
    """
    parsed = urllib.parse.urlparse(url)
    if "google." not in parsed.netloc or parsed.path not in ("/search", "/maps"):
        return None
    q = urllib.parse.parse_qs(parsed.query).get("q", [None])[0]
    if not q:
        return None
    return q.split("(")[0].strip() or None


@router.post("/resolve-maps-link", response_model=ResolveMapsLinkResponse)
async def resolve_maps_link(
    body: ResolveMapsLinkRequest,
    current_user: User = Depends(get_current_user),
) -> ResolveMapsLinkResponse:
    """
    Reads a pasted Google Maps link and pulls out whatever it already
    encodes — the place name and coordinates from the URL itself (works for
    both full and shortened maps.app.goo.gl links, since a plain server-side
    request follows the redirect) — then reverse-geocodes those coordinates
    into a postal address via OpenStreetMap's free Nominatim service. This
    doesn't call Google's own (paid) Places API, so results can differ
    slightly from Google's own formatting, but no API key or billing setup
    is needed.
    """
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Paste a Google Maps link first")

    try:
        resp = requests.get(url, timeout=10, allow_redirects=True, headers={"User-Agent": "Osiolog/1.0"})
        resolved_url = resp.url
    except Exception as exc:
        logger.warning("Could not resolve maps link %s: %s", url, exc)
        raise HTTPException(status_code=422, detail="Could not open that link — check it's a valid Google Maps link")

    name = _extract_place_name(resolved_url) or _extract_name_from_search_query(resolved_url)
    latlng_match = _LATLNG_RE.search(resolved_url)
    latitude = float(latlng_match.group(1)) if latlng_match else None
    longitude = float(latlng_match.group(2)) if latlng_match else None

    address = None
    if latitude is not None and longitude is not None:
        try:
            geo_resp = requests.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": latitude, "lon": longitude, "format": "jsonv2"},
                headers={"User-Agent": "Osiolog/1.0 (dental clinic management app)"},
                timeout=10,
            )
            if geo_resp.status_code == 200:
                address = geo_resp.json().get("display_name")
        except Exception as exc:
            logger.warning("Reverse geocoding failed for %s,%s: %s", latitude, longitude, exc)
    elif name:
        # Newer share.google links carry no coordinates at all, only the
        # business name — forward-geocode it to fill in address/lat/lng.
        # Bias the free-text search with the doctor's own registered country
        # (most clinics they add are in the same country) since a bare
        # clinic name alone is often ambiguous worldwide.
        query = f"{name}, {current_user.country}" if current_user.country else name
        try:
            geo_resp = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "jsonv2", "limit": 1},
                headers={"User-Agent": "Osiolog/1.0 (dental clinic management app)"},
                timeout=10,
            )
            if geo_resp.status_code == 200:
                results = geo_resp.json()
                if results:
                    address = results[0].get("display_name")
                    latitude = float(results[0]["lat"])
                    longitude = float(results[0]["lon"])
        except Exception as exc:
            logger.warning("Forward geocoding failed for %r: %s", query, exc)

    if not name and address is None and latitude is None:
        raise HTTPException(
            status_code=422,
            detail="Couldn't find a place name or location in that link — try pasting the full Google Maps link for this clinic.",
        )

    return ResolveMapsLinkResponse(name=name, address=address, latitude=latitude, longitude=longitude, resolved_url=resolved_url)


@router.get("", response_model=list[ClinicRead])
async def list_clinics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ClinicRead]:
    repo = ClinicRepository(db)
    clinics = await repo.list(current_user.org_id)
    return [ClinicRead.model_validate(c) for c in clinics]


@router.post("", response_model=ClinicRead, status_code=status.HTTP_201_CREATED)
async def create_clinic(
    body: ClinicCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClinicRead:
    repo = ClinicRepository(db)
    clinic = await repo.create(current_user.org_id, body)
    return ClinicRead.model_validate(clinic)


@router.get("/{clinic_id}", response_model=ClinicRead)
async def get_clinic(
    clinic_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClinicRead:
    repo = ClinicRepository(db)
    clinic = await repo.get(clinic_id, current_user.org_id)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return ClinicRead.model_validate(clinic)


@router.patch("/{clinic_id}", response_model=ClinicRead)
async def update_clinic(
    clinic_id: uuid.UUID,
    body: ClinicUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClinicRead:
    repo = ClinicRepository(db)
    clinic = await repo.get(clinic_id, current_user.org_id)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    clinic = await repo.update(clinic, body)
    return ClinicRead.model_validate(clinic)


@router.delete("/{clinic_id}", status_code=status.HTTP_200_OK)
async def delete_clinic(  # type: ignore[return]
    clinic_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = ClinicRepository(db)
    clinic = await repo.get(clinic_id, current_user.org_id)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    await repo.delete(clinic)
    return {"deleted": True}
