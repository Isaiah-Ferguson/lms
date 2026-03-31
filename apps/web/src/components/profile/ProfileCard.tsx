import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

interface ProfileCardProps {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function ProfileCard({ title, description, rightSlot, children }: ProfileCardProps) {
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        {rightSlot}
      </div>
      {children}
    </Card>
  );
}
