import React, { useState } from "react";
import { BUILTIN_DICTIONARY } from "../data/seedData";
import { DictionaryEntry } from "../types";
import { BookOpen, Loader2, Search, Sparkles } from "lucide-react";

interface DictionaryToolProps {
  grade: number;
  suggestedWords?: string[];
}

export const DictionaryTool: React.FC<DictionaryToolProps> = ({
  grade,
  suggestedWords = ["chu vi", "diện tích", "tứ giác", "ngũ giác", "lục giác", "quang hợp", "chăm chỉ", "trong trẻo"],
}) => {
  const [query, setQuery] = useState<string>("");
  const [entry, setEntry] = useState<DictionaryEntry | null>(BUILTIN_DICTIONARY["chu vi"]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (wordToSearch: string) => {
    const clean = wordToSearch.trim().toLowerCase();
    if (!clean) return;
    setQuery(wordToSearch);
    setError(null);

    if (BUILTIN_DICTIONARY[clean]) {
      setEntry(BUILTIN_DICTIONARY[clean]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: wordToSearch.trim(), grade }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không tìm thấy từ này.");
      }
      setEntry(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi tra cứu từ điển.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLookup(query);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ khó con chưa hiểu (VD: chu vi, lục giác, quang hợp)..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          {loading ? "Đang tra..." : "Giải nghĩa"}
        </button>
      </form>

      {/* Quick word suggestions */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-500">Từ gợi ý:</span>
        {suggestedWords.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => handleLookup(w)}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-medium transition-colors"
          >
            {w}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-sky-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cô giáo AI đang giải nghĩa từ dễ hiểu cho con...</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {entry && !loading && (
        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 overflow-y-auto">
          <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <h4 className="text-base font-bold text-slate-900 capitalize">{entry.word}</h4>
            </div>
            <span className="text-xs text-slate-500">{entry.wordType}</span>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-700">Nghĩa dễ hiểu cho bé:</div>
            <p className="text-sm text-slate-800 leading-relaxed">{entry.simpleMeaning}</p>
          </div>

          <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-1">
            <div className="text-xs font-semibold text-sky-700">Câu ví dụ mẫu:</div>
            <p className="text-sm italic text-slate-800">“{entry.exampleSentence}”</p>
          </div>

          {entry.memoryTip && (
            <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mẹo nhớ nhanh:</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">{entry.memoryTip}</p>
            </div>
          )}

          {entry.relatedWords && entry.relatedWords.length > 0 && (
            <div className="pt-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Từ liên quan: </span>
              <span>{entry.relatedWords.join(" · ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
