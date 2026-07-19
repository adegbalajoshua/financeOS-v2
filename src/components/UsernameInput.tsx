"use client";

import React, { useEffect } from "react";
import { useDebouncedUsernameCheck, UsernameStatus } from "@/hooks/useDebouncedUsernameCheck";
import { Tooltip } from "@/components/ui/tooltip";

export interface UsernameInputProps {
  initialUsername?: string;
  value: string;
  onChange: (newValue: string) => void;
  onStatusChange?: (status: UsernameStatus, normalized: string) => void;
  className?: string;
}

export function UsernameInput({
  initialUsername = "",
  value,
  onChange,
  onStatusChange,
  className = "",
}: UsernameInputProps) {
  const { username, setUsername, status, message, normalized } = useDebouncedUsernameCheck(initialUsername);

  // Sync parent controlled value with hook state
  useEffect(() => {
    if (value !== username && value !== undefined) {
      setUsername(value);
    }
  }, [value]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status, normalized);
    }
  }, [status, normalized, onStatusChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Strip leading $ if user types it inside the container where $ is already prefixed
    if (raw.startsWith("$") || raw.startsWith("@")) {
      raw = raw.slice(1);
    }
    onChange(raw.toLowerCase().trim());
    setUsername(raw);
  };

  // Determine border color style based on validation status
  let borderColor = "var(--border)";
  if (status === "available") borderColor = "#10B981"; // emerald-500
  if (status === "taken") borderColor = "#EF4444"; // red-500
  if (status === "invalid") borderColor = "#F59E0B"; // amber-500
  if (status === "checking") borderColor = "#635BFF"; // primary brand

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        className="flex items-center rounded-xl overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-[#635BFF]/30"
        style={{
          backgroundColor: "var(--muted)",
          border: `1.5px solid ${borderColor}`,
        }}
      >
        {/* Fixed Cashtag Prefix Container */}
        <Tooltip content="Cashtag Handle Prefix ($)" placement="top">
          <div
            className="flex items-center justify-center px-3.5 py-2.5 font-extrabold text-sm border-r select-none h-full"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
              borderColor: "var(--border)",
            }}
          >
            $
          </div>
        </Tooltip>

        {/* Alphanumeric Handle Input Field */}
        <input
          type="text"
          value={value || username}
          onChange={handleInputChange}
          placeholder="username"
          maxLength={20}
          className="w-full bg-transparent px-3 py-2 text-sm font-bold outline-none font-mono"
          style={{ color: "var(--foreground)" }}
        />

        {/* Right-Side Status Indicator Badge */}
        <div className="pr-3 flex items-center justify-center flex-shrink-0">
          {status === "checking" && (
            <div className="w-4 h-4 border-2 border-[#635BFF] border-t-transparent rounded-full animate-spin" />
          )}
          {status === "available" && (
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
              <span>✓</span>
              <span className="hidden sm:inline">Available</span>
            </span>
          )}
          {status === "taken" && (
            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
              <span>✕</span>
              <span className="hidden sm:inline">Taken</span>
            </span>
          )}
          {status === "invalid" && (
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
              <span>⚠</span>
            </span>
          )}
        </div>
      </div>

      {/* Helper & Validation Message */}
      {message && (
        <p
          className={`text-[11px] font-medium transition-colors ${
            status === "available"
              ? "text-emerald-500"
              : status === "taken"
              ? "text-red-500"
              : status === "invalid"
              ? "text-amber-500 text-xs"
              : "text-muted-foreground"
          }`}
        >
          {message}
        </p>
      )}
      {!message && (
        <p className="text-[10px] text-muted-foreground">
          Letters, numbers, underscores, and hyphens. 3-20 characters (`e.g., $demo_user`).
        </p>
      )}
    </div>
  );
}
