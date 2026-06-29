import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { DatePipe } from '@angular/common';

import { PostService } from '../../../core/services/post.service';
import { PostSummary } from '../../../core/interfaces';

@Component({
  selector: 'app-post-drafts',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './post-drafts.component.html',
})
export class PostDraftsComponent implements OnInit {
  private readonly postService = inject(PostService);

  readonly drafts = signal<PostSummary[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly publishingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDrafts();
  }

  loadDrafts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.postService.getDrafts().subscribe({
      next: (response) => {
        this.drafts.set(response.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar los borradores.');
        this.isLoading.set(false);
      },
    });
  }

  publishDraft(id: string): void {
    this.publishingId.set(id);

    this.postService.publishPost(id).subscribe({
      next: () => {
        // Remover de la lista de borradores al publicar
        this.drafts.update((drafts) =>
          drafts.filter((draft) => draft._id !== id)
        );
        this.publishingId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.error ?? 'Error al publicar el borrador.'
        );
        this.publishingId.set(null);
      },
    });
  }
}
