import { Injectable } from '@angular/core';
import { OLLAMA_CONFIG } from '../config/ollama.config';

export interface OllamaResponse {
  raw: string;
}

@Injectable({ providedIn: 'root' })
export class OllamaClient {
  baseUrl = OLLAMA_CONFIG.baseUrl;
  model = OLLAMA_CONFIG.model;

  async generate(
    prompt: string,
    opts?: { streaming?: boolean; timeoutMs?: number; onProgress?: (chunk: string) => void; temperature?: number; topK?: number; topP?: number }
  ): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    const payloadBase = {
      model: this.model,
      parameters: {
        temperature: opts?.temperature ?? OLLAMA_CONFIG.temperature,
        top_k: opts?.topK ?? OLLAMA_CONFIG.topK,
        top_p: opts?.topP ?? OLLAMA_CONFIG.topP,
        stream: opts?.streaming ?? true
      }
    };
    const payload = url.endsWith('/api/chat')
      ? { ...payloadBase, messages: [{ role: 'user', content: prompt }] }
      : { ...payloadBase, prompt };

    const timeout = opts?.timeoutMs ?? OLLAMA_CONFIG.timeout;

    console.log('OllamaClient.generate() payload:', {
      url,
      payload,
      timeout,
      streaming: opts?.streaming,
      temperature: opts?.temperature,
      topK: opts?.topK,
      topP: opts?.topP
    });

    try {
      // Use fetch so we can stream responses in both browser and newer Node runtimes
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
      const timer = controller && timeout ? setTimeout(() => controller.abort(), timeout) : undefined;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller?.signal
      });

      if (timer) clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ollama API error ${res.status}: ${text}`);
      }

      console.log('OllamaClient.generate() response status:', res.status, 'content-type:', res.headers.get('content-type'));

      // If the response contains a ReadableStream, consume it progressively
      const body = (res as any).body as ReadableStream<Uint8Array> | null;
      if (body && typeof body.getReader === 'function') {
        console.log('OllamaClient.generate() streaming response body detected');
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulated = '';

        while (!done) {
          // eslint-disable-next-line no-await-in-loop
          const { value, done: d } = await reader.read();
          done = !!d;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            // console.log('OllamaClient.generate() received chunk:', chunk);
            const extracted = this.extractTextFromChunk(chunk);
            if (extracted) {
              accumulated += extracted;
            }
            if (opts?.onProgress) {
              try {
                opts.onProgress(extracted || chunk);
              } catch (e) {
                console.warn('OllamaClient.generate() onProgress callback failed', e);
              }
            }
          }
        }

        console.log('OllamaClient.generate() accumulated response:', accumulated);
        return accumulated;
      }

      // Fallback: read as text
      const text = await res.text();
      // If Ollama returns JSON with a 'response' or 'output' field, normalize
      try {
        const parsed = JSON.parse(text);
        if (parsed?.response) return typeof parsed.response === 'string' ? parsed.response : JSON.stringify(parsed.response);
        if (parsed?.output) return typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output);
        return text;
      } catch {
        return text;
      }
    } catch (err) {
      throw err;
    }
  }

  private extractTextFromChunk(chunk: string): string {
    const textPieces: string[] = [];
    const lines = chunk
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    for (const raw of lines) {
      const payload = raw.startsWith('data:') ? raw.slice(5).trim() : raw;
      try {
        const parsed = JSON.parse(payload);
        if (parsed?.response) {
          textPieces.push(typeof parsed.response === 'string' ? parsed.response : JSON.stringify(parsed.response));
          continue;
        }
        if (parsed?.output) {
          textPieces.push(typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output));
          continue;
        }
        if (parsed?.message?.content) {
          const content = parsed.message.content;
          const trimmed = typeof content === 'string' ? content.trim() : '';
          if (/^(?:```|```json|`|json)$/i.test(trimmed)) {
            continue;
          }
          textPieces.push(content);
          continue;
        }
        if (parsed?.content) {
          textPieces.push(parsed.content);
          continue;
        }
      } catch {
        // ignore invalid JSON chunks
      }
    }

    return textPieces.join('');
  }
}
