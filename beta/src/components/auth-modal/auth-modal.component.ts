import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './auth-modal.component.html'
})
export class AuthModalComponent {
  close = output<void>();
}