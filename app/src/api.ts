export async function fetchAsDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function generateVisualization(
  image: string,
  instructions: string[],
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image, instructions }),
    signal,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error || `the render service returned ${res.status}`);
  if (!payload?.image) throw new Error('the render service returned no image');
  return payload.image as string;
}
