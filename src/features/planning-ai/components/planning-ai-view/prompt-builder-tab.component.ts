import { Component, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PromptItem {
  name: string;
  text: string;
  expanded: boolean;
}

@Component({
  selector: 'app-prompt-builder-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid gap-6">
      @for (prompt of localPrompts(); track $index) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md">
          <div class="flex items-start justify-between gap-4 mb-3">
            <h3 
              (click)="togglePrompt($index)"
              class="font-bold text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer select-none group flex-1"
            >
              <div class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">{{ $index + 1 }}</div>
              <span>{{ prompt.name }}</span>
            </h3>

            <button 
              (click)="copyToClipboard(prompt.text, $index)" 
              class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0"
              [class.bg-emerald-50]="copiedIndex() === $index"
              [class.text-emerald-600]="copiedIndex() === $index"
              [class.bg-slate-100]="copiedIndex() !== $index"
              [class.text-slate-600]="copiedIndex() !== $index"
            >
              {{ copiedIndex() === $index ? '✓ Copied' : '📋 Copy' }}
            </button>
          </div>
          @if (prompt.expanded) {
            <div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-sm font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap border border-slate-100 dark:border-slate-800 overflow-x-auto">{{ prompt.text }}</div>
          }
        </div>
      }
    </div>
  `
})
export class PromptBuilderTabComponent {
  prompts = input<PromptItem[]>([]);
  localPrompts = signal<PromptItem[]>([]);
  copiedIndex = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.localPrompts.set(this.prompts().map(p => ({ ...p })));
    }, { allowSignalWrites: true });
  }

  togglePrompt(index: number) {
    this.localPrompts.update(items => items.map((item, i) => 
      i === index ? { ...item, expanded: !item.expanded } : item
    ));
  }

  copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text);
    this.copiedIndex.set(index);
    setTimeout(() => this.copiedIndex.set(null), 2000);
  }
}