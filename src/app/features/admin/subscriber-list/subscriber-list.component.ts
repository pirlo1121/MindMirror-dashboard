import { ChangeDetectionStrategy, Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';

import { SubscriberService } from '../../../core/services/subscriber.service';
import { Subscriber } from '../../../core/interfaces';

@Component({
  selector: 'app-subscriber-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './subscriber-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriberListComponent implements OnInit {
  private readonly subscriberService = inject(SubscriberService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subscribers = signal<Subscriber[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionLoadingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSubscribers();
  }

  loadSubscribers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.subscriberService.getSubscribers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.subscribers.set(response.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar los suscriptores.');
        this.isLoading.set(false);
      },
    });
  }

  pauseSubscriber(id: string): void {
    this.actionLoadingId.set(id);

    this.subscriberService.pauseSubscriber(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.updateSubscriberInList(response.data);
        this.actionLoadingId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.error ?? 'Error al pausar el suscriptor.');
        this.actionLoadingId.set(null);
      },
    });
  }

  activateSubscriber(id: string): void {
    this.actionLoadingId.set(id);

    this.subscriberService.activateSubscriber(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.updateSubscriberInList(response.data);
        this.actionLoadingId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.error ?? 'Error al activar el suscriptor.');
        this.actionLoadingId.set(null);
      },
    });
  }

  deleteSubscriber(id: string): void {
    if (!confirm('¿Estás seguro de eliminar este suscriptor?')) return;

    this.actionLoadingId.set(id);

    this.subscriberService.deleteSubscriber(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.subscribers.update((list) =>
          list.filter((sub) => sub._id !== id)
        );
        this.actionLoadingId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.error ?? 'Error al eliminar el suscriptor.');
        this.actionLoadingId.set(null);
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private updateSubscriberInList(updated: Subscriber): void {
    this.subscribers.update((list) =>
      list.map((sub) => (sub._id === updated._id ? updated : sub))
    );
  }
}
