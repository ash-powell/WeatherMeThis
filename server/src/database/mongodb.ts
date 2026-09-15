import { Db, MongoClient } from 'mongodb';

import { environment } from '../config/environment.js';

let client: MongoClient | null = null;
let database: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  client = new MongoClient(environment.mongodbUri);
  await client.connect();

  database = client.db(environment.mongodbDatabase);

  console.log('Connected to MongoDB Atlas');

  return database;
}

export function getDatabase(): Db {
  if (!database) {
    throw new Error('Database accessed before connection was established');
  }

  return database;
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('MongoDB client accessed before connection was established');
  }

  return client;
}

export async function closeDatabaseConnection(): Promise<void> {
  await client?.close();
  client = null;
  database = null;
}
