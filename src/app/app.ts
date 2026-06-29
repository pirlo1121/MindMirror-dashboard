import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent],
  template: `
    <app-navbar />
    <main>
      <router-outlet />
    </main>
    <footer>
      <div class="container footer-grid">
        <div class="footer-brand">
          <h2 style="font-family: var(--font-display); font-weight: 700; color: var(--primary);">MindMirror</h2>
          <p style="margin-top: 1rem;">
            Un espacio para la introspección y la claridad mental. Exploramos la complejidad de la mente humana a través de la psicología y la filosofía para ayudarte a vivir una vida más consciente.
          </p>
        </div>
        <div class="footer-column">
          <h4>Categorías</h4>
          <ul class="footer-links">
            <li><a routerLink="/posts">Psicología</a></li>
            <li><a routerLink="/posts">Filosofía</a></li>
            <li><a routerLink="/posts">Reflexiones</a></li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>Comunidad</h4>
          <ul class="footer-links">
            <li><a routerLink="/subscribe">Newsletter</a></li>
            <li><a href="#">Membresías</a></li>
            <li><a href="#">Talleres</a></li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>Proyecto</h4>
          <ul class="footer-links">
            <li><a href="#">Sobre Nosotros</a></li>
            <li><a href="#">Contacto</a></li>
            <li><a href="#">Privacidad</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 MindMirror. Todos los derechos reservados. Diseñado para pensadores profundos.</p>
      </div>
    </footer>
  `,
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    /**
     * Al iniciar la app, intentamos restaurar la sesión del usuario
     * leyendo la cookie HTTP-only que el servidor haya establecido previamente.
     * Si no hay sesión activa, el error es silenciado (es el comportamiento esperado).
     */
    this.authService.restoreSession().subscribe({
      error: () => {
        // Sin sesión activa — el usuario no está autenticado
      },
    });
  }
}
