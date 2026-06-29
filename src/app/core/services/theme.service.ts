import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly isDarkMode = signal(false);

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') {
        this.setDarkMode(true);
        return;
      }
      if (saved === 'light') {
        this.setDarkMode(false);
        return;
      }
    } catch {
      // localStorage no disponible
    }

    try {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setDarkMode(prefersDark);

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        try {
          if (!localStorage.getItem('theme')) {
            this.setDarkMode(e.matches);
          }
        } catch {
          this.setDarkMode(e.matches);
        }
      });
    } catch {
      // matchMedia no disponible
    }
  }

  toggle(): void {
    this.setDarkMode(!this.isDarkMode());
  }

  private setDarkMode(value: boolean): void {
    this.isDarkMode.set(value);
    document.documentElement.classList.toggle('dark-mode', value);
    try {
      localStorage.setItem('theme', value ? 'dark' : 'light');
    } catch {
      // localStorage no disponible
    }
  }
}
