/**
 * Photo intake.
 *
 * Phone photos are 3–12 MB and frequently rotated by EXIF only. Both matter:
 * an un-rotated photo renders sideways on the canvas and the model then
 * "fixes" a sideways house, and full-resolution uploads are slow on a cell
 * connection in someone's driveway.
 *
 * Downscaling to a 2048px long edge keeps far more detail than the render
 * pipeline consumes (gpt-image-1 tops out at 1536x1024) while cutting a
 * typical capture to a few hundred KB.
 */

const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.86;

export type PreparedPhoto = { blob: Blob; width: number; height: number };

/**
 * `imageOrientation: 'from-image'` applies the EXIF rotation during decode, so
 * the bitmap we measure and draw is already upright — no separate EXIF parse,
 * and no chance of the dimensions disagreeing with the pixels.
 */
async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
}

export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const bitmap = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('Could not encode the photo.');
  return { blob, width, height };
}

/**
 * Rasterises normalised polygons into the mask the images API expects:
 * transparent where the model may paint, opaque everywhere it must not.
 * Used for per-area re-renders and for "revert area".
 */
export async function polygonMask(
  width: number,
  height: number,
  polygons: { x: number; y: number }[][],
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'destination-out';
  for (const polygon of polygons) {
    if (polygon.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(polygon[0].x * width, polygon[0].y * height);
    for (const point of polygon.slice(1)) ctx.lineTo(point.x * width, point.y * height);
    ctx.closePath();
    ctx.fill();
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not encode the mask.');
  return blob;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
