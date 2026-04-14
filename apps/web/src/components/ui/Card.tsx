"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: CardProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-1", className)}>{children}</div>
  );
}

export function CardTitle({
  children,
  className,
}: CardProps) {
  return (
    <h2 className={cn("text-xl font-semibold text-gray-900 dark:text-slate-100", className)}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className }: CardProps) {
  return (
    <p className={cn("text-sm text-gray-500 dark:text-slate-400", className)}>{children}</p>
  );
}
