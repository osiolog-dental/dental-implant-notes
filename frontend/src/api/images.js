import client from './client';

// ── Presigned URL cache ────────────────────────────────────────────────────────
// Avoids re-fetching URLs on every render. URLs expire in 1 hour;
// we refresh if they're within 5 minutes of expiry.
const _cache = new Map(); // key: caseId → { images: [...], expiresAt: timestamp }
const CACHE_TTL_MS = 3500 * 1000;   // 3500s — safely inside S3's 3600s expiry
const REFRESH_THRESHOLD_MS = 300 * 1000; // refresh if < 5 min left

function _cacheGet(caseId) {
  const entry = _cache.get(caseId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt - REFRESH_THRESHOLD_MS) {
    _cache.delete(caseId);
    return null;
  }
  return entry.images;
}

function _cacheSet(caseId, images) {
  _cache.set(caseId, { images, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearImageCache(caseId) {
  _cache.delete(caseId);
}

// ── Client-side image compression ─────────────────────────────────────────────
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

/**
 * Compress an image file in the browser using Canvas API.
 * - Resizes longest side to MAX_DIMENSION if larger
 * - Re-encodes as JPEG at JPEG_QUALITY
 * - Skips PDFs (returns original file)
 * Free — runs entirely in the browser, zero server cost.
 */
export function compressImage(file) {
  if (file.type === 'application/pdf') return Promise.resolve(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas compression failed'));
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

// ── Upload directly to S3 via presigned URL ────────────────────────────────────
function _uploadToS3(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('S3 upload network error'));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
    xhr.send(file);
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Full upload flow:
 * 1. Compress in browser
 * 2. Get presigned PUT URL from backend
 * 3. Upload directly to S3
 * 4. Call /complete so backend generates thumbnail
 * 5. Invalidate cache
 */
export async function uploadImage(caseId, file, { category = 'general', onProgress } = {}) {
  const compressed = await compressImage(file);
  const contentType = compressed.type || 'image/jpeg';

  // Step 1: get presigned URL
  const { data: { upload_url, image_id } } = await client.post(
    `/api/cases/${caseId}/images/upload-url`,
    { content_type: contentType, category },
  );

  // Step 2: upload directly to S3
  await _uploadToS3(upload_url, compressed, onProgress);

  // Step 3: tell backend to generate thumbnail and mark as uploaded
  const { data: image } = await client.post(
    `/api/cases/${caseId}/images/${image_id}/complete`,
  );

  clearImageCache(caseId);
  return image;
}

/**
 * Fetch images for a case, using the presigned URL cache.
 * Gallery views always use thumbnail_url; full url only for lightbox.
 */
export async function getImages(caseId) {
  const cached = _cacheGet(caseId);
  if (cached) return cached;

  const { data } = await client.get(`/api/cases/${caseId}/images`);
  _cacheSet(caseId, data);
  return data;
}

/**
 * Delete an image and invalidate cache.
 */
export async function deleteImage(caseId, imageId) {
  await client.delete(`/api/cases/${caseId}/images/${imageId}`);
  clearImageCache(caseId);
}
