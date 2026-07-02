import { ChangeDetectionStrategy, Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { SubscriberService } from '../../../core/services/subscriber.service';
import { CreateSubscriberPayload } from '../../../core/interfaces';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './subscribe.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscribeComponent {
  private readonly subscriberService = inject(SubscriberService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly subscribeForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.subscribeForm.invalid) {
      this.subscribeForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: CreateSubscriberPayload = this.subscribeForm.value;

    this.subscriberService.subscribe(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set(
          `¡Gracias ${response.data.name}! Te has suscrito correctamente.`
        );
        this.subscribeForm.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        const apiError = error.error;

        if (apiError?.errors?.length) {
          this.errorMessage.set(apiError.errors[0].msg);
        } else {
          this.errorMessage.set(apiError?.error ?? 'Error al suscribirse.');
        }
      },
    });
  }

  get nameControl() {
    return this.subscribeForm.get('name')!;
  }

  get emailControl() {
    return this.subscribeForm.get('email')!;
  }
}
