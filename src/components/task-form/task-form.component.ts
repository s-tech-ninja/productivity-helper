import { Component, output, inject, input, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { IconComponent } from '../icons/icon.component';
import { TaskService, Task, Subtask } from '../../services/task.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IconComponent],
  templateUrl: './task-form.component.html',
  styles: [`
    :host ::ng-deep .editor-content ul {
      list-style-type: disc;
      padding-left: 1.25rem;
    }
    :host ::ng-deep .editor-content ol {
      list-style-type: decimal;
      padding-left: 1.25rem;
    }
    :host ::ng-deep .editor-content b, :host ::ng-deep .editor-content strong {
      font-weight: bold;
    }
    :host ::ng-deep .editor-content i, :host ::ng-deep .editor-content em {
      font-style: italic;
    }
    :host ::ng-deep .editor-content u {
      text-decoration: underline;
    }
  `]
})
export class TaskFormComponent implements OnInit {
  cancel = output<void>();
  taskToEdit = input<Task | null>(null);
  
  // Reusable styled string for input classes
  readonly inputClass = "w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 ease-in-out hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;
  
  private fb: FormBuilder = inject(FormBuilder);
  private taskService = inject(TaskService);
  
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
    location: [''],
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
    const task = this.taskToEdit();
    if (task) {
      // Patch basics
      this.taskForm.patchValue({
        ...task,
        subtasks: [] // Patch subtasks manually below
      } as any);
      
      // Disable recurrence if it is already set (not None)
      if (task.recurrence !== 'None') {
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
      
      setTimeout(() => {
        if (this.editorRef && task.description) {
          this.editorRef.nativeElement.innerHTML = task.description;
        }
      }, 0);

      // Handle Subtasks (Array)
      if (task.subtasks && Array.isArray(task.subtasks)) {
         // Clone to avoid mutating readonly signal directly until submit
         this.subtasksList.set(JSON.parse(JSON.stringify(task.subtasks)));
      }
      this.tags.set(task.tags || []);
    }
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

  updateEffortString() {
    let str = '';
    if (this.effortHours > 0) str += `${this.effortHours}h`;
    if (this.effortMinutes > 0) {
      if (str.length > 0) str += ' ';
      str += `${this.effortMinutes}m`;
    }
    this.taskForm.patchValue({ estimatedEffort: str });
  }

  // WYSIWYG Commands
  execCmd(command: string) {
    let value: string | undefined;
    if (command === 'createLink') {
      const url = prompt('Enter link URL:', 'https://');
      if (!url) return;
      value = url;
    }
    document.execCommand(command, false, value);
    if (this.editorRef) {
       this.updateDescription({ target: this.editorRef.nativeElement });
    }
  }

  updateDescription(event: any) {
    const content = event.target.innerHTML;
    this.taskForm.patchValue({ description: content });
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
}