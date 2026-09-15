import { environment } from '../../../environments/environment';

import { inject, Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import type { Observable } from 'rxjs';

import type {
  AccountProfile,
  DeleteAccountRequest,
  UpdateAccountRequest,
} from '../models/account.models';

@Injectable({
  providedIn: 'root',
})
export class AccountApi {
  private readonly http = inject(HttpClient);

  private readonly accountUrl = `${environment.apiBaseUrl}/account/me`;

  getProfile(): Observable<AccountProfile> {
    return this.http.get<AccountProfile>(this.accountUrl);
  }

  updateProfile(request: UpdateAccountRequest): Observable<AccountProfile> {
    return this.http.patch<AccountProfile>(this.accountUrl, request);
  }

  deleteMembership(): Observable<void> {
    const request: DeleteAccountRequest = {
      confirmation: 'DELETE',
    };

    return this.http.delete<void>(this.accountUrl, {
      body: request,
    });
  }
}
