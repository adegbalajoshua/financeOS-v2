"use client";

import React, { useState } from "react";
import { useAppData } from "@/lib/appContext";
import { validateEventPayload } from "@/domain/events/validation";

import { useTransactionForm, EVENT_TYPES } from "./hooks/useTransactionForm";

interface EventComposerProps {
  onClose: () => void;
}

function formatCurrency(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kobo / 100);
}

export function EventComposer({ onClose }: EventComposerProps) {
  const { accounts, recordEvent, isConnected, activeCycleId } = useAppData();

  const handleRecordEvent = async (data: any) => {
    return await recordEvent({
      ...data,
      budgetCycleId: activeCycleId,
    });
  };

  const form = useTransactionForm(
    {
      accountName: accounts[0]?.name || "Cash Wallet",
      fromAccountName: accounts[0]?.name || "Cash Wallet",
      toAccountName: accounts.length > 1 ? accounts[1].name : accounts[0]?.name || "Savings",
    },
    handleRecordEvent,
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
    dueDate,
    setDueDate,
    description,
    setDescription,
    isSubmitting,
    error,
    activeMeta,
    handleTabChange,
    handleSubmit,
  } = form;

  return (
    <div
      className="p-6 rounded-2xl border shadow-xl animate-in fade-in slide-in-from-top-4 duration-200 transition-all"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{ backgroundColor: `${activeMeta.color}15`, color: activeMeta.color }}
          >
            {activeMeta.icon}
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
              Add New Transaction
            </h2>
            <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              Easily log your income, expenses, or money moved
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-Saved
            </span>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-105 active:scale-95"
            style={{ color: "var(--muted-foreground)", backgroundColor: "var(--muted)" }}
          >
            ✕
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Polymorphic Type Tabs */}
        <div
          className="grid grid-cols-5 gap-1.5 mb-6 p-1.5 rounded-xl border"
          style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}
        >
          {EVENT_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className="py-2.5 px-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1"
              style={
                activeType === t.key
                  ? {
                      backgroundColor: "var(--card)",
                      color: t.color,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                      border: `1px solid ${t.color}30`,
                    }
                  : { color: "var(--muted-foreground)" }
              }
            >
              <span className="text-sm">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {activeType === "RECEIVABLE" && (
          <div
            className="mb-5 p-3 rounded-xl border flex items-start gap-2.5 text-xs font-medium"
            style={{ backgroundColor: "rgba(139, 92, 246, 0.08)", borderColor: "rgba(139, 92, 246, 0.2)", color: "#8b5cf6" }}
          >
            <span className="text-base">🔒</span>
            <p>
              <strong>Separate from Cash:</strong> This tracks money owed to you. It counts toward your total net worth, but won&apos;t be added to your spendable cash balance until they pay you back.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-xs font-bold uppercase tracking-wide mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              Amount (₦)
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xl"
                style={{ color: activeMeta.color }}
              >
                ₦
              </span>
              <input
                id="amount"
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl py-3.5 pl-10 pr-4 text-xl font-bold focus:outline-none focus:ring-2 transition-all"
                style={
                  {
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    "--tw-ring-color": `${activeMeta.color}50`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>

          {/* Dynamic Routing Fields */}
          {activeType === "TRANSFER" || activeType === "SAVINGS" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fromAccountName"
                  className="block text-xs font-bold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  From Account (Source)
                </label>
                <select
                  id="fromAccountName"
                  value={fromAccountName}
                  onChange={(e) => setFromAccountName(e.target.value)}
                  className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.name}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="toAccountName"
                  className="block text-xs font-bold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  To Account (Destination)
                </label>
                <select
                  id="toAccountName"
                  value={toAccountName}
                  onChange={(e) => setToAccountName(e.target.value)}
                  className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.name}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeType === "RECEIVABLE" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="debtorName"
                  className="block text-xs font-bold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Who owes this money? (Person or Business)
                </label>
                <input
                  id="debtorName"
                  type="text"
                  placeholder="e.g. Acme Corp / John Doe"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="dueDate"
                  className="block text-xs font-bold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Expected Due Date
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="category"
                  className="block text-xs font-bold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Category
                </label>
                <input
                  id="category"
                  type="text"
                  placeholder="e.g. Groceries, Salary, Rent"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Account / Wallet
                </label>
                <select
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.name}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mt-4">
            <label
              htmlFor="description"
              className="block text-xs font-bold uppercase tracking-wide mb-1.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              Description (Optional)
            </label>
            <input
              id="description"
              type="text"
              placeholder="Add more details about this transaction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: "var(--muted)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold bg-red-500/10 border-red-500/20 text-red-500">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 px-6 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
            style={{ backgroundColor: activeMeta.color, boxShadow: `0 4px 14px ${activeMeta.color}40` }}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Transaction...</span>
              </>
            ) : (
              <>
                <span>{activeMeta.icon}</span>
                <span>Save {activeMeta.label}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
