import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";

export default function LoginPage() {
  return (
    <AuthShell
      mode="login"
      title="Welcome back."
      subtitle="Pick up where you left off."
      cta="Log in"
      alt={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-mint hover:underline">
            Create an account
          </Link>
        </>
      }
    />
  );
}
