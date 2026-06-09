import { Component, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@/src/shared/components/icons/icon.component';
import { ThemeService } from '../../../../core/services/theme.service';
import { TaskService, TaskFormPreferences, SoundPreferences, AiPreferences } from '../../../../core/services/task.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './settings-modal.component.html'
})
export class SettingsModalComponent {
  close = output<void>();
  exportData = output<void>();
  importData = output<void>();
  
  themeService = inject(ThemeService);
  taskService = inject(TaskService);

  activeTab = signal<'general' | 'sounds' | 'ai'>('general');

  formFields: { key: keyof TaskFormPreferences, label: string }[] = [
    { key: 'showDescription', label: 'Description' },
    { key: 'showProject', label: 'Project' },
    { key: 'showTags', label: 'Tags' },
    { key: 'showEffort', label: 'Est. Effort' },
    { key: 'showEnergy', label: 'Energy Level' },
  ];

  soundSettings: { key: keyof SoundPreferences, label: string }[] = [
    { key: 'startup', label: 'Timer Start' },
    { key: 'session', label: 'Session Interval (Bell)' },
    { key: 'reminder', label: 'Task Reminders' },
    { key: 'eyeProtection', label: 'Eye Protection (20m) - Look away' },
  ];

  ollamaModels = signal<string[]>([]);
  isFetchingModels = signal(false);
  fetchError = signal<string | null>(null);

  get notificationStatus() {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  constructor() {
    const storedTab = localStorage.getItem('settings_active_tab');
    if (storedTab === 'general' || storedTab === 'sounds' || storedTab === 'ai') {
      this.activeTab.set(storedTab as any);
    }

    // Pre-populate ollamaModels with the current setting to prevent Angular 
    // from resetting the <select> value to null when the options list is empty.
    const currentModel = this.taskService.aiPreferences().ollamaModel;
    if (currentModel) {
      this.ollamaModels.set([currentModel]);
    }

    effect(() => {
      localStorage.setItem('settings_active_tab', this.activeTab());
    });
  }

  setActiveTab(tab: 'general' | 'sounds' | 'ai') {
    this.activeTab.set(tab);
    if (tab === 'ai' && this.ollamaModels().length <= 1 && !this.isFetchingModels()) {
      this.fetchOllamaModels();
    }
  }

  requestPermission() {
    this.taskService.requestNotificationPermission();
  }

  toggleFormPref(key: keyof TaskFormPreferences) {
    const current = this.taskService.formPreferences();
    this.taskService.updateFormPreference(key, !current[key]);
  }

  toggleSoundPref(key: keyof SoundPreferences) {
    const current = this.taskService.soundPreferences();
    this.taskService.updateSoundPreference(key, !current[key]);
  }

  toggleAiFeature(key: keyof AiPreferences) {
    const current = this.taskService.aiPreferences();
    this.taskService.updateAiPreferences({ [key]: !current[key] });
  }

  updateAiPref(key: keyof AiPreferences, value: any) {
    this.taskService.updateAiPreferences({ [key]: value });
  }

  async fetchOllamaModels() {
    this.isFetchingModels.set(true);
    this.fetchError.set(null);
    try {
      const baseUrl = this.taskService.aiPreferences().ollamaBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/tags`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      
      const models = data.models?.map((m: any) => m.name) || [];
      this.ollamaModels.set(models);
      
      // Auto-select the first available model if current is invalid/empty
      const currentModel = this.taskService.aiPreferences().ollamaModel;
      if (models.length > 0 && (!currentModel || !models.includes(currentModel))) {
        this.updateAiPref('ollamaModel', models[0]);
      }
    } catch (err: any) {
      this.fetchError.set(err.message || 'Failed to fetch models from Ollama');
    } finally {
      this.isFetchingModels.set(false);
    }
  }
}
