"use client";

import { useRef, useState } from "react";
import { GraduationCap, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { adminParticipantsApi, uploadFileToBlobSas, ApiError } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10MB

interface GraduationCardProps {
  userId: string;
  initialHasGraduated: boolean;
  certificateUrl: string | null;
  certificateFileName: string | null;
  onGraduationSave: (hasGraduated: boolean) => void;
  onCertificateSaved: (certificateUrl: string, certificateFileName: string) => void;
  onCertificateRemoved: () => void;
}

export function GraduationCard({
  userId,
  initialHasGraduated,
  certificateUrl,
  certificateFileName,
  onGraduationSave,
  onCertificateSaved,
  onCertificateRemoved,
}: GraduationCardProps) {
  const [hasGraduated, setHasGraduated] = useState(initialHasGraduated);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function flashSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleSaveStatus() {
    const token = getToken();
    if (!token) {
      setError("You must be signed in.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await adminParticipantsApi.setGraduationStatus(userId, hasGraduated, token);
      onGraduationSave(hasGraduated);
      flashSuccess("Completion status updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update completion status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setSuccess(null);

    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload the certificate as a PDF file.");
      return;
    }

    if (file.size > MAX_CERTIFICATE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`Certificate is too large (${sizeMB}MB). Please upload a PDF smaller than 10MB.`);
      return;
    }

    const token = getToken();
    if (!token) {
      setError("You must be signed in.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const slot = await adminParticipantsApi.generateCertificateUploadSlot(
        userId,
        { fileName: file.name, contentType: "application/pdf", sizeBytes: file.size },
        token
      );

      await uploadFileToBlobSas(slot.sasUrl, file, "application/pdf", setUploadProgress);

      await adminParticipantsApi.saveCertificate(
        userId,
        { blobPath: slot.blobPath, fileName: file.name },
        token
      );

      onCertificateSaved(slot.readUrl, file.name);
      flashSuccess("Certificate uploaded.");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : err instanceof Error ? err.message : "Certificate upload failed.";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveCertificate() {
    const token = getToken();
    if (!token) {
      setError("You must be signed in.");
      return;
    }

    setError(null);
    setSuccess(null);
    setRemoving(true);
    try {
      await adminParticipantsApi.removeCertificate(userId, token);
      onCertificateRemoved();
      flashSuccess("Certificate removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to remove certificate.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <ProfileCard
      title="Program Completion"
      description="Mark the student as having completed the program and attach their certificate."
    >
      <div className="space-y-4">
        {/* Toggle row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap
              className={`h-4 w-4 ${hasGraduated ? "text-emerald-600" : "text-gray-400"}`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              {hasGraduated ? "Program complete" : "Program not complete"}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hasGraduated}
            aria-label="Program complete"
            onClick={() => setHasGraduated((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
              hasGraduated ? "bg-emerald-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                hasGraduated ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <Button
          size="sm"
          onClick={handleSaveStatus}
          loading={saving}
          className={hasGraduated ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/40" : ""}
        >
          Save status
        </Button>

        {/* Certificate */}
        <div className="border-t border-gray-100 pt-4 dark:border-slate-700">
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-slate-300">
            Certificate <span className="text-gray-400">(PDF, up to 10MB — visible to the student)</span>
          </p>

          {certificateUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <a
                href={certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{certificateFileName ?? "certificate.pdf"}</span>
              </a>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  loading={uploading}
                >
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRemoveCertificate}
                  loading={removing}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Remove certificate</span>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              loading={uploading}
            >
              <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {uploading ? `Uploading… ${uploadProgress}%` : "Upload certificate (PDF)"}
            </Button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload certificate PDF"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </div>
    </ProfileCard>
  );
}
