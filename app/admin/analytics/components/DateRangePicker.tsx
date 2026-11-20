"use client";

import { useState } from "react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

const presets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: null },
];

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getDateString(date);
}

export default function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (days: number | null) => {
    if (days === null) {
      onRangeChange("", "");
    } else {
      onRangeChange(getDaysAgo(days), getDateString(new Date()));
    }
    setIsOpen(false);
  };

  const handleCustomChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      onRangeChange(value, endDate);
    } else {
      onRangeChange(startDate, value);
    }
  };

  // Determine current preset label
  const getCurrentLabel = () => {
    if (!startDate && !endDate) return "All time";
    const today = getDateString(new Date());
    for (const preset of presets) {
      if (preset.days === null) continue;
      if (startDate === getDaysAgo(preset.days) && endDate === today) {
        return preset.label;
      }
    }
    if (startDate && endDate) {
      return `${startDate} - ${endDate}`;
    }
    return "Custom range";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-purple border border-brand-purple-muted text-text-light text-sm font-medium hover:bg-brand-purple-light transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{getCurrentLabel()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-brand-purple border border-brand-purple-muted shadow-xl z-50 overflow-hidden">
            {/* Preset buttons */}
            <div className="p-3 border-b border-brand-purple-muted">
              <p className="text-xs text-text-muted mb-2 font-medium">
                Quick select
              </p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset.days)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      getCurrentLabel() === preset.label
                        ? "bg-accent-gold text-brand-dark"
                        : "bg-brand-purple-muted text-text-light hover:bg-brand-purple-light"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date inputs */}
            <div className="p-3">
              <p className="text-xs text-text-muted mb-2 font-medium">
                Custom range
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleCustomChange("start", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-brand-purple-muted border border-brand-purple-light text-text-light text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold"
                />
                <span className="text-text-muted">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleCustomChange("end", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-brand-purple-muted border border-brand-purple-light text-text-light text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
