"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { authApi, ApiError } from "@/lib/api-client";
import { changePasswordSchema, type ChangePasswordFormData } from "@/lib/schemas";
import { getToken, clearToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(data: ChangePasswordFormData) {
    setServerError(null);
    setSuccessMessage(null);

    const token = getToken();
    if (!token) {
      clearToken();
      router.push("/login");
      return;
    }

    try {
      await authApi.changePassword(
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
        token,
      );

      setSuccessMessage("Password updated. Redirecting to home...");
      setTimeout(() => router.push("/home"), 800);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.errors?.join(" ") ?? err.detail);
      } else {
        setServerError("Unable to change password right now.");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Change your password</CardTitle>
            <CardDescription>
              This is required the first time you sign in with a temporary password.
            </CardDescription>
          </CardHeader>

          {serverError && <Alert variant="error" message={serverError} className="mb-5" />}
          {successMessage && <Alert variant="success" message={successMessage} className="mb-5" />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.currentPassword?.message}
              {...register("currentPassword")}
            />

            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              hint="Min 8 chars, one uppercase, one number"
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />

            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Update password
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
            Need to return to sign in?{" "}
            <Link href="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Back to login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
