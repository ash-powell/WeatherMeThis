export interface AccountProfile {
  displayName: string | null;
}

export interface AccountDocument {
  auth0UserId: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}
