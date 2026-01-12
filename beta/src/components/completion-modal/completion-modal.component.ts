import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icons/icon.component';
import { Task } from '../../services/task.service';

@Component({
  selector: 'app-completion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './completion-modal.component.html'
})
export class CompletionModalComponent {
  task = input.required<Task>();
  confirm = output<{ focusScore: number; reflection: string }>();
  cancel = output<void>();

  focusScore = signal<number>(3); // Default to middle
  reflection = '';

  onSubmit() {
    this.confirm.emit({
      focusScore: this.focusScore(),
      reflection: this.reflection
    });
  }
}