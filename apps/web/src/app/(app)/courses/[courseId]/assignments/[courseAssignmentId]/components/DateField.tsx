interface DateFieldProps {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}
