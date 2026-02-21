"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createClient() {
    const url = getSupabaseUrl();
    const key = getSupabasePublicKey();

    return createBrowserClient(
        url,
        key
    );
}
