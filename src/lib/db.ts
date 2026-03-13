import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | null = null;

export function hasDatabaseConfig() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri);
  }

  return connectionPromise;
}
