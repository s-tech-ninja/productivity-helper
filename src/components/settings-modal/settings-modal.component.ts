import { Component, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icons/icon.component';
import { ThemeService } from '../../services/theme.service';
import { TaskService, TaskFormPreferences, SoundPreferences } from '../../services/task.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './settings-modal.component.html'
})
export class SettingsModalComponent {
  close = output<void>();
  exportData = output<void>();
  importData = output<void>();
  
  themeService = inject(ThemeService);
  taskService = inject(TaskService);

  activeTab = signal<'general' | 'sounds'>('general');

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
  ];

  get notificationStatus() {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  constructor() {
    const storedTab = localStorage.getItem('settings_active_tab');
    if (storedTab === 'general' || storedTab === 'sounds') {
      this.activeTab.set(storedTab);
    }

    effect(() => {
      localStorage.setItem('settings_active_tab', this.activeTab());
    });
  }

  requestPermission() {
    this.taskService.requestNotificationPermission();
  }

  toggleFormPref(key: keyof TaskFormPreferences) {
    this.taskService.updateFormPreference(key, !this.taskService.formPreferences()[key]);
  }

  toggleSoundPref(key: keyof SoundPreferences) {
    const current = this.taskService.soundPreferences();
    this.taskService.updateSoundPreference(key, !current[key]);
  }
}