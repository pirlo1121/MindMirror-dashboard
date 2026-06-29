import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PostService } from '../../../core/services/post.service';
import {
  ContentBlock,
  CreatePostPayload,
  PostStatus,
} from '../../../core/interfaces';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './post-form.component.html',
})
export class PostFormComponent implements OnInit {
  private readonly postService = inject(PostService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedCoverImage = signal<File | null>(null);

  /** En modo edición se almacena el ID del post */
  readonly editingPostId = signal<string | null>(null);

  readonly postForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    excerpt: ['', [Validators.maxLength(500)]],
    status: ['draft' as PostStatus],
    tags: [''],
    content: this.fb.array([]),
  });

  get contentArray(): FormArray {
    return this.postForm.get('content') as FormArray;
  }

  ngOnInit(): void {
    // Si hay un ID en la ruta, estamos en modo edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingPostId.set(id);
      this.loadPostForEditing(id);
    }
  }

  // ─── Carga de post para edición ───────────────────────────────────────────

  private loadPostForEditing(id: string): void {
    // Nota: el endpoint de edición recibe el ID, pero para pre-cargar el form
    // podemos usar el slug o el listado. Aquí asumimos que navigamos con el slug
    // y que el componente recibe el ID por parámetro de ruta.
    // En un flujo real, se pasaría el slug como input o se haría una llamada adicional.
  }

  // ─── Manejo de imagen de portada ──────────────────────────────────────────

  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedCoverImage.set(file);
  }

  // ─── Bloques de contenido ─────────────────────────────────────────────────

  addParagraphBlock(): void {
    const block = this.fb.group({
      type: ['paragraph'],
      content: ['', Validators.required],
    });
    this.contentArray.push(block);
  }

  addHeadingBlock(): void {
    const block = this.fb.group({
      type: ['heading'],
      level: [2, [Validators.required, Validators.min(1), Validators.max(6)]],
      content: ['', Validators.required],
    });
    this.contentArray.push(block);
  }

  addImageBlock(): void {
    const block = this.fb.group({
      type: ['image'],
      imageUrl: ['', Validators.required],
    });
    this.contentArray.push(block);
  }

  addQuoteBlock(): void {
    const block = this.fb.group({
      type: ['quote'],
      content: ['', Validators.required],
    });
    this.contentArray.push(block);
  }

  addListBlock(): void {
    const block = this.fb.group({
      type: ['list'],
      // items se serializa como CSV que se splitea antes de enviar
      items: ['', Validators.required],
    });
    this.contentArray.push(block);
  }

  removeBlock(index: number): void {
    this.contentArray.removeAt(index);
  }

  // ─── Envío del formulario ─────────────────────────────────────────────────

  onSubmit(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValue = this.postForm.value;
    const contentBlocks = this.buildContentBlocks(formValue.content);

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
    };

    const request$ = this.editingPostId()
      ? this.postService.updatePost(this.editingPostId()!, {
        title: payload.title,
        excerpt: payload.excerpt,
        status: payload.status,
        tags: payload.tags ? (JSON.parse(payload.tags) as string[]) : undefined,
        content: contentBlocks,
      })
      : this.postService.createPost(payload);

    request$.subscribe({
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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Convierte los valores del FormArray en ContentBlock tipados.
   * Los bloques "list" tienen sus items en formato CSV.
   */
  private buildContentBlocks(rawBlocks: any[]): ContentBlock[] {
    return rawBlocks.map((raw) => {
      if (raw.type === 'list') {
        return {
          type: 'list',
          items: (raw.items as string)
            .split('\n')
            .map((i: string) => i.trim())
            .filter(Boolean),
        } as ContentBlock;
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
