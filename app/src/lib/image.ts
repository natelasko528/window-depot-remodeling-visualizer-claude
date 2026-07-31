/**
 * Photo intake.
 *
 * Phone photos are 3–12 MB and frequently rotated by EXIF only. Both matter:
 * an un-rotated photo renders sideways on the canvas and the model then
 * "fixes" a sideways house, and full-resolution uploads are slow on a cell
 * connection in someone's driveway.
 *
 * Photos are normalised to one of the image API's supported output sizes at
 * capture. That single decision is what makes per-category masking possible:
 * base image, mask and rendered result then share one coordinate system for
 * every pass. Without it, pass two's mask would neither match the result's
 * dimensions nor line up with surfaces the API had re-framed to its own aspect.
 */

/** Sizes gpt-image-1 will return. Anything else comes back re-framed. */
const RENDER_SIZES = [
  { width: 1024, height: 1024 },
  { width: 1536, height: 1024 },
  { width: 1024, height: 1536 },
] as const;

const JPEG_QUALITY = 0.86;

export type RenderSize = { width: number; height: number };
export type PreparedPhoto = { blob: Blob; width: number; height: number };

/** The supported size whose aspect ratio is closest to the source. */
export function nearestRenderSize(width: number, height: number): RenderSize {
  const aspect = width / height;
  return RENDER_SIZES.reduce((best, size) => {
    const delta = Math.abs(size.width / size.height - aspect);
    const bestDelta = Math.abs(best.width / best.height - aspect);
    return delta < bestDelta ? size : best;
  }, RENDER_SIZES[0]);
}

/**
 * Geometry for a cover-crop: fill the target box entirely, centring whatever
 * overflows. Cropping rather than letterboxing keeps the frame free of bars the
 * model would otherwise try to interpret as part of the building.
 */
export function coverCrop(
  source: RenderSize,
  target: RenderSize,
): { sx: number; sy: number; sWidth: number; sHeight: number } {
  const scale = Math.max(target.width / source.width, target.height / source.height);
  const sWidth = target.width / scale;
  const sHeight = target.height / scale;
  return {
    sx: (source.width - sWidth) / 2,
    sy: (source.height - sHeight) / 2,
    sWidth,
    sHeight,
  };
}

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
  const target = nearestRenderSize(bitmap.width, bitmap.height);
  const crop = coverCrop({ width: bitmap.width, height: bitmap.height }, target);

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');
  ctx.drawImage(
    bitmap,
    crop.sx, crop.sy, crop.sWidth, crop.sHeight,
    0, 0, target.width, target.height,
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('Could not encode the photo.');
  return { blob, width: target.width, height: target.height };
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
