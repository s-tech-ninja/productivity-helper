import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@/src/shared/components/icons/icon.component';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './help-modal.component.html'
})
export class HelpComponent {
  close = output<void>();
}
