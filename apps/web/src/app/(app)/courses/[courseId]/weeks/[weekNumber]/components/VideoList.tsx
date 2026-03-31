import { Pencil, Trash2 } from "lucide-react";
import type { WeekVideo } from "@/lib/week-details-data";

interface VideoListProps {
  videos: WeekVideo[];
  selectedVideoId: string;
  onSelect: (id: string) => void;
  canEdit?: boolean;
  onEdit?: (video: WeekVideo) => void;
  onDelete?: (videoId: string) => void;
}

export function VideoList({ videos, selectedVideoId, onSelect, canEdit, onEdit, onDelete }: VideoListProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Week Videos</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {videos.map((video) => {
          const isSelected = video.id === selectedVideoId;
          return (
            <li key={video.id} className="relative group">
              <button
                type="button"
                onClick={() => onSelect(video.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <p className={`text-xs font-semibold ${isSelected ? "text-blue-700" : "text-gray-500"}`}>
                  Video {video.order}
                </p>
                <p className={`text-sm ${isSelected ? "font-semibold text-blue-900" : "text-gray-700"}`}>
                  {video.title}
                </p>
              </button>
              {canEdit && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(video);
                    }}
                    className="p-1.5 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                    title="Edit video"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(video.id);
                    }}
                    className="p-1.5 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-red-600"
                    title="Delete video"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
