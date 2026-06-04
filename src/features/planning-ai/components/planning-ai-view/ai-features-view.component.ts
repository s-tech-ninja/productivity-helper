import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../../core/services/task.service';
import { AiPromptService } from '@/src/ai/services/prompt.service';
import { IconComponent } from '../../../../shared/components/icons/icon.component';
import { TaskBuilderTabComponent } from './task-builder-tab.component';
import { PromptBuilderTabComponent, PromptItem } from './prompt-builder-tab.component';
import { AiTestConsoleTabComponent } from './ai-test-console-tab.component';

@Component({
  selector: 'app-ai-features-view',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule, TaskBuilderTabComponent, PromptBuilderTabComponent, AiTestConsoleTabComponent],
  templateUrl: './ai-features-view.component.html'
})
export class AiFeaturesViewComponent {
  private taskService = inject(TaskService);
  private aiPromptService = inject(AiPromptService);
  
  tasks = this.taskService.tasks;
  searchQuery = signal('');
  selectedTaskIds = signal<Set<string>>(new Set());
  
  prompts = signal<PromptItem[]>([]);
  isGenerated = signal(false);

  activeTab = signal<'prompts' | 'test-console' | 'task-builder'>('task-builder');
  
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

  setAiTab(tab: 'prompts' | 'test-console' | 'task-builder') {
    this.activeTab.set(tab);
  }
}
