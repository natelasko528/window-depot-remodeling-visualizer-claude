import type { IncomingMessage, ServerResponse } from 'node:http';

export declare function generateHandler(req: IncomingMessage, res: ServerResponse): Promise<void>;
