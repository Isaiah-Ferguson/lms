export type RosterQuickFilter =
  | "All"
  | "NeedsGrading"
  | "Submitted"
  | "NotSubmitted"
  | "Graded";

interface FiltersBarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  activeFilter: RosterQuickFilter;
  onFilterChange: (filter: RosterQuickFilter) => void;
  counts: Record<RosterQuickFilter, number>;
}

const FILTER_ORDER: RosterQuickFilter[] = [
  "All",
  "NeedsGrading",
  "Submitted",
  "NotSubmitted",
  "Graded",
];

function getFilterLabel(filter: RosterQuickFilter): string {
  switch (filter) {
    case "NeedsGrading":
      return "Needs Grading";
    case "NotSubmitted":
      return "Not Submitted";
    default:
      return filter;
  }
}

export function FiltersBar({
  searchQuery,
  onSearchQueryChange,
  activeFilter,
  onFilterChange,
  counts,
}: FiltersBarProps) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <label htmlFor="submission-search" className="mb-1 block text-xs font-medium text-gray-500">
          Search students
        </label>
        <input
          id="submission-search"
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Name, username, or email"
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_ORDER.map((filter) => {
          const active = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-blue-600 bg-brand-600 text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {getFilterLabel(filter)} ({counts[filter]})
            </button>
          );
        })}
      </div>
    </div>
  );
}
