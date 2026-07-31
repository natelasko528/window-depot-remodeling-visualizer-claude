import type { IncomingMessage, ServerResponse } from 'node:http';

export interface DetectedSurface {
  category: string;
  label: string;
  polygon: { x: number; y: number }[];
  approxSqft: number | null;
  confidence: number | null;
}

export interface DetectResult {
  status: number;
  body: { surfaces: DetectedSurface[] } | { error: string };
}

export declare function detectFromPayload(payload: unknown): Promise<DetectResult>;

export declare function detectHandler(req: IncomingMessage, res: ServerResponse): Promise<void>;
