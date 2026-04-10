"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { ReadOnlyGrid } from "@/components/game/ReadOnlyGrid";

type LevelStatus = "DRAFT" | "PUBLISHED";

type AdminLevel = {
  id: string;
  number: number;
  name: string;
  sortOrder: number;
  status: LevelStatus;
  deletedAt: string | null;
  createdBy: { id: string; username: string } | null;
  solveCount: number;
  puzzle: {
    id: string;
    hash: string;
    grid: number[][];
    size: number;
    difficulty: string;
    avgRating: number;
    ratingCount: number;
  };
};

type LevelsResponse = {
  levels: AdminLevel[];
};

type UploadResult = {
  created: Array<{ index: number; levelId: string; number: number; sortOrder: number; name: string }>;
  skipped: Array<{ index: number; hash: string; reason: string }>;
  failed: Array<{ index: number; hash?: string; reason: string }>;
  summary: { total: number; created: number; skipped: number; failed: number };
};

type RowDraft = {
  number: string;
  name: string;
  sortOrder: string;
  status: LevelStatus;
};

const STATUS_OPTIONS = ["all", "PUBLISHED", "DRAFT"] as const;
const DIFFICULTY_OPTIONS = ["all", "easy", "medium", "hard", "expert"] as const;
const SIZE_OPTIONS = ["all", "5", "6", "7", "8", "9", "10"] as const;
const EMPTY_LEVELS: AdminLevel[] = [];

export function LevelsAdminClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTY_OPTIONS)[number]>("all");
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [previewLevelId, setPreviewLevelId] = useState<string | null>(null);
  const [uploadText, setUploadText] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading, isError, isFetching } = useQuery<LevelsResponse>({
    queryKey: ["admin-levels", deferredSearch, status, difficulty, size, showDeleted],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: deferredSearch,
        status,
        difficulty,
        size,
        showDeleted: String(showDeleted),
      });
      const res = await fetch(`/api/admin/levels?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load levels");
      return res.json() as Promise<LevelsResponse>;
    },
  });

  const levels = data?.levels ?? EMPTY_LEVELS;
  const selectedPreviewLevelId =
    previewLevelId && levels.some((level) => level.id === previewLevelId)
      ? previewLevelId
      : levels[0]?.id ?? null;
  const previewLevel =
    levels.find((level) => level.id === selectedPreviewLevelId) ?? null;
  const stats = {
    total: levels.length,
    published: levels.filter((level) => level.status === "PUBLISHED").length,
    draft: levels.filter((level) => level.status === "DRAFT").length,
    deleted: levels.filter((level) => level.deletedAt).length,
  };

  const saveMutation = useMutation({
    mutationFn: async (levelId: string) => {
      const draft = drafts[levelId];
      const level = levels.find((item) => item.id === levelId);
      if (!level) {
        throw new Error("Level not found");
      }
      const res = await fetch(`/api/admin/levels/${levelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: Number.parseInt(draft?.number ?? String(level.number), 10),
          name: draft?.name ?? level.name,
          sortOrder: Number.parseInt(
            draft?.sortOrder ?? String(level.sortOrder),
            10
          ),
          status: draft?.status ?? level.status,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to save level");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (levelId: string) => {
      const res = await fetch(`/api/admin/levels/${levelId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete level");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: unknown[]) => {
      const res = await fetch("/api/admin/levels/batch-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as UploadResult | { error?: unknown };
      if (!res.ok) {
        throw new Error(
          typeof body === "object" && body && "error" in body ? JSON.stringify(body.error) : "Upload failed"
        );
      }
      return body as UploadResult;
    },
    onSuccess: async (result) => {
      setUploadError(null);
      setUploadResult(result);
      await queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
    },
    onError: (error) => {
      setUploadResult(null);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    },
  });

  function updateDraft(levelId: string, patch: Partial<RowDraft>) {
    setDrafts((current) => ({
      ...current,
      [levelId]: { ...current[levelId], ...patch },
    }));
  }

  function handleUpload() {
    setUploadError(null);
    setUploadResult(null);
    try {
      const parsed = JSON.parse(uploadText);
      uploadMutation.mutate(Array.isArray(parsed) ? parsed : [parsed]);
    } catch {
      setUploadError("Upload JSON must be a single puzzle object or an array of puzzle objects.");
    }
  }

  return (
    <div className="min-h-full w-full px-4 py-10 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[24px] border p-6" style={{ background: "var(--surface-01)", borderColor: "var(--border-default)", boxShadow: "var(--glow-xl)" }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[4px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                Admin Console
              </p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
                Levels Control Room
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[var(--text-muted)]">
                Manage ordering, publication, deletion, and uploads from one place.
              </p>
            </div>
            <AdminSectionNav />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              { label: "Loaded", value: stats.total },
              { label: "Published", value: stats.published },
              { label: "Drafts", value: stats.draft },
              { label: "Deleted", value: stats.deleted },
            ].map((item) => (
              <div key={item.label} className="rounded-[14px] border p-4" style={{ background: "var(--surface-02)", borderColor: "var(--border-subtle)" }}>
                <p className="text-[11px] uppercase tracking-[2px] text-[var(--text-muted)]">{item.label}</p>
                <p className="mt-1 text-2xl font-bold" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[22px] border p-5" style={{ background: "var(--surface-01)", borderColor: "var(--border-subtle)" }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[3px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                  Upload
                </p>
                <h2 className="mt-2 text-xl font-bold" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
                  Single or batch import
                </h2>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-[10px] border px-3 py-2 text-xs font-bold uppercase tracking-[2px]" style={{ fontFamily: "var(--font-mono), monospace", borderColor: "var(--border-default)", color: "var(--text-primary)" }}>
                Load JSON file
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    file.text().then((text) => setUploadText(text));
                  }}
                />
              </label>
            </div>
            <textarea
              value={uploadText}
              onChange={(event) => setUploadText(event.target.value)}
              placeholder='[{ "grid": [[0]], "solution": [[0]], "hash": "abc", "size": 1, "difficulty": "easy" }]'
              className="mt-4 min-h-[220px] w-full rounded-[16px] border px-4 py-3 text-sm outline-none"
              style={{ fontFamily: "var(--font-mono), monospace", background: "var(--surface-02)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !uploadText.trim()}
                className="rounded-[10px] px-4 py-2 text-xs font-bold uppercase tracking-[2px] text-white disabled:opacity-40"
                style={{ fontFamily: "var(--font-mono), monospace", background: "var(--gradient-brand)" }}
              >
                {uploadMutation.isPending ? "Uploading..." : "Create Draft Levels"}
              </button>
              {uploadError && <p className="text-sm text-[var(--color-error)]">{uploadError}</p>}
              {uploadResult && <p className="text-sm text-[var(--text-muted)]">{uploadResult.summary.created} created, {uploadResult.summary.skipped} skipped, {uploadResult.summary.failed} failed</p>}
            </div>
          </div>

          <div className="rounded-[22px] border p-5" style={{ background: "var(--surface-01)", borderColor: "var(--border-subtle)" }}>
            <p className="text-xs uppercase tracking-[3px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
              Preview
            </p>
            <h2 className="mt-2 text-xl font-bold" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
              Selected level
            </h2>
            {previewLevel ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[2px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                    #{previewLevel.number} • order {previewLevel.sortOrder}
                  </p>
                  <h3 className="mt-1 text-lg font-bold" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
                    {previewLevel.name}
                  </h3>
                </div>
                <div className="rounded-[18px] border p-4" style={{ borderColor: "var(--border-default)", background: "var(--surface-02)" }}>
                  <ReadOnlyGrid grid={previewLevel.puzzle.grid} cellSize={24} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Meta label="Difficulty" value={previewLevel.puzzle.difficulty} />
                  <Meta label="Size" value={`${previewLevel.puzzle.size}×${previewLevel.puzzle.size}`} />
                  <Meta label="Rating" value={formatRating(previewLevel)} />
                  <Meta label="Created by" value={previewLevel.createdBy?.username ?? "System"} />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">Select a row to preview it.</p>
            )}
          </div>
        </section>

        <section className="rounded-[22px] border p-5" style={{ background: "var(--surface-01)", borderColor: "var(--border-subtle)" }}>
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[3px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                Inventory
              </p>
              <h2 className="mt-2 text-xl font-bold" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
                Levels overview
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or number"
                className="min-w-[220px] rounded-[10px] border px-3 py-2 text-sm outline-none"
                style={{ fontFamily: "var(--font-mono), monospace", background: "var(--surface-02)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              />
              <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
              <FilterSelect value={difficulty} onChange={setDifficulty} options={DIFFICULTY_OPTIONS} />
              <FilterSelect value={size} onChange={setSize} options={SIZE_OPTIONS} />
              <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />
                Show deleted
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-[14px]" style={{ background: "var(--surface-02)" }} />
              ))}
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-[var(--color-error)]">Failed to load admin levels.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                    {["Preview", "Order", "Number", "Name", "Difficulty", "Size", "Status", "Solves", "Rating", "Created By", "Actions"].map((heading) => (
                      <th
                        key={heading}
                        className="px-2 py-3 text-left text-[11px] uppercase tracking-[2px]"
                        style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {levels.map((level) => {
                    const draft = drafts[level.id];
                    const saving = saveMutation.isPending && saveMutation.variables === level.id;
                    const deleting = deleteMutation.isPending && deleteMutation.variables === level.id;
                    return (
                      <tr
                        key={level.id}
                        className="border-b transition-colors"
                        style={{
                          borderColor: "var(--border-subtle)",
                          background:
                            selectedPreviewLevelId === level.id
                              ? "rgba(139,92,246,0.08)"
                              : "transparent",
                          opacity: level.deletedAt ? 0.56 : 1,
                        }}
                      >
                        <td className="px-2 py-3">
                          <button
                            onClick={() => setPreviewLevelId(level.id)}
                            className="rounded-[8px] border px-3 py-1.5 text-xs font-bold uppercase tracking-[2px]"
                            style={{ fontFamily: "var(--font-mono), monospace", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                          >
                            Preview
                          </button>
                        </td>
                        <td className="px-2 py-3">
                          <InlineInput value={draft?.sortOrder ?? String(level.sortOrder)} onChange={(value) => updateDraft(level.id, { sortOrder: value })} width="74px" />
                        </td>
                        <td className="px-2 py-3">
                          <InlineInput value={draft?.number ?? String(level.number)} onChange={(value) => updateDraft(level.id, { number: value })} width="74px" />
                        </td>
                        <td className="px-2 py-3">
                          <InlineInput value={draft?.name ?? level.name} onChange={(value) => updateDraft(level.id, { name: value })} width="220px" />
                        </td>
                        <td className="px-2 py-3 capitalize text-[var(--text-primary)]">{level.puzzle.difficulty}</td>
                        <td className="px-2 py-3 text-[var(--text-primary)]">{level.puzzle.size}×{level.puzzle.size}</td>
                        <td className="px-2 py-3">
                          <select
                            value={draft?.status ?? level.status}
                            onChange={(event) => updateDraft(level.id, { status: event.target.value as LevelStatus })}
                            className="rounded-[10px] border px-3 py-2 text-xs font-bold uppercase tracking-[2px] outline-none"
                            style={{ fontFamily: "var(--font-mono), monospace", background: "var(--surface-02)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="PUBLISHED">PUBLISHED</option>
                          </select>
                        </td>
                        <td className="px-2 py-3 text-[var(--text-primary)]">{level.solveCount}</td>
                        <td className="px-2 py-3 text-[var(--text-primary)]">{formatRating(level)}</td>
                        <td className="px-2 py-3 text-[var(--text-muted)]">{level.createdBy?.username ?? "System"}</td>
                        <td className="px-2 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => saveMutation.mutate(level.id)}
                              disabled={saving || deleting || !!level.deletedAt}
                              className="rounded-[8px] px-3 py-1.5 text-xs font-bold uppercase tracking-[2px] text-white disabled:opacity-40"
                              style={{ fontFamily: "var(--font-mono), monospace", background: "var(--gradient-brand)" }}
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete ${level.name}? This only hides it from public view.`)) {
                                  deleteMutation.mutate(level.id);
                                }
                              }}
                              disabled={deleting || !!level.deletedAt}
                              className="rounded-[8px] border px-3 py-1.5 text-xs font-bold uppercase tracking-[2px] text-[var(--color-error)] disabled:opacity-40"
                              style={{ fontFamily: "var(--font-mono), monospace", borderColor: "#EF444450" }}
                            >
                              {deleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{levels.length} rows</span>
            <span>{isFetching ? "Refreshing..." : "Up to date"}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="rounded-[10px] border px-3 py-2 text-xs font-bold uppercase tracking-[2px] outline-none"
      style={{ fontFamily: "var(--font-mono), monospace", background: "var(--surface-02)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function InlineInput({
  value,
  onChange,
  width,
}: {
  value: string;
  onChange: (value: string) => void;
  width: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-[10px] border px-3 py-2 text-sm outline-none"
      style={{ width, fontFamily: "var(--font-mono), monospace", background: "var(--surface-02)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
    />
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border p-3" style={{ borderColor: "var(--border-default)", background: "rgba(13, 17, 23, 0.46)" }}>
      <p className="mb-1 text-[10px] uppercase tracking-[2px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="truncate text-sm" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

function formatRating(level: AdminLevel) {
  return level.puzzle.ratingCount > 0
    ? `${level.puzzle.avgRating.toFixed(1)} (${level.puzzle.ratingCount})`
    : "—";
}
