import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icons/icon.component';
import { ThemeService } from '../../services/theme.service';
import { TaskService, TaskFormPreferences } from '../../services/task.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="close.emit()"></div>
      
      <!-- Modal -->
      <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <app-icon name="settings" [size]="20"></app-icon> Settings
          </h2>
          <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <app-icon name="x" [size]="20"></app-icon>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          <!-- Appearance -->
          <div>
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Appearance</h3>
            <button 
              (click)="themeService.toggle()"
              class="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <div class="flex items-center gap-3">
                <div class="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-slate-600 dark:text-slate-300">
                   @if (themeService.isDarkMode()) {
                     <app-icon name="moon" [size]="18"></app-icon>
                   } @else {
                     <app-icon name="sun" [size]="18"></app-icon>
                   }
                </div>
                <div class="text-left">
                  <p class="text-sm font-medium text-slate-900 dark:text-white">Theme</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ themeService.isDarkMode() ? 'Dark Mode' : 'Light Mode' }}</p>
                </div>
              </div>
              <div class="w-10 h-5 bg-slate-200 dark:bg-slate-600 rounded-full relative transition-colors">
                <div class="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200"
                     [class.translate-x-5]="themeService.isDarkMode()"
                ></div>
              </div>
            </button>
          </div>

          <!-- Notifications -->
          <div>
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Notifications</h3>
            <div class="space-y-3">
              <!-- Permission -->
              <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-slate-600 dark:text-slate-300">
                    <app-icon name="bell" [size]="18"></app-icon>
                  </div>
                  <div class="text-left">
                    <p class="text-sm font-medium text-slate-900 dark:text-white">Push Notifications</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      Status: <span class="font-semibold capitalize">{{ notificationStatus }}</span>
                    </p>
                  </div>
                </div>
                <button 
                  (click)="requestPermission()"
                  [disabled]="notificationStatus === 'granted'"
                  class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
                  [class.bg-indigo-100]="notificationStatus !== 'granted'"
                  [class.text-indigo-700]="notificationStatus !== 'granted'"
                  [class.hover:bg-indigo-200]="notificationStatus !== 'granted'"
                  [class.bg-emerald-100]="notificationStatus === 'granted'"
                  [class.text-emerald-700]="notificationStatus === 'granted'"
                  [class.opacity-50]="notificationStatus === 'granted'"
                >
                  {{ notificationStatus === 'granted' ? 'Active' : 'Enable' }}
                </button>
              </div>

              <!-- Sound -->
              <button 
                (click)="taskService.toggleSound()"
                class="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-slate-600 dark:text-slate-300">
                     <app-icon name="zap" [size]="18"></app-icon>
                  </div>
                  <div class="text-left">
                    <p class="text-sm font-medium text-slate-900 dark:text-white">Sound Effects</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Timer and completion sounds</p>
                  </div>
                </div>
                <div class="w-10 h-5 bg-slate-200 dark:bg-slate-600 rounded-full relative transition-colors">
                  <div class="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200"
                       [class.translate-x-5]="taskService.soundEnabled()"
                  ></div>
                </div>
              </button>
            </div>
          </div>

          <!-- Task Form Customization -->
          <div>
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Create Task Fields</h3>
            <div class="grid grid-cols-2 gap-3">
              @for (field of formFields; track field.key) {
                <button 
                  (click)="toggleFormPref(field.key)"
                  class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ field.label }}</span>
                  <div class="w-8 h-4 bg-slate-200 dark:bg-slate-600 rounded-full relative transition-colors">
                    <div class="absolute top-1 left-1 w-2 h-2 bg-white rounded-full shadow-sm transition-transform duration-200"
                         [class.translate-x-4]="taskService.formPreferences()[field.key]"
                    ></div>
                  </div>
                </button>
              }
            </div>
          </div>

          <!-- Data -->
          <div>
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Data Management</h3>
            <div class="grid grid-cols-2 gap-3">
              <button 
                (click)="exportData.emit()"
                class="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 group"
              >
                <app-icon name="download" [size]="24" class="text-slate-400 group-hover:text-indigo-500 transition-colors"></app-icon>
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Export JSON</span>
              </button>
              <button 
                (click)="importData.emit()"
                class="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 group"
              >
                <app-icon name="upload" [size]="24" class="text-slate-400 group-hover:text-indigo-500 transition-colors"></app-icon>
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Import JSON</span>
              </button>
            </div>
          </div>

          <!-- About -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p class="text-xs text-slate-400">ProductivityFlow v1.0.0</p>
          </div>

        </div>
      </div>
    </div>
  `
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