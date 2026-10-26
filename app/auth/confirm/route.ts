import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("error", "confirmacion");

  if (!tokenHash || type !== "email") {
    return NextResponse.redirect(redirectUrl, 303);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    return NextResponse.redirect(redirectUrl, 303);
  }

  // Confirm the email, but require the user to sign in separately.
  await supabase.auth.signOut({ scope: "local" });

  const successUrl = new URL("/login", request.url);
  successUrl.searchParams.set("estado", "confirmado");

  const response = NextResponse.redirect(successUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}
