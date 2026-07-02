import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h1>404 — Página no encontrada</h1>
      <p>La página que buscas no existe o fue movida.</p>
      <a routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class NotFoundComponent {}
