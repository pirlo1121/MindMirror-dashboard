import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { PostSummary } from '../../../core/interfaces';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './post-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostListComponent implements OnInit {
  private readonly postService = inject(PostService);
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);

  readonly posts = signal<PostSummary[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly showAllLink = computed(() => this.posts().length > 4);

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.postService.getPosts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
}
