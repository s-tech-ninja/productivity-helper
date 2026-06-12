import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/icons/icon.component';

@Component({
  selector: 'app-final-review-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './final-review-modal.component.html',
})
export class FinalReviewModalComponent {
  taskPayload = input.required<any>();
  confirm = output<void>();
  cancel = output<void>();
}