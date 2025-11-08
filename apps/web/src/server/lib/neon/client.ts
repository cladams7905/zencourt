/**
 * Neon Data API Client
 *
 * Uses PostgREST client for Neon's Data API with Stack Auth JWT authentication.
 */

import { PostgrestClient } from "@supabase/postgrest-js";

const NEON_DATA_API_URL = process.env.NEON_DATA_API_URL;

if (!NEON_DATA_API_URL) {
  console.warn("Neon Data API URL not configured. Set NEON_DATA_API_URL");
}

/**
 * Create a Neon Data API client with authentication
 *
 * @param accessToken - JWT access token from Stack Auth
 * @returns PostgrestClient instance
 */
export function createNeonClient(accessToken: string): PostgrestClient {
  if (!NEON_DATA_API_URL) {
    throw new Error("Neon Data API URL not configured");
  }

  return new PostgrestClient(NEON_DATA_API_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}
