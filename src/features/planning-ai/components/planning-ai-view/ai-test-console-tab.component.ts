import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZodSchema } from 'zod';
import { AiService } from '@/src/ai/services';
import { goalSchema, planSchema, reflectionSchema, taskSchema } from '@/src/ai/schemas/zod-schemas';
import type { AiServiceFailureResult } from '@/src/ai/services/ai-service.interface';

interface TestSchemaOption {
  key: string;
  label: string;
  description: string;
  schema: ZodSchema<any>;
}

const TEST_SCHEMA_OPTIONS: TestSchemaOption[] = [
  { key: 'task', label: 'Task Schema', description: 'Return a task object with metadata and optional subtasks.', schema: taskSchema },
  { key: 'plan', label: 'Plan Schema', description: 'Return a plan object with goals, milestones, and tasks.', schema: planSchema },
  { key: 'goal', label: 'Goal Schema', description: 'Return a goal object with outcome, timeframe, and related task IDs.', schema: goalSchema },
  { key: 'reflection', label: 'Reflection Schema', description: 'Return a reflection object with learnings and sentiment.', schema: reflectionSchema }
];

const DEFAULT_TEST_CONTEXT = 'Analyze the selected task summary and return valid JSON matching the selected schema.';

@Component({
  selector: 'app-ai-test-console-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid gap-6">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">AI Test Console</h3>
            <p class="text-slate-500 dark:text-slate-400 mt-1">Validate JSON output from the AI service against a sample schema.</p>
          </div>
          <button 
            (click)="runAiTest()"
            class="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            🚀 Run Test
          </button>
        </div>

        <div class="grid gap-4 mt-6">
          <div>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Schema</p>
            <div class="grid gap-2 mt-3">
              @for (option of schemaOptions; track option.key) {
                <button 
                  (click)="selectTestSchema(option.key)"
                  class="w-full text-left rounded-2xl border px-4 py-3 transition-colors"
                  [class.border-indigo-500]="testSchema() === option.key"
                  [class.bg-indigo-50]="testSchema() === option.key"
                  [class.text-indigo-700]="testSchema() === option.key"
                  [class.border-slate-200]="testSchema() !== option.key"
                  [class.bg-slate-50]="testSchema() !== option.key"
                  [class.text-slate-700]="testSchema() !== option.key"
                >
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-medium">{{ option.label }}</span>
                    @if(testSchema() === option.key) { <span class="text-xs text-indigo-600">Selected</span> }
                  </div>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ option.description }}</p>
                </button>
              }
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-200">Prompt / Context</label>
            <textarea
              [ngModel]="testContext()"
              (ngModelChange)="testContext.set($event)"
              rows="6"
              placeholder="Describe what the AI should return in JSON."
              class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            ></textarea>
          </div>

          <div class="grid gap-4 sm:grid-cols-[1fr_120px] items-end">
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-200">Retry attempts</label>
              <input
                type="number"
                min="1"
                [ngModel]="testAttempts()"
                (ngModelChange)="testAttempts.set($any($event) || 1)"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Selected schema</p>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ selectedTestSchema.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Result</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">AI service response and schema validation status.</p>
          </div>
          @if(testStatus() === 'running') {
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">Running...</span>
          }
          @if(testStatus() === 'success') {
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">Success</span>
          }
          @if(testStatus() === 'error') {
            <span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">Error</span>
          }
        </div>
        @if(testError()) {
          <pre class="mt-4 min-h-[180px] overflow-x-auto rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-200">{{ testError() }}</pre>
        } @else if(testOutput()) {
          <pre class="mt-4 min-h-[180px] overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{{ testOutput() }}</pre>
        } @else {
          <div class="mt-4 min-h-[180px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Run a test to see AI output and validation details.
          </div>
        }
        @if(validationRows().length) {
          <div class="mt-4 overflow-x-auto rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200">
            <p class="font-medium mb-2">Validation errors</p>
            <table class="w-full text-left text-sm">
              <thead>
                <tr>
                  <th class="px-2 py-1 font-semibold">Path</th>
                  <th class="px-2 py-1 font-semibold">Message</th>
                  <th class="px-2 py-1 font-semibold">Code</th>
                </tr>
              </thead>
              <tbody>
                @for (row of validationRows(); track row.path) {
                  <tr class="border-t">
                    <td class="px-2 py-1 align-top">{{ row.path }}</td>
                    <td class="px-2 py-1">{{ row.message }}</td>
                    <td class="px-2 py-1">{{ row.code }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class AiTestConsoleTabComponent {
  private aiService = inject(AiService);
  
  schemaOptions = TEST_SCHEMA_OPTIONS;
  testContext = signal(DEFAULT_TEST_CONTEXT);
  testSchema = signal(TEST_SCHEMA_OPTIONS[0].key);
  testOutput = signal('');
  testError = signal<string | null>(null);
  testStatus = signal<'idle' | 'running' | 'success' | 'error'>('idle');
  testAttempts = signal(1);
  validationRows = signal<Array<{ path: string; message: string; code?: string }>>([]);

  get selectedTestSchema() {
    return this.schemaOptions.find(schema => schema.key === this.testSchema()) || this.schemaOptions[0];
  }

  selectTestSchema(key: string) {
    this.testSchema.set(key);
    this.testError.set(null);
    this.testOutput.set('');
    this.testStatus.set('idle');
  }

  async runAiTest() {
    this.testStatus.set('running');
    this.testError.set(null);
    this.testOutput.set('');

    let partial = '';
    const request = {
      context: this.testContext(),
      schema: this.selectedTestSchema.schema,
      options: {
        attempts: Math.max(1, this.testAttempts()),
        temperature: 0,
        topK: 40,
        topP: 0.9,
        onProgress: (chunk: string) => {
          partial += chunk;
          this.testOutput.set(partial);
        }
      }
    };

    try {
      const result = await this.aiService.generateStructuredOutput(request);
      this.validationRows.set([]);
      if (result.success) {
        this.testOutput.set(JSON.stringify(result.data, null, 2));
        this.testStatus.set('success');
      } else {
        const failure = result as AiServiceFailureResult;
        if (failure.details && Array.isArray((failure.details as any).flatErrors)) {
          try {
            const rows = ((failure.details as any).flatErrors || []) as Array<{ path: string; message: string; code?: string }>;
            this.validationRows.set(rows);
          } catch { this.validationRows.set([]); }
        } else {
          this.validationRows.set([]);
        }
        const details = failure.details ? `\n\n${JSON.stringify(failure.details, null, 2)}` : '';
        this.testError.set(`${failure.error}${details}`);
        this.testStatus.set('error');
      }
    } catch (error) {
      this.validationRows.set([]);
      this.testError.set(error instanceof Error ? error.message : 'Unexpected AI service error');
      this.testStatus.set('error');
    }
  }
}