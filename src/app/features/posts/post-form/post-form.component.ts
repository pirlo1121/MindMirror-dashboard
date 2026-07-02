import { ChangeDetectionStrategy, Component, OnInit, inject, signal, ViewChild, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PostService } from '../../../core/services/post.service';
import { RichEditorComponent } from '../../../shared/rich-editor/rich-editor.component';
import {
  ContentBlock,
  CreatePostPayload,
  PostStatus,
} from '../../../core/interfaces';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, RichEditorComponent],
  templateUrl: './post-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostFormComponent implements OnInit {
  private readonly postService = inject(PostService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(RichEditorComponent) richEditor!: RichEditorComponent;

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedCoverImage = signal<File | null>(null);
  readonly editingPostId = signal<string | null>(null);

  readonly postForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    excerpt: ['', [Validators.maxLength(500)]],
    status: ['draft' as PostStatus],
    tags: [''],
  });

  /** Bloques de contenido manejados por el RichEditorComponent */
  contentBlocks: ContentBlock[] = [];
  contentImageFiles: Record<number, File> = {};

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingPostId.set(id);
      this.loadPostForEditing(id);
    }
  }

  private loadPostForEditing(id: string): void {
    // TODO: implementar carga de post para edición
  }

  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedCoverImage.set(file);
  }

  onSubmit(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValue = this.postForm.value;

    const contentImages: File[] = [];
    const contentBlocks = this.buildContentBlocks(contentImages);

    const tagsArray = formValue.tags
      ? (formValue.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    const payload: CreatePostPayload = {
      title: formValue.title,
      excerpt: formValue.excerpt || undefined,
      status: formValue.status,
      tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : undefined,
      content: JSON.stringify(contentBlocks),
      coverImage: this.selectedCoverImage() ?? undefined,
      contentImages: contentImages.length > 0 ? contentImages : undefined,
    };

    const request$ = this.editingPostId()
      ? this.postService.updatePost(this.editingPostId()!, this.postService.buildPostFormData(payload))
      : this.postService.createPost(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.router.navigate(['/posts', response.data.slug]);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        const apiError = error.error;
        if (Array.isArray(apiError?.error)) {
          this.errorMessage.set(apiError.error.join(', '));
        } else {
          this.errorMessage.set(apiError?.error ?? 'Error al guardar el post.');
        }
      },
    });
  }

  private buildContentBlocks(contentImages: File[]): ContentBlock[] {
    return this.contentBlocks.map((raw, index) => {
      if (raw.type === 'list') {
        return {
          type: 'list',
          items: raw.items,
        } as ContentBlock;
      }
      if (raw.type === 'image') {
        const file = this.contentImageFiles[index];
        if (file) {
          contentImages.push(file);
          return { type: 'image', imageUrl: '__UPLOAD__' } as ContentBlock;
        }
      }
      return raw as ContentBlock;
    });
  }

  get titleControl() {
    return this.postForm.get('title')!;
  }

  get excerptControl() {
    return this.postForm.get('excerpt')!;
  }
}
