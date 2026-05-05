"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

import { registerSchema, type RegisterFormData } from "@/lib/schemas";
import { authApi, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    setServerError(null);
    try {
      await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.errors?.join(" ") ?? err.detail ?? "Registration failed."
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CodeStack LMS</h1>
          <p className="text-sm text-gray-500">Create your student account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Fill in your details to register</CardDescription>
          </CardHeader>

          {serverError && (
            <Alert variant="error" message={serverError} className="mb-5" />
          )}
          {success && (
            <Alert
              variant="success"
              title="Account created!"
              message="Redirecting you to sign in…"
              className="mb-5"
            />
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <Input
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              hint="Min 8 chars, one uppercase, one number"
              error={errors.password?.message}
              {...register("password")}
            />

            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
              disabled={success}
            >
              Create account
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
