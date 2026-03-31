"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Users, TrendingUp, ArrowRight } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/schemas";
import { authApi, ApiError } from "@/lib/api-client";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import codestackLogo from "@/assets/codestack.png";
import csaLargeLogo from "@/assets/CSALargeLOGO.png";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Load saved email on mount if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setValue('email', savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      const tokens = await authApi.login(data);
      setToken(tokens.accessToken, tokens.expiresIn);
      
      // Save or clear email based on remember me checkbox
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Force a hard reload to clear any cached data from previous sessions
      const destination = tokens.mustChangePassword ? "/change-password" : "/home";
      window.location.href = destination;
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.status === 401
            ? "Invalid email or password."
            : err.detail
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left side: Who We Are ──────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-sky-500">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative flex flex-col justify-center px-12 xl:px-20 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Logo */}
            <div className="mb-8">
              <Image
                src={codestackLogo}
                alt="CodeStack Academy"
                height={50}
                width={200}
                className="h-12 w-auto object-contain brightness-0 invert"
              />
            </div>

            <div>
              <h1 className="text-4xl xl:text-5xl font-bold mb-4 leading-tight">
                Who We Are
              </h1>
              <p className="text-lg text-brand-50/90 leading-relaxed max-w-xl">
                Code Stack Academy is Stockton&apos;s first immersive and accelerated code
                school offered by the San Joaquin County Office of Education.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 pt-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Affordable Education</h3>
                  <p className="text-sm text-brand-50/80">Non-profit tuition at a fraction of for-profit code schools</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Community Focused</h3>
                  <p className="text-sm text-brand-50/80">Building skilled software engineers in San Joaquin County</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Career Ready</h3>
                  <p className="text-sm text-brand-50/80">Meet employer demand and change the tech landscape</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right side: Login Form ─────────────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 flex-col bg-white">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md mx-auto"
          >
            {/* Mobile logo */}
            <div className="lg:hidden mb-8 flex justify-center">
              <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-sky-500 rounded-2xl p-6">
                <Image
                  src={csaLargeLogo}
                  alt="CodeStack Academy"
                  height={60}
                  width={240}
                  className="h-16 w-auto object-contain"
                />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to access your learning dashboard
              </p>
            </div>

            {serverError && (
              <Alert variant="error" message={serverError} className="mb-6" />
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
                autoComplete="current-password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register("password")}
              />

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remember me
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/30"
                size="lg"
                loading={isSubmitting}
              >
                <span className="flex items-center justify-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Need an account? Contact your administrator.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
