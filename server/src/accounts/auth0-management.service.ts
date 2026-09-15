import { environment } from '../config/environment.js';

interface ManagementTokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: {
  value: string;
  expiresAt: number;
} | null = null;

function getAuth0BaseUrl(): string {
  return environment.auth0IssuerBaseUrl.replace(/\/$/, '');
}

async function getManagementAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const baseUrl = getAuth0BaseUrl();
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: environment.auth0ManagementClientId,
      client_secret: environment.auth0ManagementClientSecret,
      audience: `${baseUrl}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to obtain Auth0 Management API token (${response.status})`);
  }

  const token = (await response.json()) as ManagementTokenResponse;

  if (!token.access_token || !token.expires_in) {
    throw new Error('Auth0 returned an invalid Management API token response');
  }

  cachedToken = {
    value: token.access_token,
    expiresAt: now + token.expires_in * 1000,
  };

  return token.access_token;
}

export async function prepareAuth0UserDeletion(): Promise<string> {
  return getManagementAccessToken();
}

export async function deleteAuth0User(auth0UserId: string, accessToken: string): Promise<void> {
  const baseUrl = getAuth0BaseUrl();

  const response = await fetch(`${baseUrl}/api/v2/users/${encodeURIComponent(auth0UserId)}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Unable to delete Auth0 user (${response.status})`);
  }
}
