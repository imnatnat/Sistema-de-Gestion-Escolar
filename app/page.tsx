import { redirect } from "next/navigation";

// The proxy normally redirects "/" before this runs. This is the fallback.
export default function Home() {
  redirect("/login");
}
