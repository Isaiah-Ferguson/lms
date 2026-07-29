"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, CheckCircle } from "lucide-react";
import { z } from "zod";
import { authApi, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordFormData) {
    setServerError(null);
    try {
      await authApi.resetPassword(token, data.newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : err.detail || "Could not reset your password. Please request a new link."
        );
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    }
  }

  const inputClass = (hasError: boolean) =>
    `h-10 w-full rounded-lg border bg-white dark:bg-slate-900 pl-10 pr-3 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 ${
      hasError
        ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20"
        : "border-gray-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
    }`;

  if (!token) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Link not valid</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            This reset link is missing its token. Request a new one and use the most recent email.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-300">Password updated</h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Taking you to the sign-in page. You can also{" "}
              <Link href="/login" className="font-semibold underline">
                sign in now
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Choose a new password</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
          This link can only be used once. Signing in elsewhere will end those sessions.
        </p>
      </div>

      {serverError && <Alert variant="error" message={serverError} className="mb-6" />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
          >
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={inputClass(Boolean(errors.newPassword))}
              {...register("newPassword")}
            />
          </div>
          {errors.newPassword && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
          >
            Confirm new password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              className={inputClass(Boolean(errors.confirmPassword))}
              {...register("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:px-20 dark:bg-slate-900">
        <div className="mx-auto w-full max-w-md">
          <Suspense fallback={<p className="text-sm text-gray-600 dark:text-slate-400">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
