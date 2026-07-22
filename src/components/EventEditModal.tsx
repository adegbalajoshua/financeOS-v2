"use client";

import React, { useState } from "react";
import { useAppData } from "@/lib/appContext";
import { validateEventPayload } from "@/domain/events/validation";

import { useTransactionForm, EVENT_TYPES } from "./hooks/useTransactionForm";

interface EventEditModalProps {
  event: any;
  onClose: () => void;
}

export function EventEditModal({ event, onClose }: EventEditModalProps) {
  const { accounts, budgets, updateEvent } = useAppData();
  
  const rawType = String(event.type || event.eventType || "EXPENSE_RECORDED").toUpperCase();
  const initialTypeKey = rawType.includes("INCOME") || rawType.includes("SALARY")
    ? "INCOME"
    : rawType.includes("TRANSFER")
    ? "TRANSFER"
    : rawType.includes("SAVING")
    ? "SAVINGS"
    : rawType.includes("RECEIVABLE")
    ? "RECEIVABLE"
    : "EXPENSE";

  const initialFromAcc = event.payload?.fromAccountId || event.payload?.fromAccount || event.accountName || accounts[0]?.name || "Zenith";
  const initialToAcc = event.payload?.toAccountId || event.payload?.toGoalId || event.payload?.toAccount || accounts[1]?.name || "Destination";
  
  const handleUpdateEvent = async (data: any) => {
    return await updateEvent(event.id || event.eventId || "", {
      ...data,
      eventType: data.type,
    });
  };

  const form = useTransactionForm(
    {
      activeType: initialTypeKey,
      amount: ((event.amount || 0) / 100).toString(),
      category: event.category || "",
      description: event.description || "",
      accountName: initialFromAcc,
      fromAccountName: initialFromAcc,
      toAccountName: initialToAcc,
      debtorName: event.payload?.debtorName || event.payload?.clientName || "",
      originalPayload: event.payload || {},
    },
    handleUpdateEvent,
    onClose
  );

  const {
    activeType,
    amount,
    setAmount,
    category,
    setCategory,
    accountName,
    setAccountName,
    fromAccountName,
    setFromAccountName,
    toAccountName,
    setToAccountName,
    debtorName,
    setDebtorName,
    description,
    setDescription,
    isSubmitting,
    error,
    activeMeta,
    handleTabChange,
    handleSubmit,
  } = form;

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--muted)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    borderRadius: "0.75rem",
    padding: "0.625rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    outline: "none",
    width: "100%",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden bg-card transition-all"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-sm" style={{ backgroundColor: `${activeMeta.color}15`, color: activeMeta.color }}>
              {activeMeta.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
                Edit Transaction
              </h2>
              <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Update details for ID: `{String(event.id || event.eventId).slice(0, 8)}...`
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border hover:bg-muted/80 text-muted-foreground transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            ✕
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-muted border" style={{ borderColor: "var(--border)" }}>
            {EVENT_TYPES.map((t) => {
              const isActive = activeType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTabChange(t.key)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    isActive ? "bg-card text-foreground shadow-sm scale-102" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-[10px] sm:text-xs truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-500 leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          {/* Amount and Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="editAmount" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Amount (₦ Naira)
              </label>
              <input
                id="editAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label htmlFor="editCategory" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Category
              </label>
              <input
                id="editCategory"
                type="text"
                list="edit-category-list"
                placeholder="e.g. Groceries or Transport"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputStyle}
                required
              />
              <datalist id="edit-category-list">
                {budgets.map((b) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Account selector based on transaction type */}
          {(activeType === "TRANSFER" || activeType === "SAVINGS") ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="editFromAccount" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  From Account
                </label>
                <select
                  id="editFromAccount"
                  value={fromAccountName}
                  onChange={(e) => setFromAccountName(e.target.value)}
                  style={{ ...inputStyle, padding: "0.625rem 0.75rem" }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.name}>{a.name} ({a.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="editToAccount" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {activeType === "SAVINGS" ? "Target Wealth Account / Goal" : "To Account"}
                </label>
                <select
                  id="editToAccount"
                  value={toAccountName}
                  onChange={(e) => setToAccountName(e.target.value)}
                  style={{ ...inputStyle, padding: "0.625rem 0.75rem" }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.name}>{a.name} ({a.type})</option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeType === "RECEIVABLE" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="editSourceAccount" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  Source Account
                </label>
                <select
                  id="editSourceAccount"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  style={{ ...inputStyle, padding: "0.625rem 0.75rem" }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="editDebtorName" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  Debtor Name (Client/Friend)
                </label>
                <input
                  id="editDebtorName"
                  type="text"
                  placeholder="e.g. Caleb"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="editDestAccount" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                {activeType === "INCOME" ? "Destination Account (Where Money Landed)" : "Source Account (Paid From)"}
              </label>
              <select
                id="editDestAccount"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                style={{ ...inputStyle, padding: "0.625rem 0.75rem" }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.name}>{a.name} ({a.type})</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="editDescription" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Description / Notes
            </label>
            <input
              id="editDescription"
              type="text"
              placeholder="e.g. Cat litter or Dinner with Seun"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 justify-end pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5851e5] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span>{isSubmitting ? "Saving Changes..." : "✓ Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
