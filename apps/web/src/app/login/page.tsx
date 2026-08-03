import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import LoginForm from "@/components/LoginForm";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-neutral-900 text-white">
            <Icon name="fuel" className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              Udyking FIS
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-neutral-400">
              Financial Information System
            </p>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="section-title mb-4">Sign in to your account</h2>
          <LoginForm next={next} />
        </div>
        <p className="mt-4 text-center text-xs text-neutral-400">
          Access is restricted to station operational staff.
        </p>
      </div>
    </div>
  );
}
