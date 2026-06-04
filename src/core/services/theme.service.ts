import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal<boolean>(false);

  constructor() {
    // Check system preference or local storage
    const stored = localStorage.getItem('theme');
    if (stored) {
      this.isDarkMode.set(stored === 'dark');
    } else {
      this.isDarkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    effect(() => {
      const isDark = this.isDarkMode();
      const html = document.documentElement;
      if (isDark) {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  toggle() {
    this.isDarkMode.update(v => !v);
  }
}