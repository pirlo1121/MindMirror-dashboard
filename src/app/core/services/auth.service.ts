import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, shareReplay } from 'rxjs';

import { API_ENDPOINTS } from '../constants/api.constants';
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UserProfile,
  AuthUser,
} from '../interfaces';
import { ApiResponse } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Estado reactivo del usuario actual usando Signals
  private readonly _currentUser = signal<AuthUser | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _sessionChecked = signal<boolean>(false);

  // Señales públicas de solo lectura
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly sessionChecked = this._sessionChecked.asReadonly();

  // Valores derivados
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');

  // Observable compartido para evitar múltiples llamadas a restoreSession
  private restoreSession$: Observable<ApiResponse<UserProfile>> | null = null;

  /**
   * Intenta restaurar la sesión del usuario al iniciar la app.
   * La cookie HTTP-only se envía automáticamente; si es válida,
   * el servidor devuelve el perfil del usuario.
   */
  restoreSession(): Observable<ApiResponse<UserProfile>> {
    if (!this.restoreSession$) {
      this._isLoading.set(true);
      this.restoreSession$ = this.http
        .get<ApiResponse<UserProfile>>(API_ENDPOINTS.auth.profile, {
          withCredentials: true,
        })
        .pipe(
          tap((response) => {
            if (response.success) {
              const { _id, name, email, role } = response.data;
              this._currentUser.set({ id: _id, name, email, role });
            }
            this._isLoading.set(false);
            this._sessionChecked.set(true);
          }),
          catchError((error) => {
            this._currentUser.set(null);
            this._isLoading.set(false);
            this._sessionChecked.set(true);
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
    }
    return this.restoreSession$;
  }

  /**
   * Inicia sesión. El servidor establece la cookie HTTP-only automáticamente.
   */
  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(API_ENDPOINTS.auth.login, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._currentUser.set(response.user);
            this.restoreSession$ = null;
            this._sessionChecked.set(false);
          }
        })
      );
  }

  /**
   * Registra un nuevo usuario. El servidor establece la cookie HTTP-only.
   */
  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(API_ENDPOINTS.auth.register, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._currentUser.set(response.user);
          }
        })
      );
  }

  /**
   * Cierra la sesión. El servidor limpia la cookie HTTP-only.
   */
  logout(): Observable<ApiResponse<Record<string, never>>> {
    return this.http
      .post<ApiResponse<Record<string, never>>>(
        API_ENDPOINTS.auth.logout,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap(() => {
          this._currentUser.set(null);
          this.restoreSession$ = null;
          this._sessionChecked.set(false);
          this.router.navigate(['/login']);
        }),
        catchError((error) => {
          this._currentUser.set(null);
          this.restoreSession$ = null;
          this._sessionChecked.set(false);
          this.router.navigate(['/login']);
          return throwError(() => error);
        })
      );
  }

  /**
   * Limpia la sesión localmente sin realizar peticiones HTTP.
   * Útil para cuando ya sabemos que la sesión expiró (error 401).
   */
  clearSession(): void {
    this._currentUser.set(null);
    this.restoreSession$ = null;
    this._sessionChecked.set(false);
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el perfil completo del usuario autenticado.
   */
  getProfile(): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(API_ENDPOINTS.auth.profile, {
      withCredentials: true,
    });
  }
}
