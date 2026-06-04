import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PromptBuilder {
  buildSystemPrompt(): string {
    return `You are an assistant that must respond with valid JSON following the provided Zod schema. Respond only with JSON.`;
  }

  buildUserPrompt(context: string, instructions?: string) {
    return `${context}\n\n${instructions ?? ''}`;
  }

  buildFullPrompt(system: string, user: string) {
    return `${system}\n\n${user}`;
  }
}
