import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, tap } from 'rxjs';

import { API_ENDPOINTS } from '../constants/api.constants';
import { ApiResponse, ApiListResponse } from '../interfaces';
import {
  Post,
  PostSummary,
  CreatePostPayload,
  UpdatePostPayload,
} from '../interfaces';

const CACHE_TTL = 30_000; // 30 segundos

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);

  /** Caché simple en memoria para posts publicados */
  private postsCache$: Observable<ApiListResponse<PostSummary>> | null = null;
  private postsCacheTimestamp = 0;

  /**
   * Obtiene los posts publicados con caché en memoria (30s).
   * Si el usuario autenticado es admin, el servidor devuelve todos (incluyendo borradores).
   * Las cookies se envían automáticamente para permitir esa detección.
   */
  getPosts(): Observable<ApiListResponse<PostSummary>> {
    const now = Date.now();
    if (this.postsCache$ && (now - this.postsCacheTimestamp) < CACHE_TTL) {
      return this.postsCache$;
    }
    this.postsCache$ = this.http.get<ApiListResponse<PostSummary>>(API_ENDPOINTS.posts.list, {
      withCredentials: true,
    }).pipe(
      tap(() => this.postsCacheTimestamp = Date.now()),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.postsCache$;
  }

  /** Invalida la caché de posts (útil después de crear/editar/eliminar) */
  invalidatePostsCache(): void {
    this.postsCache$ = null;
    this.postsCacheTimestamp = 0;
  }

  /**
   * Obtiene los borradores del usuario autenticado (o todos si es admin).
   * Requiere cookie JWT.
   */
  getDrafts(): Observable<ApiListResponse<PostSummary>> {
    return this.http.get<ApiListResponse<PostSummary>>(
      API_ENDPOINTS.posts.drafts,
      { withCredentials: true }
    );
  }

  /**
   * Obtiene un post individual por slug, incluyendo el array de content completo.
   */
  getPostBySlug(slug: string): Observable<ApiResponse<Post>> {
    return this.http.get<ApiResponse<Post>>(API_ENDPOINTS.posts.bySlug(slug), {
      withCredentials: true,
    });
  }

  /**
   * Crea un nuevo post enviando multipart/form-data.
   * El campo `content` debe ser un JSON string.
   * El campo `coverImage` es un File opcional.
   */
  createPost(payload: CreatePostPayload): Observable<ApiResponse<Post>> {
    const formData = this.buildPostFormData(payload);

    return this.http.post<ApiResponse<Post>>(API_ENDPOINTS.posts.list, formData, {
      withCredentials: true,
    }).pipe(tap(() => this.invalidatePostsCache()));
  }

  /**
   * Actualiza un post existente enviando JSON parcial.
   * Solo el autor o un admin pueden hacerlo.
   */
  updatePost(
    id: string,
    payload: UpdatePostPayload | FormData
  ): Observable<ApiResponse<Post>> {
    return this.http.put<ApiResponse<Post>>(
      API_ENDPOINTS.posts.byId(id),
      payload,
      { withCredentials: true }
    ).pipe(tap(() => this.invalidatePostsCache()));
  }

  /**
   * Publica un borrador (cambia status a "published").
   * Solo el autor o un admin.
   */
  publishPost(id: string): Observable<ApiResponse<Post>> {
    return this.http.patch<ApiResponse<Post>>(
      API_ENDPOINTS.posts.publish(id),
      {},
      { withCredentials: true }
    ).pipe(tap(() => this.invalidatePostsCache()));
  }

  /**
   * Elimina un post permanentemente.
   * Solo el autor o un admin.
   */
  deletePost(id: string): Observable<ApiResponse<Record<string, never>>> {
    return this.http.delete<ApiResponse<Record<string, never>>>(
      API_ENDPOINTS.posts.byId(id),
      { withCredentials: true }
    ).pipe(tap(() => this.invalidatePostsCache()));
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Construye un FormData a partir del payload de creación.
   * El campo `content` se serializa como JSON string.
   */
  buildPostFormData(payload: CreatePostPayload): FormData {
    const formData = new FormData();

    formData.append('title', payload.title);

    if (payload.excerpt) {
      formData.append('excerpt', payload.excerpt);
    }

    if (payload.status) {
      formData.append('status', payload.status);
    }

    if (payload.tags) {
      formData.append('tags', payload.tags);
    }

    if (payload.content) {
      formData.append('content', payload.content);
    }

    if (payload.coverImage) {
      formData.append('coverImage', payload.coverImage, payload.coverImage.name);
    }

    if (payload.contentImages && payload.contentImages.length > 0) {
      for (const img of payload.contentImages) {
        formData.append('contentImages', img, img.name);
      }
    }

    return formData;
  }
}
