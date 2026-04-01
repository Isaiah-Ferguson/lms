"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { instructorApi, type SubmissionDetail } from "@/lib/api-client";
import { getToken, getUserRole } from "@/lib/auth";

interface SubmissionGradingPageProps {
  params: {
    courseId: string;
    courseAssignmentId: string;
    submissionId: string;
  };
}

export default function SubmissionGradingPage({ params }: SubmissionGradingPageProps) {
  const role = getUserRole();
  const canGrade = role === "Admin" || role === "Instructor";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [score, setScore] = useState<string>("");
  const [maxScore, setMaxScore] = useState<string>("100");
  const [comment, setComment] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSubmission() {
      const token = getToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        const submission = await instructorApi.getSubmissionDetail(
          params.submissionId,
          token
        );
        setData(submission);
        setMaxScore(submission.assignment.maxScore.toString());
        if (submission.existingGrade) {
          setScore(submission.existingGrade.totalScore.toString());
          setComment(submission.existingGrade.overallComment);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load submission");
      } finally {
        setLoading(false);
      }
    }

    void loadSubmission();
  }, [params.submissionId]);

  if (!canGrade) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}/submissions`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to submissions
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          You do not have permission to grade submissions.
        </div>
      </div>
    );
  }

  async function handleDownload(url: string, fileName: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Failed to download file: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  async function handleSaveGrade() {
    if (!data) return;

    const parsedMax = Number(maxScore);
    const parsedScore = Number(score);

    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      setSaveMessage("Please enter a valid max score greater than 0.");
      return;
    }

    if (!Number.isFinite(parsedScore) || parsedScore < 0) {
      setSaveMessage("Please enter a valid score.");
      return;
    }

    const token = getToken();
    if (!token) {
      setSaveMessage("Not authenticated");
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      const result = await instructorApi.gradeSubmission(
        params.submissionId,
        {
          TotalScore: parsedScore,
          RubricBreakdownJson: "{}",
          OverallComment: comment,
        },
        token
      );

      setData({
        ...data,
        status: "Graded",
        existingGrade: result,
      });
      setSaveMessage("Grade saved successfully!");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save grade");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <Link
          href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}/submissions`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to submissions
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Loading submission...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <Link
          href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}/submissions`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to submissions
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {error ?? "Submission not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}/submissions`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to submissions
      </Link>

      <header className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Individual submission</h1>
        <p className="mt-1 text-sm text-gray-500">Grade and feedback</p>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-600">Student</p>
            <p className="text-sm font-semibold text-gray-900">
              {data.student.name}
            </p>
            <p className="text-xs text-gray-500">{data.student.email}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-600">Assignment</p>
            <p className="text-sm font-medium text-gray-800">{data.assignment.title}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-600">Submitted At</p>
            <p className="text-sm text-gray-700">{new Date(data.createdAt).toLocaleString()}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-600 mb-2">Submission Files</p>
            {data.artifacts && data.artifacts.length > 0 ? (
              <div className="space-y-2">
                {data.artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    onClick={() => handleDownload(artifact.readUrl, artifact.fileName)}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {artifact.fileName}
                    <span className="text-xs text-gray-500">({(artifact.sizeBytes / 1024 / 1024).toFixed(1)} MB)</span>
                  </button>
                ))}
              </div>
            ) : data.gitHubInfo ? (
              <div className="text-sm text-gray-700">
                <a
                  href={data.gitHubInfo.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {data.gitHubInfo.repoUrl}
                </a>
                <p className="text-xs text-gray-500 mt-1">
                  Branch: {data.gitHubInfo.branch}
                  {data.gitHubInfo.commitHash && ` • Commit: ${data.gitHubInfo.commitHash.substring(0, 7)}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No files uploaded</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Grading form</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Score</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Max score</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Comment</label>
            <textarea
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add feedback for the student"
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <Button size="sm" onClick={handleSaveGrade} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Grade"}
          </Button>

          {saveMessage && (
            <p className={`text-xs ${saveMessage.includes("success") ? "text-green-700" : "text-red-600"}`}>
              {saveMessage}
            </p>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
            <p>
              <span className="font-semibold">Status:</span> {data.status}
            </p>
            <p>
              <span className="font-semibold">Graded At:</span>{" "}
              {data.existingGrade?.gradedAt ? new Date(data.existingGrade.gradedAt).toLocaleString() : "—"}
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
