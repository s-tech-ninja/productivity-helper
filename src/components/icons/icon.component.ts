import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './icon.component.html'
})
export class IconComponent {
  name = input.required<string>();
  size = input<number>(24);
  class = input<string>('');
}