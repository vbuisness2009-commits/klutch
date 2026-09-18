import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignupPage() {
  return (
    <AuthShell
      title="Start being klutch."
      subtitle="Create your account. Take your diagnostic. Get your plan."
      cta="Create account"
      alt={
        <>
          Already have one?{" "}
          <Link href="/login" className="font-semibold text-mint hover:underline">
            Log in
          </Link>
        </>
      }
      showName
    />
  );
}
