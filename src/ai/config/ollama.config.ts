const env = typeof process !== 'undefined' ? (process as any).env : undefined;

export const OLLAMA_CONFIG = {
  baseUrl: env?.OLLAMA_URL || 'http://localhost:11434',
  model: env?.OLLAMA_MODEL || 'qwen2.5-coder:7b-instruct',
  timeout: 60000,
  retryAttempts: 3,
  retryDelay: 1000,
  temperature: 0.7,
  topK: 40,
  topP: 0.9
};
