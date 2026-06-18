import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { assertSupabaseEnv, supabasePublishableKey, supabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  assertSupabaseEnv();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (request.nextUrl.pathname.startsWith('/auth')) {
    console.log(`[Proxy] ${request.nextUrl.pathname} - User:`, user ? user.email : 'none', error ? `Error: ${error.message}` : '');
  }

  return response;
}
