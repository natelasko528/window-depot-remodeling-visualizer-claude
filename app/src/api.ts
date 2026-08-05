export async function fetchAsDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export type DetectedSurface = {
  category: string;
  label: string;
  polygon: { x: number; y: number }[];
  approxSqft: number | null;
  confidence: number | null;
};

/**
 * `categories` is the catalogue's own key list, so detection can only ever
 * return surfaces the app has products for.
 */
export async function detectSurfaces(
  image: string,
  categories: string[],
  signal: AbortSignal,
): Promise<DetectedSurface[]> {
  const res = await fetch('/api/detect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image, categories }),
    signal,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error || `the detection service returned ${res.status}`);
  return (payload?.surfaces ?? []) as DetectedSurface[];
}

export async function generateVisualization(
  image: string,
  instructions: string[],
  signal: AbortSignal,
  mask?: string,
  references?: string[],
): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image, instructions, mask, references }),
    signal,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error || `the render service returned ${res.status}`);
  if (!payload?.image) throw new Error('the render service returned no image');
  return payload.image as string;
}
