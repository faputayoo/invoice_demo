import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/runtime-config";

let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseAdminClient;
}