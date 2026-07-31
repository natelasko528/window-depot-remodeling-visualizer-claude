import type { IncomingMessage, ServerResponse } from 'node:http';

export interface GenerateResult {
  status: number;
  body: { image: string } | { error: string };
}

export declare function generateFromPayload(payload: unknown): Promise<GenerateResult>;

export declare function generateHandler(req: IncomingMessage, res: ServerResponse): Promise<void>;
