from __future__ import annotations

import asyncio
import io

THUMBNAIL_SIZE = 600       # longest side in pixels
THUMBNAIL_QUALITY = 80     # JPEG quality


def _generate_sync(image_bytes: bytes, content_type: str) -> bytes | None:
    """
    Synchronous thumbnail generation — runs in a thread via asyncio.to_thread
    so it never blocks the event loop.

    Returns None for PDFs (no thumbnail generated).
    Returns JPEG bytes for all image types.
    """
    if content_type == "application/pdf":
        return None

    from PIL import Image  # local import — only load Pillow when needed

    img = Image.open(io.BytesIO(image_bytes))

    # Convert RGBA/P modes to RGB (JPEG doesn't support alpha)
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    # Resize — keep aspect ratio, limit longest side to THUMBNAIL_SIZE
    img.thumbnail((THUMBNAIL_SIZE, THUMBNAIL_SIZE), Image.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=THUMBNAIL_QUALITY, optimize=True)
    return out.getvalue()


async def generate_thumbnail(image_bytes: bytes, content_type: str) -> bytes | None:
    """
    Async wrapper — offloads CPU-bound Pillow work to a thread pool.
    Returns None for PDFs.
    """
    return await asyncio.to_thread(_generate_sync, image_bytes, content_type)
