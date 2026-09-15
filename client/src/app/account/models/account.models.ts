export interface AccountProfile {
  displayName: string | null;
}

export interface UpdateAccountRequest {
  displayName: string;
}

export interface DeleteAccountRequest {
  confirmation: 'DELETE';
}
