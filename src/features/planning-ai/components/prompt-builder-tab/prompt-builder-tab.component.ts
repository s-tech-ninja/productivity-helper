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
  templateUrl: './prompt-builder-tab.component.html',
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