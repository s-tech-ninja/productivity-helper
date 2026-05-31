import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../../core/services/task.service';
import { AiPromptService, AiPrompt } from '@/src/ai/services/prompt.service'; // Import AiPrompt
import { IconComponent } from '../../../../shared/components/icons/icon.component';

interface PromptItem {
  name: string;
  text: string;
  expanded: boolean;
}

@Component({
  selector: 'app-ai-features-view',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule],
  templateUrl: './ai-features-view.component.html'
})
export class AiFeaturesViewComponent {
  private taskService = inject(TaskService);
  private aiPromptService = inject(AiPromptService);
  
  tasks = this.taskService.tasks;
  searchQuery = signal('');
  selectedTaskIds = signal<Set<string>>(new Set());
  
  prompts = signal<PromptItem[]>([]);
  copiedIndex = signal<number | null>(null);
  isGenerated = signal(false);
  
  filteredTasks = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.tasks().filter(t => !t.archived);
    if (!query) return all;
    return all.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.project?.toLowerCase().includes(query)
    );
  });

  constructor() {
    this.generate(true);
  }

  updateSearch(query: string) {
    this.searchQuery.set(query);
    this.isGenerated.set(false);
  }

  toggleSelection(id: string) {
    this.isGenerated.set(false);
    this.selectedTaskIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  toggleAll() {
    this.isGenerated.set(false);
    const currentFiltered = this.filteredTasks();
    const currentSelected = this.selectedTaskIds();
    const allSelected = currentFiltered.every(t => currentSelected.has(t.id));
    
    this.selectedTaskIds.update(set => {
      const newSet = new Set(set);
      if (allSelected) {
        currentFiltered.forEach(t => newSet.delete(t.id));
      } else {
        currentFiltered.forEach(t => newSet.add(t.id));
      }
      return newSet;
    });
  }

  generate(initial = false) {
    const selected = this.selectedTaskIds();
    let tasksToAnalyze = [];

    if (selected.size > 0) {
      tasksToAnalyze = this.tasks().filter(t => selected.has(t.id));
    } else if (initial) {
       tasksToAnalyze = this.tasks().filter(t => !t.archived);
    } else {
       tasksToAnalyze = this.filteredTasks();
    }

    const rawPrompts = this.aiPromptService.generatePrompts(tasksToAnalyze);
    this.prompts.set(rawPrompts.map(p => ({ name: p.name, text: p.prompt, expanded: false })));
    if (!initial) {
      this.isGenerated.set(true);
    }
  }

  togglePrompt(index: number) {
    this.prompts.update(items => items.map((item, i) => 
      i === index ? { ...item, expanded: !item.expanded } : item
    ));
  }

  copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text);
    this.copiedIndex.set(index);
    setTimeout(() => {
      this.copiedIndex.set(null);
    }, 2000);
  }
}
