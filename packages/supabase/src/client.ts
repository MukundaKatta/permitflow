import { createClient as supabaseCreateClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createClient(supabaseUrl: string, supabaseAnonKey: string) {
  return supabaseCreateClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export function createServiceClient(
  supabaseUrl: string,
  serviceRoleKey: string
) {
  return supabaseCreateClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
