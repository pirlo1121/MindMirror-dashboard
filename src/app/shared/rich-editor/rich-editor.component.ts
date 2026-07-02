import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ContentBlock } from '../../core/interfaces';

interface AddMenuState {
  index: number;
  type: 'before' | 'after';
}

@Component({
  selector: 'app-rich-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rich-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichEditorComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  /** Map de blob URLs creadas para previews de imágenes, para evitar fugas de memoria */
  private readonly blobUrlCache = new Map<number, string>();
  @Input() blocks: ContentBlock[] = [];
  @Input() contentImageFiles: Record<number, File> = {};
  @Output() blocksChange = new EventEmitter<ContentBlock[]>();
  @Output() contentImageFilesChange = new EventEmitter<Record<number, File>>();

  @ViewChildren('blockContent') blockContentElements!: QueryList<ElementRef>;

  // Drag state
  readonly dragIndex = signal<number | null>(null);
  readonly dragOverIndex = signal<number | null>(null);

  // Focus
  readonly focusedIndex = signal<number | null>(null);

  // Add-block popover
  readonly addMenu = signal<AddMenuState | null>(null);

  // Fullscreen
  readonly isFullscreen = signal(false);

  // Word count
  readonly wordCount = computed(() =>
    this.blocks.reduce((count, block) => {
      const text =
        block.type === 'list'
          ? block.items.join(' ')
          : 'content' in block
            ? (block as any).content || ''
            : '';
      return count + text.split(/\s+/).filter(Boolean).length;
    }, 0),
  );

  readonly charCount = computed(() =>
    this.blocks.reduce((count, block) => {
      const text =
        block.type === 'list'
          ? block.items.join(' ')
          : 'content' in block
            ? (block as any).content || ''
            : '';
      return count + text.length;
    }, 0),
  );

  ngAfterViewInit(): void {
    this.autoResizeAll();
  }

  // ─── Drag & Drop ────────────────────────────────────────────────────────────

  onDragStart(event: DragEvent, index: number): void {
    this.dragIndex.set(index);
    event.dataTransfer?.setData('text/plain', String(index));
    event.dataTransfer!.effectAllowed = 'move';
    const el = event.target as HTMLElement;
    el.closest('.block-wrapper')?.classList.add('dragging');
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverIndex.set(index);
  }

  onDragLeave(_event: DragEvent): void {
    this.dragOverIndex.set(null);
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer?.getData('text/plain'));
    if (isNaN(fromIndex) || fromIndex === dropIndex) {
      this.cleanupDrag();
      return;
    }
    const newBlocks = [...this.blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    const adjustedDrop = dropIndex > fromIndex ? dropIndex - 1 : dropIndex;
    newBlocks.splice(adjustedDrop, 0, moved);
    this.blocks = newBlocks;
    this.emitChange();
    this.cleanupDrag();
  }

  private cleanupDrag(): void {
    this.dragIndex.set(null);
    this.dragOverIndex.set(null);
    document.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
  }

  // ─── Block Operations ───────────────────────────────────────────────────────

  insertBlock(type: ContentBlock['type'], index: number): void {
    const block = this.createBlock(type);
    const newBlocks = [...this.blocks];
    newBlocks.splice(index, 0, block);
    this.blocks = newBlocks;
    this.addMenu.set(null);
    this.emitChange();
    setTimeout(() => this.focusBlock(index), 50);
  }

  removeBlock(index: number): void {
    const newBlocks = [...this.blocks];
    newBlocks.splice(index, 1);
    this.blocks = newBlocks;

    const newFiles = { ...this.contentImageFiles };
    const newCache = new Map<number, string>();
    const removedKeys = Object.keys(newFiles)
      .map(Number)
      .filter((k) => k >= index);
    for (const k of removedKeys) {
      if (k === index) {
        this.revokeBlobUrl(k);
        delete newFiles[k];
      } else if (k > index) {
        const url = this.blobUrlCache.get(k);
        if (url) {
          newCache.set(k - 1, url);
        }
        delete newFiles[k];
      }
    }
    for (const [k, url] of this.blobUrlCache) {
      if (k < index) {
        newCache.set(k, url);
      }
    }
    this.blobUrlCache.clear();
    for (const [k, url] of newCache) {
      this.blobUrlCache.set(k, url);
    }
    this.contentImageFiles = newFiles;
    this.contentImageFilesChange.emit(this.contentImageFiles);
    this.emitChange();
    this.autoResizeAll();
  }

  moveBlock(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.blocks.length) return;
    const newBlocks = [...this.blocks];
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    this.blocks = newBlocks;

    const newFiles = { ...this.contentImageFiles };
    if (newFiles[index] || newFiles[target]) {
      const temp = newFiles[index];
      newFiles[index] = newFiles[target];
      newFiles[target] = temp;
      this.contentImageFiles = newFiles;
      this.contentImageFilesChange.emit(this.contentImageFiles);
    }

    const urlA = this.blobUrlCache.get(index);
    const urlB = this.blobUrlCache.get(target);
    if (urlA || urlB) {
      const newCache = new Map(this.blobUrlCache);
      if (urlA) newCache.set(target, urlA);
      if (urlB) newCache.set(index, urlB);
      this.blobUrlCache.clear();
      for (const [k, url] of newCache) {
        this.blobUrlCache.set(k, url);
      }
    }
    this.emitChange();
  }

  changeBlockType(index: number, newType: ContentBlock['type']): void {
    const current = this.blocks[index];
    if (current.type === newType) return;

    const text = this.getBlockText(current);
    const newBlock = this.createBlock(newType, text);
    const newBlocks = [...this.blocks];
    newBlocks[index] = newBlock;
    this.blocks = newBlocks;
    this.emitChange();
    setTimeout(() => this.focusBlock(index), 50);
  }

  updateHeadingLevel(index: number, level: string): void {
    const numLevel = Number(level) as 1 | 2 | 3 | 4 | 5 | 6;
    if (numLevel < 1 || numLevel > 6) return;
    const newBlocks = [...this.blocks];
    const block = { ...newBlocks[index] } as any;
    block.level = numLevel;
    newBlocks[index] = block;
    this.blocks = newBlocks;
    this.emitChange();
  }

  updateBlockContent(index: number, value: string): void {
    const newBlocks = [...this.blocks];
    const block = { ...newBlocks[index] } as any;
    if (block.type === 'list') {
      block.items = value.split('\n').map((i: string) => i.trim()).filter(Boolean);
    } else {
      block.content = value;
    }
    newBlocks[index] = block;
    this.blocks = newBlocks;
    this.emitChange();
  }

  // ─── Image Handling ────────────────────────────────────────────────────────

  onImageFileSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.revokeBlobUrl(index);
    const newFiles = { ...this.contentImageFiles };
    newFiles[index] = file;
    this.contentImageFiles = newFiles;
    this.contentImageFilesChange.emit(this.contentImageFiles);

    const blobUrl = URL.createObjectURL(file);
    this.blobUrlCache.set(index, blobUrl);
    const newBlocks = [...this.blocks];
    const block = { ...newBlocks[index] } as any;
    block.imageUrl = blobUrl;
    newBlocks[index] = block;
    this.blocks = newBlocks;
    this.emitChange();
  }

  updateImageUrl(index: number, url: string): void {
    const newBlocks = [...this.blocks];
    const block = { ...newBlocks[index] } as any;
    block.imageUrl = url;
    newBlocks[index] = block;
    this.blocks = newBlocks;
    if (!url) {
      const newFiles = { ...this.contentImageFiles };
      delete newFiles[index];
      this.contentImageFiles = newFiles;
      this.contentImageFilesChange.emit(this.contentImageFiles);
    }
    this.emitChange();
  }

  removeImage(index: number): void {
    const newBlocks = [...this.blocks];
    const block = { ...newBlocks[index] } as any;
    block.imageUrl = '';
    newBlocks[index] = block;
    this.blocks = newBlocks;
    const newFiles = { ...this.contentImageFiles };
    delete newFiles[index];
    this.contentImageFiles = newFiles;
    this.contentImageFilesChange.emit(this.contentImageFiles);
    this.revokeBlobUrl(index);
    this.emitChange();
  }

  getImagePreview(index: number): string | null {
    const block = this.blocks[index];
    if (block.type !== 'image') return null;
    if (this.contentImageFiles[index]) {
      const cached = this.blobUrlCache.get(index);
      if (cached) {
        return cached;
      }
      const url = URL.createObjectURL(this.contentImageFiles[index]);
      this.blobUrlCache.set(index, url);
      return url;
    }
    return block.imageUrl || null;
  }

  private revokeBlobUrl(index: number): void {
    const existing = this.blobUrlCache.get(index);
    if (existing) {
      URL.revokeObjectURL(existing);
      this.blobUrlCache.delete(index);
    }
  }

  // ─── Keyboard Navigation ────────────────────────────────────────────────────

  onBlockKeyDown(event: KeyboardEvent, index: number): void {
    const block = this.blocks[index];

    if (event.key === 'Enter' && !event.shiftKey) {
      if (block.type === 'list') return;
      event.preventDefault();
      const payload = this.createBlock('paragraph');
      const newBlocks = [...this.blocks];
      newBlocks.splice(index + 1, 0, payload);
      this.blocks = newBlocks;
      this.emitChange();
      setTimeout(() => this.focusBlock(index + 1), 50);
      return;
    }

    if (event.key === 'Backspace') {
      const el = event.target as HTMLTextAreaElement | HTMLInputElement;
      const isEmpty =
        block.type === 'list'
          ? block.items.length === 0 || block.items.every((i) => !i.trim())
          : !el?.value?.trim();

      if (isEmpty && this.blocks.length > 1) {
        event.preventDefault();
        this.removeBlock(index);
        setTimeout(() => this.focusBlock(Math.max(0, index - 1)), 50);
        return;
      }
    }

    if (event.key === 'ArrowUp' && event.ctrlKey) {
      event.preventDefault();
      this.moveBlock(index, -1);
      setTimeout(() => this.focusBlock(index - 1), 50);
    }

    if (event.key === 'ArrowDown' && event.ctrlKey) {
      event.preventDefault();
      this.moveBlock(index, 1);
      setTimeout(() => this.focusBlock(index + 1), 50);
    }
  }

  // ─── Focus Management ──────────────────────────────────────────────────────

  focusBlock(index: number): void {
    this.focusedIndex.set(index);
    const els = this.blockContentElements?.toArray();
    if (els?.[index]) {
      els[index].nativeElement.focus();
    }
  }

  onBlockFocus(index: number): void {
    this.focusedIndex.set(index);
  }

  onBlockBlur(): void {
    setTimeout(() => this.focusedIndex.set(null), 200);
  }

  // ─── Add-Menu ───────────────────────────────────────────────────────────────

  toggleAddMenu(index: number, type: 'before' | 'after'): void {
    const current = this.addMenu();
    if (current && current.index === index && current.type === type) {
      this.addMenu.set(null);
    } else {
      this.addMenu.set({ index, type });
    }
  }

  closeAddMenu(): void {
    this.addMenu.set(null);
  }

  // ─── Fullscreen ─────────────────────────────────────────────────────────────

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private createBlock(type: ContentBlock['type'], existingText?: string): ContentBlock {
    const text = existingText || '';
    switch (type) {
      case 'paragraph':
        return { type: 'paragraph', content: text };
      case 'heading':
        return { type: 'heading', level: 2, content: text };
      case 'quote':
        return { type: 'quote', content: text };
      case 'list':
        return { type: 'list', items: text ? text.split('\n').filter(Boolean) : [''] };
      case 'image':
        return { type: 'image', imageUrl: '' };
    }
  }

  private getBlockText(block: ContentBlock): string {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'quote':
        return block.content;
      case 'list':
        return block.items.join('\n');
      case 'image':
        return '';
    }
  }

  autoResize(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(textarea.scrollHeight, 60) + 'px';
  }

  autoResizeAll(): void {
    setTimeout(() => {
      this.blockContentElements?.forEach((el) => {
        if (el.nativeElement.tagName === 'TEXTAREA') {
          this.autoResize(el.nativeElement);
        }
      });
    }, 0);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private emitChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.blocksChange.emit(this.blocks);
      this.debounceTimer = null;
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    for (const url of this.blobUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlCache.clear();
  }
}
