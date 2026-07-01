import { Component, OnInit, inject, signal } from '@angular/core';
// import { computed } from '@angular/core'; // ⚠️ Descomentar si se reactiva el filtro por tags
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { PostSummary } from '../../../core/interfaces';

@Component({
  selector: 'app-post-all',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title" style="font-family: var(--font-display); font-weight: 700; color: var(--primary);">
            Todos los Artículos
          </h1>
          <p style="font-size: 1rem; color: var(--on-surface-variant); margin-top: 0.25rem;">
            Explora todas las reflexiones, análisis y escritos.
          </p>
        </div>
        @if (authService.isLoggedIn()) {
          <a routerLink="/posts/new" class="btn btn-primary">
            <span class="material-symbols-outlined">add</span> Nuevo Post
          </a>
        }
      </div>

      @if (isLoading()) {
        <div style="text-align: center; padding: 4rem 0;">
          <p style="font-size: 1.2rem; color: var(--on-surface-variant);">Cargando artículos...</p>
        </div>
      } @else if (errorMessage()) {
        <div class="alert alert-error" role="alert">
          <span class="material-symbols-outlined">error</span>
          {{ errorMessage() }}
        </div>
      } @else if (posts().length === 0) {
        <div style="text-align: center; padding: 6rem 0;">
          <span class="material-symbols-outlined" style="font-size: 48px; color: var(--outline-variant); margin-bottom: 1rem; display: block;">article</span>
          <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">No hay artículos publicados</h3>
        </div>
      } @else {
        <!-- ═══════════════════════════════════════════════════════════
             🚫 FILTRO POR CATEGORÍA COMENTADO
             ═══════════════════════════════════════════════════════════
             Para reactivar, descomentar en TS:
               - import { computed }
               - selectedTag, allTags, filteredPosts, selectTag()
             Y descomentar el CSS .filter-tag en styles.css

        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap;">
          <span style="font-size: 0.85rem; font-weight: 600; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.05em; margin-right: 0.5rem;">Categorías</span>
          <button type="button" class="filter-tag" [class.active]="selectedTag() === null" (click)="selectTag(null)">Todos</button>
          @for (tag of allTags(); track tag) {
            <button type="button" class="filter-tag" [class.active]="selectedTag() === tag" (click)="selectTag(tag)">{{ tag }}</button>
          }
        </div>

        <div style="text-align: center; padding: 4rem 0;">
          <span class="material-symbols-outlined" style="font-size: 48px; color: var(--outline-variant); margin-bottom: 1rem; display: block;">filter_alt_off</span>
          <p style="font-size: 1.1rem; color: var(--on-surface-variant); margin-bottom: 1rem;">No hay artículos con esa categoría.</p>
          <button type="button" class="btn btn-secondary" (click)="selectTag(null)">Ver todos</button>
        </div>
        ═══════════════════════════════════════════════════════════ -->

          <div class="grid-bento section-gap">
            @for (post of posts(); track post._id) {
              <article class="card">
                <a [routerLink]="['/posts', post.slug]" class="card-image-wrapper" style="display: block; text-decoration: none; cursor: pointer;">
                  <img class="card-image" [src]="post.coverImage || ''" [alt]="post.title" />
                  @if (post.tags && post.tags.length > 0) {
                    <span class="card-badge">{{ post.tags[0] }}</span>
                  } @else {
                    <span class="card-badge">Reflexión</span>
                  }
                </a>
                <div class="card-body">
                  <h3 class="card-title">
                    <a [routerLink]="['/posts', post.slug]">{{ post.title }}</a>
                  </h3>
                  <p class="card-excerpt">
                    {{ post.excerpt || 'Una exploración a fondo sobre nuevos conceptos del ser, de la mente y de la psicología moderna.' }}
                  </p>
                  <div class="card-meta">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <span class="material-symbols-outlined" style="font-size: 16px;">person</span>
                      <span>{{ post.author.name }}</span>
                    </div>
                    <span>
                      @if (post.publishedAt) {
                        {{ post.publishedAt | date: 'mediumDate' }}
                      } @else {
                        {{ post.createdAt | date: 'mediumDate' }}
                      }
                    </span>
                  </div>
                  <a [routerLink]="['/posts', post.slug]" class="btn btn-primary btn-sm" style="width: 100%; margin-top: 0.75rem;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span> Leer artículo completo
                  </a>
                  @if (authService.isLoggedIn()) {
                    <div style="margin-top: 0.75rem; border-top: 1px solid rgba(197, 198, 206, 0.2); padding-top: 0.75rem; display: flex; justify-content: flex-end;">
                      <a [routerLink]="['/posts', post._id, 'edit']" class="btn btn-secondary btn-sm">
                        <span class="material-symbols-outlined" style="font-size: 16px;">edit</span> Editar
                      </a>
                    </div>
                  }
                </div>
              </article>
            }
          </div>
      }
    </div>
  `,
})
export class PostAllComponent implements OnInit {
  private readonly postService = inject(PostService);
  readonly authService = inject(AuthService);

  readonly posts = signal<PostSummary[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  // ═══════════════════════════════════════════════════════════════
  //  🚫 FILTRO POR CATEGORÍA COMENTADO
  //  ═══════════════════════════════════════════════════════════════
  //  Para reactivar:
  //    1. Descomentar import { computed } al inicio del archivo
  //    2. Descomentar las líneas de abajo
  //    3. Descomentar el CSS .filter-tag en styles.css
  //    4. Descomentar el HTML del filtro en el template
  //
  // readonly selectedTag = signal<string | null>(null);
  //
  // readonly allTags = computed(() => {
  //   const tagSet = new Set<string>();
  //   for (const post of this.posts()) {
  //     for (const tag of post.tags) {
  //       tagSet.add(tag);
  //     }
  //   }
  //   return Array.from(tagSet).sort();
  // });
  //
  // readonly filteredPosts = computed(() => {
  //   const tag = this.selectedTag();
  //   return tag ? this.posts().filter(p => p.tags.includes(tag)) : this.posts();
  // });
  // ═══════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.postService.getPosts().subscribe({
      next: (response) => {
        this.posts.set(response.data);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set('Error al cargar los posts.');
        this.isLoading.set(false);
      },
    });
  }

  // 🚫 selectTag(tag: string | null): void {
  //   this.selectedTag.set(tag);
  // }
}
