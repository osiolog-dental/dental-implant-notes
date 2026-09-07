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

/**
 * Crop `imageSrc` (an object URL or data URL) to `pixelCrop` (as reported by
 * react-easy-crop's onCropComplete), applying `rotation` degrees first.
 * Returns a File (JPEG), or null if the canvas produced no data.
 */
export async function getCroppedImageFile(imageSrc, pixelCrop, rotation = 0, fileName = 'photo.jpg') {
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

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(null); return; }
      resolve(new File([blob], fileName, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  });
}
