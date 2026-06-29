import { redirect } from "next/navigation";

// Public self-registration is disabled. Accounts are provisioned by administrators.
// This route is kept only to redirect any old links to the sign-in page.
export default function RegisterPage() {
  redirect("/login");
}
