import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Call this at the top of every protected page, action and route handler.
// The proxy is a first gate, not the only one.
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;
  const userId = claims?.sub;
  if (error || !userId) {
    redirect("/login");
  }

  const email = typeof claims?.email === "string" ? claims.email : "";
  return { supabase, userId, email };
}
