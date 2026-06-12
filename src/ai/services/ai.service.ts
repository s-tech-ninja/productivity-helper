import { Injectable } from '@angular/core';
import { ZodSchema } from 'zod';
import { PromptBuilder } from './prompt-builder.service';
import { OllamaClient } from './ollama-client.service';
import { JsonRepairService } from './json-repair.service';
import { SchemaValidator } from './schema-validator.service';
import { OLLAMA_CONFIG } from '../config/ollama.config';
import type { AiServiceContract, AiServiceOptions, AiServiceRequest, AiServiceResult } from './ai-service.interface';

@Injectable({ providedIn: 'root' })
export class AiService implements AiServiceContract {
  constructor(
    private promptBuilder: PromptBuilder,
    private ollama: OllamaClient,
    private jsonRepair: JsonRepairService,
    private validator: SchemaValidator
  ) {}

  // Example generation moved to PromptBuilder.buildUserPromptWithExample

  async generateStructuredOutput<T>(context: string, schema: ZodSchema<T>, options?: AiServiceOptions): Promise<AiServiceResult<T>>;
  async generateStructuredOutput<T>(request: AiServiceRequest<T>): Promise<AiServiceResult<T>>;
  async generateStructuredOutput<T>(
    contextOrRequest: string | AiServiceRequest<T>,
    schema?: ZodSchema<T>,
    options?: AiServiceOptions
  ): Promise<AiServiceResult<T>> {
    const request: AiServiceRequest<T> =
      typeof contextOrRequest === 'string'
        ? { context: contextOrRequest, schema: schema as ZodSchema<T>, options }
        : contextOrRequest;

    const system = request.systemPrompt || this.promptBuilder.buildSystemPrompt();
    const user = this.promptBuilder.buildUserPromptWithExample(request.context, request.schema, {
      skipExample: request.options?.skipExample
    });
    
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ];

    const attempts = request.options?.attempts ?? OLLAMA_CONFIG.retryAttempts ?? 3;
    let lastErr: any = null;
    let lastRaw: string | null = null;
    let messagesToSend = messages;

    for (let i = 0; i < attempts; i++) {
      try {
        const raw = await this.ollama.generate(messagesToSend, {
          timeoutMs: request.options?.timeoutMs ?? OLLAMA_CONFIG.timeout,
          onProgress: request.options?.onProgress,
          temperature: request.options?.temperature,
          topK: request.options?.topK,
          topP: request.options?.topP
        });

        lastRaw = raw;

        // try parse direct
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          parsed = this.jsonRepair.tryParse(raw);
          if (!parsed) {
            lastErr = { error: 'Failed to parse or repair JSON', raw, details: e };
            if (i < attempts - 1) {
              messagesToSend = [
                ...messages,
                { role: 'assistant', content: raw },
                { role: 'user', content: this.promptBuilder.buildRepairPromptContent(lastErr) }
              ];
              continue;
            }
            break;
          }
        }

        // Normalize parsed output into the expected schema shape
        const normalized = this.normalizeParsedForSchema(parsed);

        const validation = this.validator.validate(request.schema, normalized);
        if (validation.success) {
          return {
            success: true,
            data: validation.data as T,
            raw,
            attempts: i + 1
          };
        }

        lastErr = validation;
        if (i < attempts - 1) {
          messagesToSend = [...messages, { role: 'assistant', content: raw }, { role: 'user', content: this.promptBuilder.buildRepairPromptContent(validation) }];
          continue;
        }
      } catch (err) {
        if (err instanceof Error) lastErr = err.message; else lastErr = err;
        if (i < attempts - 1) {
          const delay = Math.round((i + 1) * 1000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
    }


    return {
      success: false,
      error: `AI generation failed after ${attempts} attempts`,
      details: lastErr,
      raw: lastRaw,
      attempts
    };
  }

  /**
   * Normalize the parsed AI output to commonly-expected task/plan shapes so it validates
   * against the existing Zod schemas without changing those schemas.
   */
  private normalizeParsedForSchema(parsed: any): any {
    if (!parsed) return parsed;

    let candidate = parsed;

    // Unwrap common wrappers
    if (candidate.plan) candidate = candidate.plan;
    if (candidate.result) candidate = candidate.result;
    if (candidate.data) candidate = candidate.data;

    // If it's an array, normalize each element
    if (Array.isArray(candidate)) return candidate.map(c => this.normalizeEntity(c));

    // If it has tasks array, normalize tasks
    if (candidate.tasks && Array.isArray(candidate.tasks)) {
      return { ...candidate, tasks: candidate.tasks.map((t: any) => this.normalizeTask(t)) };
    }

    // If it looks like a single task, normalize and return
    if (this.isLikelyTask(candidate)) return this.normalizeTask(candidate);

    return candidate;
  }

  private normalizeEntity(entity: any): any {
    // The order matters here. A task is a superset of a subtask.
    // Check for the more specific 'Task' properties first.
    if (this.isLikelyTask(entity)) {
      return this.normalizeTask(entity);
    }
    if (this.isLikelySubtask(entity)) {
      return this.normalizeSubtask(entity);
    }
    if (entity.tasks && Array.isArray(entity.tasks)) return { ...entity, tasks: entity.tasks.map((t: any) => this.normalizeTask(t)) };
    return entity;
  }

  private isLikelyTask(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;
    // A task is more complex. It usually has properties that a subtask lacks.
    const hasTitle = obj.title || obj.name;
    const hasTaskSpecificFields = obj.project || obj.category || obj.estimatedEffort || obj.energyLevel || obj.deadline;
    return Boolean(hasTitle && hasTaskSpecificFields);
  }

  private normalizeTask(t: any): any {
    const id = Array.isArray(t.id) ? String(t.id[0] ?? t.id.join('-')) : t.id ?? t.task_id ?? t.taskId ?? t._id ?? undefined;
    const title = t.title ?? t.name ?? t.task_title ?? t.taskTitle ?? 'Untitled Task';
    const description = t.description ?? t.desc ?? t.details ?? '';
    const category = t.category ?? t.cat ?? t.type ?? undefined;
    const project = t.project ?? t.projectId ?? t.project_id ?? undefined;
    const deadline = t.deadline ?? t.due ?? t.dueDate ?? '';
    const estimatedEffort = this.coerceNumber(t.estimatedEffort ?? t.estimated_effort ?? t.estimate ?? t.hours ?? t.estimatedHours, 1);
    const energyLevel = t.energyLevel ?? t.energy ?? t.energy_level ?? t.priority ?? undefined;
    const tags = Array.isArray(t.tags) ? t.tags.map((x: any) => String(x)) : typeof t.tags === 'string' ? t.tags.split(',').map((s: string) => s.trim()) : undefined;

    let subtasksRaw: any[] = [];
    if (Array.isArray(t.subtasks)) subtasksRaw = t.subtasks;
    else if (Array.isArray(t.sub_tasks)) subtasksRaw = t.sub_tasks;
    else if (Array.isArray(t.steps)) subtasksRaw = t.steps;
    else if (Array.isArray(t.children)) subtasksRaw = t.children;

    const subtasks = subtasksRaw.map(s => this.normalizeSubtask(s)).filter(Boolean);

    return {
      id: id ? String(id) : undefined,
      title: String(title),
      description: String(description),
      category,
      project,
      deadline: String(deadline),
      estimatedEffort,
      energyLevel,
      tags,
      subtasks
    };
  }

  private isLikelySubtask(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;
    // A subtask is simpler. It has a title but lacks the more complex fields of a full task.
    const hasTitle = obj.title || obj.name || obj.sub_title;
    const isComplexTask = obj.project || obj.category || obj.estimatedEffort || obj.energyLevel || obj.deadline;
    return Boolean(hasTitle && !isComplexTask);
  }

  private normalizeSubtask(s: any): any {
    if (!s || typeof s !== 'object') return null;
    const id = s.id ?? s.sub_id ?? s.subId ?? s._id ?? undefined;
    const title = s.title ?? s.sub_title ?? s.subTitle ?? s.name ?? 'Untitled Subtask';
    const description = s.description ?? s.desc ?? s.text ?? '';
    const completed = this.coerceBoolean(s.completed ?? s.done ?? s.isComplete ?? s.complete);
    const notes = s.notes ?? s.note ?? s.context ?? s.tips ?? s.details ?? undefined;
    return { id: id ? String(id) : undefined, title: String(title), description, completed, notes };
  }

  private coerceNumber(value: any, fallback = 1): number {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const n = parseFloat(value.replace(/[A-Za-z]/g, '').trim());
      if (!isNaN(n)) return n > 0 ? n : fallback;
    }
    return fallback;
  }

  private coerceBoolean(v: any): boolean | undefined {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true' || s === 'yes' || s === '1') return true;
      if (s === 'false' || s === 'no' || s === '0') return false;
    }
    if (typeof v === 'number') return v !== 0;
    return undefined;
  }

}
