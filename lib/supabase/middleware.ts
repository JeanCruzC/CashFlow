import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
    getSupabasePublicKey,
    getSupabaseUrl,
    isSupabaseConfigured,
} from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
    const isAuthRoute =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/register");
    const isProtectedRoute =
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/onboarding");

    if (!isAuthRoute && !isProtectedRoute) {
        return NextResponse.next({ request });
    }

    // Skip auth if Supabase is not configured (development without env vars)
    if (!isSupabaseConfigured()) {
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });
    const url = getSupabaseUrl();
    const key = getSupabasePublicKey();

    const supabase = createServerClient(
        url,
        key,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth routes
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
