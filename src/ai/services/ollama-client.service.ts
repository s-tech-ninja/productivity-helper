import { Injectable } from '@angular/core';
import axios from 'axios';
import { OLLAMA_CONFIG } from '../config/ollama.config';

export interface OllamaResponse {
  raw: string;
}

@Injectable({ providedIn: 'root' })
export class OllamaClient {
  baseUrl = OLLAMA_CONFIG.baseUrl;
  model = OLLAMA_CONFIG.model;

  async generate(prompt: string, opts?: { streaming?: boolean; timeoutMs?: number }): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;
    const payload = {
      model: this.model,
      prompt,
      // pass additional generation params if needed
      parameters: {
        temperature: OLLAMA_CONFIG.temperature,
        top_k: OLLAMA_CONFIG.topK,
        top_p: OLLAMA_CONFIG.topP
      }
    };

    const timeout = opts?.timeoutMs ?? OLLAMA_CONFIG.timeout;

    try {
      const res = await axios.post(url, payload, { timeout });
      // Expecting a JSON response; adapt if Ollama uses a different endpoint format
      if (res && res.data) {
        // If API returns text or structured object, normalize to string
        if (typeof res.data === 'string') return res.data;
        if (res.data.output) return JSON.stringify(res.data.output);
        return JSON.stringify(res.data);
      }
      return '';
    } catch (err) {
      throw err;
    }
  }
}
