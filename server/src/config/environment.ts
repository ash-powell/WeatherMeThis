import 'dotenv/config';

export interface Environment {
  port: number;
  clientOrigin: string;
  auth0Audience: string;
  auth0IssuerBaseUrl: string;
  auth0ManagementClientId: string;
  auth0ManagementClientSecret: string;
  mongodbUri: string;
  mongodbDatabase: string;
  dnsServers: string[];
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

function readPort(): number {
  const value = process.env.PORT ?? '3000';
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 through 65535');
  }

  return port;
}

function readDnsServers(): string[] {
  return (process.env.DNS_SERVERS ?? '8.8.8.8')
    .split(',')
    .map((server) => server.trim())
    .filter((server) => server.length > 0);
}

export const environment: Readonly<Environment> = Object.freeze({
  port: readPort(),

  clientOrigin: process.env.CLIENT_ORIGIN?.trim() || 'http://localhost:4200',

  auth0Audience: process.env.AUTH0_AUDIENCE?.trim() || 'https://api.weathermethis.com',

  auth0IssuerBaseUrl:
    process.env.AUTH0_ISSUER_BASE_URL?.trim() || 'https://dev-5dl4dwpvi03slphz.us.auth0.com/',

  auth0ManagementClientId: requireEnvironmentVariable('AUTH0_MANAGEMENT_CLIENT_ID'),

  auth0ManagementClientSecret: requireEnvironmentVariable('AUTH0_MANAGEMENT_CLIENT_SECRET'),

  mongodbUri: requireEnvironmentVariable('MONGODB_URI'),

  mongodbDatabase: process.env.MONGODB_DATABASE?.trim() || 'weathermethis',

  dnsServers: readDnsServers(),
});
