import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ProviderStatus {
  configured: boolean;
  hint: string | null;
  model: string | null;
}

export interface ServerStatus {
  render: ProviderStatus;
  detect: ProviderStatus;
  imageSize: string;
  timeoutMs: number;
}

export interface TestBody {
  ok: boolean;
  message: string;
}

export declare function statusFromEnv(env?: NodeJS.ProcessEnv): ServerStatus;

export declare function testProvider(
  name: unknown,
  env?: NodeJS.ProcessEnv,
): Promise<{ status: number; body: TestBody }>;

export declare function settingsFromPayload(
  method: string | undefined,
  payload: unknown,
): Promise<{ status: number; body: ServerStatus | TestBody | { error: string } }>;

export declare function settingsHandler(req: IncomingMessage, res: ServerResponse): Promise<void>;
