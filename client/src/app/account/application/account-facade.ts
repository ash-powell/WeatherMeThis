import { inject, Injectable, signal } from '@angular/core';

import { tap } from 'rxjs';

import type { Observable } from 'rxjs';

import { AccountApi } from '../data-access/account-api';

import type { AccountProfile } from '../models/account.models';

@Injectable({
  providedIn: 'root',
})
export class AccountFacade {
  private readonly accountApi = inject(AccountApi);

  readonly profile = signal<AccountProfile | null>(null);

  loadProfile(): Observable<AccountProfile> {
    return this.accountApi.getProfile().pipe(
      tap((profile) => {
        this.profile.set(profile);
      }),
    );
  }

  updateDisplayName(displayName: string): Observable<AccountProfile> {
    return this.accountApi
      .updateProfile({
        displayName,
      })
      .pipe(
        tap((profile) => {
          this.profile.set(profile);
        }),
      );
  }

  deleteMembership(): Observable<void> {
    return this.accountApi.deleteMembership().pipe(
      tap(() => {
        this.profile.set(null);
      }),
    );
  }
}
