import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // ─── Raíz: redirige al listado de posts ────────────────────────────────────
  {
    path: '',
    redirectTo: 'posts',
    pathMatch: 'full',
  },

  // ─── Autenticación (solo para usuarios no autenticados) ────────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },

  // ─── Posts ─────────────────────────────────────────────────────────────────
  {
    path: 'posts',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/posts/post-list/post-list.component').then(
            (m) => m.PostListComponent
          ),
      },
      {
        path: 'new',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/posts/post-form/post-form.component').then(
            (m) => m.PostFormComponent
          ),
      },
      {
        path: ':id/edit',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/posts/post-form/post-form.component').then(
            (m) => m.PostFormComponent
          ),
      },
      {
        path: 'all',
        loadComponent: () =>
          import('./features/posts/post-all/post-all.component').then(
            (m) => m.PostAllComponent
          ),
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./features/posts/post-detail/post-detail.component').then(
            (m) => m.PostDetailComponent
          ),
      },
    ],
  },

  // ─── Borradores (usuario autenticado) ──────────────────────────────────────
  {
    path: 'drafts',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/posts/post-drafts/post-drafts.component').then(
        (m) => m.PostDraftsComponent
      ),
  },

  // ─── Perfil (usuario autenticado) ──────────────────────────────────────────
  {
    path: 'profile',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
  },

  // ─── Suscripción al newsletter (pública) ───────────────────────────────────
  {
    path: 'subscribe',
    loadComponent: () =>
      import('./features/subscribers/subscribe/subscribe.component').then(
        (m) => m.SubscribeComponent
      ),
  },

  // ─── Panel de administración ───────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'subscribers',
        pathMatch: 'full',
      },
      {
        path: 'subscribers',
        loadComponent: () =>
          import(
            './features/admin/subscriber-list/subscriber-list.component'
          ).then((m) => m.SubscriberListComponent),
      },
    ],
  },

  // ─── Ruta comodín ──────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./shared/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];
