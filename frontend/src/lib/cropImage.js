/**
 * Canvas helpers for react-easy-crop — crops (and rotates) an image to a
 * File, given the pixel crop area react-easy-crop reports via onCropComplete.
 */

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

function rotatedSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

// Longest side a saved photo is allowed to have. 2000px is comfortably more
// than any screen or print use needs for a clinical photo, so downscaling to
// this limit saves storage with no visible quality loss.
export const MAX_PHOTO_DIMENSION = 2000;

/**
 * Crop `imageSrc` (an object URL or data URL) to `pixelCrop` (as reported by
 * react-easy-crop's onCropComplete), applying `rotation` degrees first, then
 * downscaling to `maxDimension` on the longest side if the crop is bigger.
 *
 * Returns { file, resized, originalWidth, originalHeight, finalWidth, finalHeight }
 * — `file` is null if the canvas produced no data.
 */
export async function getCroppedImageFile(
  imageSrc, pixelCrop, rotation = 0, fileName = 'photo.jpg', maxDimension = MAX_PHOTO_DIMENSION,
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { width: boxW, height: boxH } = rotatedSize(image.width, image.height, rotation);
  canvas.width = boxW;
  canvas.height = boxH;

  ctx.translate(boxW / 2, boxH / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  const originalWidth = pixelCrop.width;
  const originalHeight = pixelCrop.height;
  const longestSide = Math.max(originalWidth, originalHeight);

  let finalCanvas = canvas;
  let resized = false;
  if (longestSide > maxDimension) {
    const scale = maxDimension / longestSide;
    const targetW = Math.round(originalWidth * scale);
    const targetH = Math.round(originalHeight * scale);
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = targetW;
    scaledCanvas.height = targetH;
    scaledCanvas.getContext('2d').drawImage(canvas, 0, 0, targetW, targetH);
    finalCanvas = scaledCanvas;
    resized = true;
  }

  return new Promise((resolve) => {
    finalCanvas.toBlob((blob) => {
      if (!blob) { resolve({ file: null, resized: false, originalWidth, originalHeight, finalWidth: originalWidth, finalHeight: originalHeight }); return; }
      resolve({
        file: new File([blob], fileName, { type: 'image/jpeg' }),
        resized,
        originalWidth,
        originalHeight,
        finalWidth: finalCanvas.width,
        finalHeight: finalCanvas.height,
      });
    }, 'image/jpeg', 0.92);
  });
}
