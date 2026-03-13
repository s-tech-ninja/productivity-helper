import { Component, output, inject, input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { IconComponent } from '../icons/icon.component';
import { TaskService, Task, Subtask } from '../../services/task.service';
import { WysiwygEditorComponent } from '../sub-components/wysiwyg-editor/wysiwyg-editor.component';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IconComponent, WysiwygEditorComponent],
  templateUrl: './task-form.component.html',
  styles: [`
    app-wysiwyg-editor {
      --editor-height: 400px;
      display: block;
    }
  `]
})
export class TaskFormComponent implements OnInit {
  cancel = output<void>();
  taskToEdit = input<Task | null>(null);
  
  // Reusable styled string for input classes
  readonly inputClass = "w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 ease-in-out hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  private fb: FormBuilder = inject(FormBuilder);
  taskService = inject(TaskService);
  
  // Dynamic checklist state using Subtask object
  subtasksList = signal<Subtask[]>([]);
  
  // Effort State
  effortHours = 0;
  effortMinutes = 0;

  taskForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    category: ['', Validators.required],
    project: [''],
    startDate: [''],
    deadline: ['', Validators.required],
    estimatedEffort: [''],
    energyLevel: ['Medium'],
    recurrence: ['None'],
    subtasks: [[] as Subtask[]], // Now expects an array
    status: ['Backlog'],
    archived: [false],
    // Phase 2 fields
    completionTime: [''], 
    focusScore: [null],
    interruptions: [''],
    reflection: ['']
  });

  draggedIndex: number | null = null;
  
  // Tags
  tags = signal<string[]>([]);

  ngOnInit() {
    this.taskForm.addValidators((group: AbstractControl): ValidationErrors | null => {
      const start = group.get('startDate')?.value;
      const end = group.get('deadline')?.value;
      const recurrence = group.get('recurrence')?.value;
      
      const errors: any = {};
      const now = new Date();

      if (start) {
        const startDate = new Date(start);
        // Check if start date is in the past (allow if editing and value is unchanged)
        const originalStart = this.taskToEdit()?.startDate;
        const isUnchanged = originalStart === start;

        if (!isUnchanged && startDate < now) {
          // Allow 1 minute buffer for "just now" creation
          if (now.getTime() - startDate.getTime() > 60000) {
            errors.startDateInPast = true;
          }
        }
      }

      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        if (endDate <= startDate) {
          errors.dateRangeInvalid = true;
        }

        // Max 30 Occurrences Validation
        if (recurrence && recurrence !== 'None') {
          const diffTime = endDate.getTime() - startDate.getTime();
          const diffDays = diffTime / (1000 * 3600 * 24);
          
          let maxDays = 0;
          switch (recurrence) {
            case 'Daily': maxDays = 30; break;
            case 'Weekly': maxDays = 30 * 7; break;
            case 'Bi-Weekly': maxDays = 30 * 14; break;
            case 'Monthly': maxDays = 30 * 30.5; break; // Approx
          }

          if (diffDays > maxDays) {
            errors.maxOccurrencesExceeded = true;
          }
        }
      }

      return Object.keys(errors).length > 0 ? errors : null;
    });

    this.taskForm.get('recurrence')?.valueChanges.subscribe(val => {
      this.updateStartDateValidator(val);
    });

    this.taskForm.get('project')?.valueChanges.subscribe(val => {
      this.projectSearch.set(val || '');
    });

    const task = this.taskToEdit();
    if (task) {
      // Patch basics
      this.taskForm.patchValue({
        ...task,
        subtasks: [] // Patch subtasks manually below
      } as any);
      
      // Disable recurrence if it is already set (not None)
      if (task.recurrence && task.recurrence !== 'None') {
        this.taskForm.get('recurrence')?.disable();
      }
      
      // Parse estimated effort back to hours/mins
      if (task.estimatedEffort) {
        const hMatch = task.estimatedEffort.match(/(\d+)\s*(h|hour|hours)/i);
        const mMatch = task.estimatedEffort.match(/(\d+)\s*(m|min|mins|minute|minutes)/i);
        
        if (hMatch) this.effortHours = parseInt(hMatch[1], 10);
        if (mMatch) this.effortMinutes = parseInt(mMatch[1], 10);
      }

      // Pre-fill interruptions
      if (!task.interruptions && task.timerSessionCount && task.timerSessionCount > 0) {
        this.taskForm.patchValue({ interruptions: `${task.timerSessionCount} sessions` });
      }
      
      // Handle Subtasks (Array)
      if (task.subtasks && Array.isArray(task.subtasks)) {
         // Clone to avoid mutating readonly signal directly until submit
         this.subtasksList.set(JSON.parse(JSON.stringify(task.subtasks)));
      }
      this.tags.set(task.tags || []);
    } else {
      // Default Start Date to Today for new tasks
      const now = new Date();
      now.setSeconds(0, 0);
      const offset = now.getTimezoneOffset() * 60000;
      const localIso = new Date(now.getTime() - offset).toISOString().slice(0, 16);
      
      this.taskForm.patchValue({ startDate: localIso });
    }
    
    // Initialize validator based on current value
    this.updateStartDateValidator(this.taskForm.get('recurrence')?.value);
  }

  updateStartDateValidator(recurrence: string | null | undefined) {
    const startDateControl = this.taskForm.get('startDate');
    if (recurrence && recurrence !== 'None') {
      startDateControl?.setValidators([Validators.required]);
    } else {
      startDateControl?.clearValidators();
    }
    startDateControl?.updateValueAndValidity();
  }

  addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !this.tags().includes(trimmed)) {
      this.tags.update(t => [...t, trimmed]);
    }
  }

  removeTag(tagToRemove: string) {
    this.tags.update(t => t.filter(tag => tag !== tagToRemove));
  }

  get isEffortWarning(): boolean {
    return (this.effortHours * 60 + this.effortMinutes) > 120;
  }

  updateEffortString() {
    let str = '';
    if (this.effortHours > 0) str += `${this.effortHours}h`;
    if (this.effortMinutes > 0) {
      if (str.length > 0) str += ' ';
      str += `${this.effortMinutes}m`;
    }
    this.taskForm.patchValue({ estimatedEffort: str });
  }

  addSubtask(input: HTMLInputElement) {
    const val = input.value.trim();
    if (val) {
      const newSubtask: Subtask = {
        id: crypto.randomUUID(),
        text: val,
        completed: false,
        notes: ''
      };
      this.subtasksList.update(list => [...list, newSubtask]);
      input.value = '';
    }
  }

  removeSubtask(index: number) {
    this.subtasksList.update(list => list.filter((_, i) => i !== index));
  }
  
  toggleItemChecked(index: number) {
    this.subtasksList.update(list => list.map((item, i) => {
      if (i === index) {
        return { 
          ...item, 
          completed: !item.completed,
          completedAt: !item.completed ? Date.now() : undefined
        };
      }
      return item;
    }));
  }

  updateSubtaskNote(index: number, note: string) {
    this.subtasksList.update(list => list.map((item, i) => 
      i === index ? { ...item, notes: note } : item
    ));
  }

  // DnD Handlers
  onDragStart(event: DragEvent, index: number) {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
      this.subtasksList.update(list => {
        const newList = [...list];
        const [movedItem] = newList.splice(this.draggedIndex!, 1);
        newList.splice(dropIndex, 0, movedItem);
        return newList;
      });
    }
    this.draggedIndex = null;
  }

  onSubmit() {
    this.taskForm.patchValue({
      subtasks: this.subtasksList()
    });

    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      
      if (this.taskToEdit()) {
        this.taskService.updateTask(this.taskToEdit()!.id, formValue as any);
      } else {
        this.taskService.addTask(formValue as any);
      }
      this.cancel.emit();
    }
  }

  // Project Dropdown Logic
  isProjectDropdownOpen = signal(false);
  projectSearch = signal('');

  filteredProjects = computed(() => {
    const search = this.projectSearch().toLowerCase().trim();
    const all = this.taskService.projects();
    if (!search) return all;
    return all.filter(p => p.toLowerCase().includes(search));
  });

  showCreateProjectOption = computed(() => {
    const search = this.projectSearch().trim();
    if (!search) return false;
    // Don't show create if exact match exists (case insensitive)
    const exists = this.taskService.projects().some(p => p.toLowerCase() === search.toLowerCase());
    return !exists;
  });

  selectProject(proj: string) {
    this.taskForm.patchValue({ project: proj });
    this.isProjectDropdownOpen.set(false);
  }

  closeProjectDropdown() {
    setTimeout(() => {
      this.isProjectDropdownOpen.set(false);
    }, 200);
  }
}