import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@/src/shared/components/icons/icon.component';


@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './confirmation-modal.component.html'
})
export class ConfirmationModalComponent {
  title = input<string>('Are you sure?');
  message = input<string>('This action cannot be undone.');
  actionText = input<string>('Delete');
  
  confirm = output<void>();
  cancel = output<void>();
}
