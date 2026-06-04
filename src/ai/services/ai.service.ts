import { Injectable } from '@angular/core';
import { ZodSchema } from 'zod';
import { PromptBuilder } from './prompt-builder.service';
import { OllamaClient } from './ollama-client.service';
import { JsonRepairService } from './json-repair.service';
import { SchemaValidator } from './schema-validator.service';
import { OLLAMA_CONFIG } from '../config/ollama.config';

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(
    private promptBuilder: PromptBuilder,
    private ollama: OllamaClient,
    private jsonRepair: JsonRepairService,
    private validator: SchemaValidator
  ) {}

  async generateStructuredOutput<T>(
    context: string,
    schema: ZodSchema<T>,
    options?: { streaming?: boolean; attempts?: number }
  ): Promise<T> {
    const system = this.promptBuilder.buildSystemPrompt();
    const user = this.promptBuilder.buildUserPrompt(context, `Respond with JSON that matches the schema and nothing else.`);
    const prompt = this.promptBuilder.buildFullPrompt(system, user);

    const attempts = options?.attempts ?? OLLAMA_CONFIG.retryAttempts ?? 3;
    let lastErr: any = null;

    for (let i = 0; i < attempts; i++) {
      try {
        const raw = await this.ollama.generate(prompt, { timeoutMs: OLLAMA_CONFIG.timeout });

        // try parse direct
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          parsed = this.jsonRepair.tryParse(raw);
          if (!parsed) throw new Error('Failed to parse or repair JSON');
        }

        const validation = this.validator.validate(schema, parsed);
        if (validation.success) return validation.data;

        // If validation failed, attempt to repair by asking model again or repairing JSON
        if (!validation.success) {
          const failure = validation as { success: false; errors: any };
          lastErr = failure.errors;
        }

      } catch (err) {
        lastErr = err;
        // Wait exponential backoff
        const delay = Math.round((i + 1) * 1000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }

    // Fallback: throw with last error
    throw new Error(`AI generation failed after ${attempts} attempts: ${JSON.stringify(lastErr)}`);
  }
}
