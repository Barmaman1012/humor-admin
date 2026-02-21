"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDataTable } from "@/components/AdminDataTable";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatColumnLabel, type RowData } from "@/lib/admin/table-helpers";

const PIPELINE_BASE = "https://api.almostcrackd.ai/pipeline";

type Props = {
  rows: RowData[];
};

export function AdminImagesClient({ rows }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [createdRowId, setCreatedRowId] = useState<string | number | null>(null);

  const columns = useMemo(
    () => [
      { key: "url", label: "Thumbnail", type: "image" as const },
      { key: "id", label: "ID" },
      {
        key: "created_datetime_utc",
        label: formatColumnLabel("created_datetime_utc"),
        type: "date" as const,
      },
      { key: "url", label: "URL" },
      { key: "profile_id", label: formatColumnLabel("profile_id") },
    ],
    []
  );

  const getAccessToken = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Unable to load access token.");
    return token;
  };

  const extractErrorMessage = (payload: unknown, fallback: string) => {
    if (typeof payload === "string") return payload;
    if (!payload || typeof payload !== "object") return fallback;
    const message =
      (payload as { error?: string; message?: string }).error ??
      (payload as { error?: string; message?: string }).message;
    return message ?? fallback;
  };

  const uploadFileToPresignedUrl = async (url: string, fileToUpload: File) => {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", fileToUpload.type);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error("Upload failed."));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed."));
      xhr.send(fileToUpload);
    });
  };

  const createImageRow = async (cdnUrl: string) => {
    const response = await fetch("/admin/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: cdnUrl }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "Failed to create image row.")
      );
    }
    const created = Array.isArray(payload?.data)
      ? payload.data[0]
      : payload?.data;
    if (!created?.id) {
      throw new Error("Image row created but id was missing from response.");
    }
    return created;
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setUploadedUrl(null);
    setCreatedRowId(null);
    setStatus("Requesting upload URL...");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = await getAccessToken();
      const presignResponse = await fetch(`${PIPELINE_BASE}/generate-presigned-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });

      const presignPayload = await presignResponse.json().catch(() => ({}));
      if (!presignResponse.ok) {
        throw new Error(
          extractErrorMessage(presignPayload, "Failed to get presigned URL.")
        );
      }

      const presignedUrl = presignPayload?.presignedUrl;
      const cdnUrl = presignPayload?.cdnUrl;
      if (!presignedUrl || !cdnUrl) {
        throw new Error("Missing upload URL response data.");
      }

      setStatus("Uploading file...");
      await uploadFileToPresignedUrl(presignedUrl, file);

      setStatus("Registering upload...");
      const pipelineResponse = await fetch(`${PIPELINE_BASE}/upload-image-from-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cdnUrl }),
      });
      const pipelinePayload = await pipelineResponse.json().catch(() => ({}));
      if (!pipelineResponse.ok) {
        throw new Error(
          extractErrorMessage(pipelinePayload, "Pipeline registration failed.")
        );
      }

      setStatus("Saving image record...");
      const created = await createImageRow(cdnUrl);
      setUploadedUrl(cdnUrl);
      setCreatedRowId(created.id);

      setStatus("Upload complete.");
      setFile(null);
      setUploadProgress(100);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualUrl = async () => {
    if (!manualUrl.trim()) return;
    setError(null);
    setUploadedUrl(null);
    setCreatedRowId(null);
    setStatus("Registering URL...");
    setIsUploading(true);
    try {
      const token = await getAccessToken();
      const pipelineResponse = await fetch(`${PIPELINE_BASE}/upload-image-from-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cdnUrl: manualUrl.trim() }),
      });
      const pipelinePayload = await pipelineResponse.json().catch(() => ({}));
      if (!pipelineResponse.ok) {
        throw new Error(
          extractErrorMessage(pipelinePayload, "Pipeline registration failed.")
        );
      }

      setStatus("Saving image record...");
      const created = await createImageRow(manualUrl.trim());
      setUploadedUrl(manualUrl.trim());
      setCreatedRowId(created.id);
      setStatus("Image saved.");
      setManualUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Upload image</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a new image file or register an existing CDN URL.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-700">
              Upload file
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isUploading ? "Uploading..." : "Upload image"}
            </button>
            {isUploading ? (
              <div className="space-y-1 text-xs text-slate-600">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 bg-slate-900 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div>{status ?? "Working..."}</div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-700">
              Create from URL
            </div>
            <input
              type="url"
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleManualUrl}
              disabled={!manualUrl.trim() || isUploading}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {isUploading ? "Saving..." : "Create from URL"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {status && !isUploading && !error ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {status}
          </div>
        ) : null}
        {uploadedUrl ? (
          <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div>
              <span className="font-semibold">Uploaded URL:</span>{" "}
              <span className="break-all">{uploadedUrl}</span>
            </div>
            {createdRowId ? (
              <div>
                <span className="font-semibold">DB row created:</span>{" "}
                {createdRowId}
              </div>
            ) : null}
            <div className="pt-2">
              <img
                src={uploadedUrl}
                alt="Uploaded preview"
                className="h-20 w-20 rounded-lg object-cover"
              />
            </div>
          </div>
        ) : null}
      </section>

      <AdminDataTable
        title="Images"
        description="Manage stored images and metadata."
        rows={rows}
        columns={columns}
        createEnabled
        editEnabled
        deleteEnabled
        apiTable="images"
        createFields={[
          { key: "url", label: "Image URL", type: "url", required: true },
        ]}
        editFields={[
          { key: "url", label: "Image URL", type: "url", required: true },
        ]}
      />
    </div>
  );
}
