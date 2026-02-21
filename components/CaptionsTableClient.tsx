"use client";

import { useMemo, useState } from "react";
import {
  formatDateValue,
  formatValue,
  truncateText,
  type RowData,
} from "@/lib/admin/table-helpers";

type Props = {
  rows: RowData[];
  textKey: string | null;
  imageIdKey: string | null;
  createdKey: string | null;
};

export function CaptionsTableClient({
  rows,
  textKey,
  imageIdKey,
  createdKey,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filteredRows = useMemo(() => {
    if (!query.trim() || !textKey) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) =>
      String(row[textKey] ?? "").toLowerCase().includes(q)
    );
  }, [rows, query, textKey]);

  const toggleExpanded = (index: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Captions</h2>
          <p className="text-sm text-slate-600">
            Search by caption text and inspect recent entries.
          </p>
        </div>
        <input
          type="search"
          placeholder="Search captions..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Caption</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-slate-500"
                  colSpan={3}
                >
                  No captions found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => {
                const rawText = textKey ? String(row[textKey] ?? "") : "";
                const isExpanded = expandedIds.has(index);
                const displayText = isExpanded
                  ? rawText
                  : truncateText(rawText, 180);

                return (
                  <tr key={index} className="align-top">
                    <td className="px-4 py-3">
                      {textKey ? (
                        <div className="space-y-2">
                          <div className="whitespace-pre-wrap text-slate-900">
                            {displayText || "—"}
                          </div>
                          {rawText.length > 180 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(index)}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-500">
                          No caption column found.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {imageIdKey ? formatValue(row[imageIdKey]) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {createdKey ? formatDateValue(row[createdKey]) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
