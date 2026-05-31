export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'qwen2.5-coder',
  timeout: 60000,
  retryAttempts: 3,
  retryDelay: 1000,
  temperature: 0.7,
  topK: 40,
  topP: 0.9
};
