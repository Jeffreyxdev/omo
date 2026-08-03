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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Icon name="fuel" className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">Udyking FIS</h1>
            <p className="text-sm text-slate-500">
              Financial Information System for Udyking Filling Station
            </p>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Sign in to your account
          </h2>
          <LoginForm next={next} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Access is restricted to station operational staff.
        </p>
      </div>
    </div>
  );
}
