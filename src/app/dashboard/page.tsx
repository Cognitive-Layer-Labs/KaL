import { redirect } from "next/navigation";

// The dashboard has moved to /account (reachable from the navbar account icon).
export default function DashboardPage() {
  redirect("/account");
}
