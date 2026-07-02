import { ChangeDetectionStrategy, Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <main>
      <router-outlet />
    </main>
    <footer>
      <div class="container footer-grid">
        <div class="footer-brand">
          <h2 style="font-family: var(--font-display); font-weight: 700; color: var(--primary);">MindMirror</h2>
          <p style="margin-top: 0.5rem;">
            Un espacio para la introspección y la claridad mental. Exploramos la complejidad de la mente humana a través de la psicología y la filosofía para ayudarte a vivir una vida más consciente.
          </p>
        </div>
        <div class="footer-column">
          <h4>Enlaces</h4>
          <ul class="footer-links">
            <li><a routerLink="/posts">Posts</a></li>
            <li><a routerLink="/subscribe">Subscribirse</a></li>
            <li><a routerLink="/about">Sobre Nosotros</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 MindMirror. Todos los derechos reservados.</p>
      </div>
    </footer>
  `,
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    /**
     * Al iniciar la app, intentamos restaurar la sesión del usuario
     * leyendo la cookie HTTP-only que el servidor haya establecido previamente.
     * Si no hay sesión activa, el error es silenciado (es el comportamiento esperado).
     */
    this.authService.restoreSession().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {
        // Sin sesión activa — el usuario no está autenticado
      },
    });
  }
}
