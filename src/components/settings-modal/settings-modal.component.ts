import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icons/icon.component';
import { ThemeService } from '../../services/theme.service';
import { TaskService, TaskFormPreferences } from '../../services/task.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './settings-modal.component.html',
})
export class SettingsModalComponent {
  close = output<void>();
  exportData = output<void>();
  importData = output<void>();
  
  themeService = inject(ThemeService);
  taskService = inject(TaskService);

  formFields: { key: keyof TaskFormPreferences, label: string }[] = [
    { key: 'showDescription', label: 'Description' },
    { key: 'showProject', label: 'Project' },
    { key: 'showTags', label: 'Tags' },
    { key: 'showEffort', label: 'Est. Effort' },
    { key: 'showEnergy', label: 'Energy Level' },
  ];

  get notificationStatus() {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  requestPermission() {
    this.taskService.requestNotificationPermission();
  }

  toggleFormPref(key: keyof TaskFormPreferences) {
    this.taskService.updateFormPreference(key, !this.taskService.formPreferences()[key]);
  }
}