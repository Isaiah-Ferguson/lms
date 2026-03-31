interface SummaryCardProps {
  label: string;
  value: string | number;
}

export function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
