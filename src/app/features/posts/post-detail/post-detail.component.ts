import { ChangeDetectionStrategy, Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { Post, ContentBlock } from '../../../core/interfaces';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './post-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);

  readonly post = signal<Post | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly isDeleting = signal(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadPost(slug);
    }
  }

  loadPost(slug: string): void {
    this.postService.getPostBySlug(slug).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.post.set(response.data);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.errorMessage.set('Post no encontrado.');
        } else {
          this.errorMessage.set('Error al cargar el post.');
        }
        this.isLoading.set(false);
      },
    });
  }

  publishPost(): void {
    const current = this.post();
    if (!current) return;

    this.postService.publishPost(current._id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.post.set(response.data);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.error ?? 'Error al publicar el post.');
      },
    });
  }

  deletePost(): void {
    const current = this.post();
    if (!current || !confirm('¿Estás seguro de eliminar este post?')) return;

    this.isDeleting.set(true);

    this.postService.deletePost(current._id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.router.navigate(['/posts']);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.errorMessage.set(error.error?.error ?? 'Error al eliminar el post.');
      },
    });
  }

  /**
   * Type guard para saber si un bloque es del tipo indicado.
   * Facilita el tipado en el template.
   */
  isBlockOfType<T extends ContentBlock['type']>(
    block: ContentBlock,
    type: T
  ): block is Extract<ContentBlock, { type: T }> {
    return block.type === type;
  }
}
