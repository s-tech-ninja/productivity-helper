import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/icons/icon.component';

@Component({
  selector: 'app-final-review-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        <!-- Modal Header -->
        <div class="p-6 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Final Review</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Review your AI-generated task before adding it to your dashboard.</p>
        </div>
        
        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-slate-900/20 space-y-6 text-sm">
          
          <div>
            <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Title</p>
            <p class="text-lg font-bold text-slate-900 dark:text-white mt-1">{{ taskPayload().title }}</p>
          </div>

          @if (taskPayload().description) {
            <div>
              <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Description</p>
              <p class="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{{ taskPayload().description }}</p>
            </div>
          }

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Category</p>
              <p class="text-slate-900 dark:text-white mt-1 font-medium">{{ taskPayload().category }}</p>
            </div>
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Project</p>
              <p class="text-slate-900 dark:text-white mt-1 font-medium">{{ taskPayload().project }}</p>
            </div>
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Energy Level</p>
              <p class="text-slate-900 dark:text-white mt-1 font-medium">{{ taskPayload().energyLevel }}</p>
            </div>
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Est. Effort</p>
              <p class="text-slate-900 dark:text-white mt-1 font-medium">{{ taskPayload().estimatedEffort }}</p>
            </div>
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-2">
              <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Deadline</p>
              <p class="text-slate-900 dark:text-white mt-1 font-medium">{{ taskPayload().deadline | date:'medium' }}</p>
            </div>
          </div>

          @if (taskPayload().tags?.length) {
            <div>
              <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Tags</p>
              <div class="flex flex-wrap gap-2">
                @for (tag of taskPayload().tags; track tag) {
                  <span class="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium">{{ tag }}</span>
                }
              </div>
            </div>
          }

          @if (taskPayload().subtasks?.length) {
            <div>
              <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Subtasks ({{ taskPayload().subtasks.length }})</p>
              <ul class="space-y-2">
                @for (st of taskPayload().subtasks; track st.id) {
                  <li class="flex items-start gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span class="text-indigo-500 shrink-0 mt-0.5">•</span>
                    <span class="text-slate-700 dark:text-slate-200">{{ st.text }}</span>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
        
        <!-- Modal Footer -->
        <div class="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-end gap-3">
          <button (click)="cancel.emit()" class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
          <button (click)="confirm.emit()" class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition flex items-center gap-2"><app-icon name="check" [size]="16"></app-icon> Confirm & Save Task</button>
        </div>
      </div>
    </div>
  `
})
export class FinalReviewModalComponent {
  taskPayload = input.required<any>();
  confirm = output<void>();
  cancel = output<void>();
}