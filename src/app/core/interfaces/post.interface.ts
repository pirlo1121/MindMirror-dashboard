// ─── Tipos de bloques de contenido ───────────────────────────────────────────

export interface ParagraphBlock {
  type: 'paragraph';
  content: string;
}

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
}

export interface ImageBlock {
  type: 'image';
  imageUrl: string;
}

export interface QuoteBlock {
  type: 'quote';
  content: string;
}

export interface ListBlock {
  type: 'list';
  items: string[];
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | QuoteBlock
  | ListBlock;

// ─── Estado y estado de publicación ──────────────────────────────────────────

export type PostStatus = 'draft' | 'published';

// ─── Autor embebido en los posts ──────────────────────────────────────────────

export interface PostAuthor {
  _id: string;
  name: string;
  email: string;
}

// ─── Post completo (incluye content — GET /api/posts/:slug) ──────────────────

export interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  content: ContentBlock[];
  tags: string[];
  author: PostAuthor;
  status: PostStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Post en listado (sin content — GET /api/posts) ──────────────────────────

export type PostSummary = Omit<Post, 'content'>;

// ─── Payload para crear un post (multipart/form-data) ────────────────────────

export interface CreatePostPayload {
  title: string;
  excerpt?: string;
  status?: PostStatus;
  tags?: string;          // JSON string del array de tags (se envía como JSON en FormData)
  content?: string;       // JSON string del array de ContentBlock
  coverImage?: File;
  contentImages?: File[];
}

// ─── Payload para actualizar un post (JSON parcial) ──────────────────────────

export interface UpdatePostPayload {
  title?: string;
  slug?: string;
  excerpt?: string;
  coverImage?: string;
  content?: ContentBlock[];
  tags?: string[];
  status?: PostStatus;
}
