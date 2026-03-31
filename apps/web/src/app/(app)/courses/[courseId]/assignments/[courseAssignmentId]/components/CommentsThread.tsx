"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { commentsApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

export interface ThreadMessage {
  id: string;
  authorId: string;
  authorName: string;
  isStaff: boolean;
  staffOnly: boolean;
  body: string;
  createdAt: string;
}

interface CommentsThreadProps {
  assignmentId: string;
  initialMessages: ThreadMessage[];
  currentUserId: string;
  currentUserName: string;
  isStaff: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommentsThread({
  assignmentId,
  initialMessages,
  currentUserId,
  currentUserName,
  isStaff,
}: CommentsThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [staffOnly, setStaffOnly] = useState(false);
  const [posting, setPosting] = useState(false);

  // Students never see staffOnly messages
  const visible = isStaff
    ? messages
    : messages.filter((m) => !m.staffOnly);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    
    const token = getToken();
    if (!token) return;

    setPosting(true);
    try {
      const comment = await commentsApi.addComment(assignmentId, body, token);
      
      const msg: ThreadMessage = {
        id: comment.id,
        authorId: comment.authorId,
        authorName: comment.authorName,
        isStaff,
        staffOnly: false,
        body: comment.message,
        createdAt: comment.createdAt,
      };
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      setStaffOnly(false);
    } catch (error) {
    } finally {
      setPosting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">Private Comments</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          {isStaff
            ? "Per-student private threads are available in the submissions view."
            : "Visible only to you and instructors"}
        </p>
      </div>

      {/* Message list */}
      <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-4">
        {visible.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          visible.map((msg) => {
            const isMe = msg.authorId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-600">
                    {isMe ? "Me" : msg.authorName}
                  </span>
                  <span>{formatTime(msg.createdAt)}</span>
                  {msg.staffOnly && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      Staff only
                    </span>
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMe
                      ? "rounded-tr-sm bg-blue-600 text-white"
                      : "rounded-tl-sm bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-100 px-5 py-4 space-y-2">
        {isStaff && (
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={staffOnly}
              onChange={(e) => setStaffOnly(e.target.checked)}
              className="rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            Staff-only note (students won't see this)
          </label>
        )}
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Type a message… (Ctrl+Enter to send)"
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="self-end flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2
              text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
