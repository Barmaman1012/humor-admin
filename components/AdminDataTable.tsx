"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatDateValue,
  formatValue,
  truncateText,
  type AdminColumnType,
  type RowData,
} from "@/lib/admin/table-helpers";

export type AdminTableColumn = {
  key: string;
  label?: string;
  type?: AdminColumnType;
  maxLength?: number;
};

export type AdminFormField = {
  key: string;
  label?: string;
  type?: "text" | "number" | "boolean" | "json" | "textarea" | "url";
  required?: boolean;
  placeholder?: string;
};

type Props = {
  title?: string;
  description?: string;
  rows: RowData[];
  columns: AdminTableColumn[];
  idKey?: string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  createEnabled?: boolean;
  editEnabled?: boolean;
  deleteEnabled?: boolean;
  apiTable?: string;
  createFields?: AdminFormField[];
  editFields?: AdminFormField[];
  emptyMessage?: string;
};

const DEFAULT_ID_KEY = "id";

export function AdminDataTable({
  title,
  description,
  rows,
  columns,
  idKey = DEFAULT_ID_KEY,
  enableSearch = true,
  searchPlaceholder = "Search...",
  createEnabled = false,
  editEnabled = false,
  deleteEnabled = false,
  apiTable,
  createFields,
  editFields,
  emptyMessage = "No rows found.",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rowsState, setRowsState] = useState<RowData[]>(rows);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRow, setEditingRow] = useState<RowData | null>(null);
  const [formValues, setFormValues] = useState<
    Record<string, string | boolean>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setRowsState(rows);
  }, [rows]);

  useEffect(() => {
    if (!actionSuccess) return;
    const timer = setTimeout(() => setActionSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [actionSuccess]);

  const filteredRows = useMemo(() => {
    if (!enableSearch || !query.trim()) return rowsState;
    const q = query.toLowerCase();
    return rowsState.filter((row) =>
      Object.values(row).some(
        (value) =>
          typeof value === "string" && value.toLowerCase().includes(q)
      )
    );
  }, [rowsState, query, enableSearch]);

  const toggleExpandedCell = (key: string) => {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const initFormValues = (fields: AdminFormField[], row?: RowData | null) => {
    const values: Record<string, string | boolean> = {};
    for (const field of fields) {
      const rawValue = row ? row[field.key] : undefined;
      if (field.type === "boolean") {
        values[field.key] = Boolean(rawValue);
      } else if (rawValue === null || rawValue === undefined) {
        values[field.key] = "";
      } else if (field.type === "json") {
        values[field.key] = JSON.stringify(rawValue, null, 2);
      } else {
        values[field.key] = String(rawValue);
      }
    }
    return values;
  };

  const openCreate = () => {
    if (!createFields || !apiTable) return;
    setFormValues(initFormValues(createFields));
    setFormError(null);
    setShowCreate(true);
  };

  const openEdit = (row: RowData) => {
    if (!editFields || !apiTable) return;
    setFormValues(initFormValues(editFields, row));
    setFormError(null);
    setEditingRow(row);
  };

  const closeModal = () => {
    setShowCreate(false);
    setEditingRow(null);
    setFormError(null);
  };

  const handleFormChange = (key: string, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const parseFormValues = (fields: AdminFormField[]) => {
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      const rawValue = formValues[field.key];
      if (field.type === "boolean") {
        values[field.key] = Boolean(rawValue);
        continue;
      }
      const value = typeof rawValue === "string" ? rawValue.trim() : "";
      if (!value) {
        values[field.key] = null;
        continue;
      }
      if (field.type === "number") {
        const num = Number(value);
        if (Number.isNaN(num)) {
          return { error: `${field.label ?? field.key} must be a number.` };
        }
        values[field.key] = num;
        continue;
      }
      if (field.type === "json") {
        try {
          values[field.key] = JSON.parse(value);
        } catch {
          return { error: `${field.label ?? field.key} must be valid JSON.` };
        }
        continue;
      }
      values[field.key] = value;
    }
    return { values };
  };

  const request = async (url: string, options: RequestInit) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error ?? "Request failed.");
    }
    return payload;
  };

  const handleCreate = async () => {
    if (!createFields || !apiTable) return;
    setFormError(null);
    setActionError(null);
    const parsed = parseFormValues(createFields);
    if ("error" in parsed) {
      setFormError(parsed.error ?? "Invalid input.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = await request(`/admin/api/${apiTable}`, {
        method: "POST",
        body: JSON.stringify(parsed.values),
      });
      const created = Array.isArray(payload?.data)
        ? payload.data[0]
        : payload?.data;
      if (created) {
        setRowsState((prev) => [created, ...prev]);
      }
      setActionSuccess("Created.");
      closeModal();
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Create failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editFields || !apiTable || !editingRow) return;
    setFormError(null);
    setActionError(null);
    const parsed = parseFormValues(editFields);
    if ("error" in parsed) {
      setFormError(parsed.error ?? "Invalid input.");
      return;
    }
    const rowId = editingRow[idKey];
    if (rowId === null || rowId === undefined) {
      setFormError("Row is missing an id.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = await request(`/admin/api/${apiTable}/${rowId}`, {
        method: "PATCH",
        body: JSON.stringify(parsed.values),
      });
      const updated = payload?.data;
      if (updated) {
        setRowsState((prev) =>
          prev.map((row) => (row[idKey] === rowId ? updated : row))
        );
      }
      setActionSuccess("Updated.");
      closeModal();
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row: RowData) => {
    if (!apiTable) return;
    setActionError(null);
    setActionSuccess(null);
    const rowId = row[idKey];
    if (rowId === null || rowId === undefined) {
      setActionError("Row is missing an id.");
      return;
    }
    const confirmed = window.confirm("Delete this row? This cannot be undone.");
    if (!confirmed) return;
    setIsSubmitting(true);
    try {
      await request(`/admin/api/${apiTable}/${rowId}`, {
        method: "DELETE",
      });
      setRowsState((prev) => prev.filter((item) => item[idKey] !== rowId));
      setActionSuccess("Deleted.");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCell = (row: RowData, column: AdminTableColumn, rowIndex: number) => {
    const value = row[column.key];
    const type = column.type ?? "text";
    if (type === "image") {
      const url = typeof value === "string" ? value : "";
      const showImage = url.startsWith("http");
      return showImage ? (
        <img
          src={url}
          alt={column.label ?? column.key}
          className="h-12 w-12 rounded-lg object-cover"
        />
      ) : (
        <span className="text-xs text-slate-500">
          {url ? "URL not previewable" : "—"}
        </span>
      );
    }
    if (type === "date") {
      return formatDateValue(value);
    }
    if (type === "json") {
      return value ? JSON.stringify(value) : "—";
    }
    if (type === "long-text") {
      const rawText = value ? String(value) : "";
      if (!rawText) return "—";
      const maxLength = column.maxLength ?? 160;
      const cellKey = `${rowIndex}-${column.key}`;
      const isExpanded = expandedCells.has(cellKey);
      const displayText = isExpanded
        ? rawText
        : truncateText(rawText, maxLength);
      return (
        <div className="space-y-2">
          <div className="whitespace-pre-wrap text-slate-900">
            {displayText}
          </div>
          {rawText.length > maxLength ? (
            <button
              type="button"
              onClick={() => toggleExpandedCell(cellKey)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      );
    }
    return formatValue(value);
  };

  const showActions = editEnabled || deleteEnabled;

  return (
    <div className="space-y-4">
      {(title || description) && (
        <div>
          {title ? (
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          {rowsState.length} row{rowsState.length === 1 ? "" : "s"}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {enableSearch ? (
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            />
          ) : null}
          {createEnabled && apiTable ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create
            </button>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}
      {actionSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {actionSuccess}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  {column.label ?? column.key}
                </th>
              ))}
              {showActions ? (
                <th className="px-4 py-3 text-right">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-slate-500"
                  colSpan={columns.length + (showActions ? 1 : 0)}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rowIndex) => (
                <tr key={String(row[idKey] ?? rowIndex)} className="align-top">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-slate-700">
                      {renderCell(row, column, rowIndex)}
                    </td>
                  ))}
                  {showActions ? (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {editEnabled ? (
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                        ) : null}
                        {deleteEnabled ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            disabled={isSubmitting}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(showCreate || editingRow) && (createFields || editFields) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {showCreate ? "Create row" : "Edit row"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {(showCreate ? createFields : editFields)?.map((field) => {
                const value = formValues[field.key];
                const label = field.label ?? field.key;
                if (field.type === "boolean") {
                  return (
                    <label key={field.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(event) =>
                          handleFormChange(field.key, event.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  );
                }
                if (field.type === "textarea" || field.type === "json") {
                  return (
                    <label key={field.key} className="block text-sm">
                      <span className="font-medium text-slate-700">{label}</span>
                      <textarea
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) =>
                          handleFormChange(field.key, event.target.value)
                        }
                        placeholder={field.placeholder}
                        rows={field.type === "json" ? 6 : 4}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  );
                }
                return (
                  <label key={field.key} className="block text-sm">
                    <span className="font-medium text-slate-700">{label}</span>
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) =>
                        handleFormChange(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                );
              })}
            </div>

            {formError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {formError}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={showCreate ? handleCreate : handleUpdate}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : showCreate
                    ? "Create"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
