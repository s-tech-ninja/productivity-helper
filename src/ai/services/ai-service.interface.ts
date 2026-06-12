import { ZodSchema } from 'zod';

export interface AiServiceOptions {
  streaming?: boolean;
  attempts?: number;
  timeoutMs?: number;
  onProgress?: (chunk: string) => void;
  // Prompt / generation controls
  skipExample?: boolean;
  temperature?: number;
  topK?: number;
  topP?: number;
}

export interface AiServiceRequest<T> {
  systemPrompt?: string;
  context: string;
  schema: ZodSchema<T>;
  options?: AiServiceOptions;
}

export interface AiServiceSuccessResult<T> {
  success: true;
  data: T;
  raw: string;
  attempts: number;
}

export interface AiServiceFailureResult {
  success: false;
  error: string;
  details?: any;
  raw?: string | null;
  attempts: number;
}

export type AiServiceResult<T> = AiServiceSuccessResult<T> | AiServiceFailureResult;

export interface AiServiceContract {
  generateStructuredOutput<T>(request: AiServiceRequest<T>): Promise<AiServiceResult<T>>;
}
