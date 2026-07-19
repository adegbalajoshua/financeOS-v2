"use client";

import React, { useState } from "react";
import { useAppData } from "@/lib/appContext";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

export function DataExportTool() {
  const { events, accounts, budgets } = useAppData();
  const [exportAccounts, setExportAccounts] = useState(true);
  const [exportEvents, setExportEvents] = useState(true);
  const [exportBudgets, setExportBudgets] = useState(true);
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      if (exportEvents) {
        const validEvents = (events || []).filter(e => !e.deleted_at).map(e => ({
          ID: e.id,
          Type: e.type,
          Amount_NGN: typeof e.payload?.amount === "number" ? e.payload.amount / 100 : 0,
          Description: e.payload?.description || "",
          Date: e.payload?.date || "",
          Category: e.payload?.category || "",
          Account_Name: e.accountName || "",
          Budget_Cycle: e.budgetCycleId || "",
          Updated_At: e.updated_at,
        }));
        const ws = XLSX.utils.json_to_sheet(validEvents);
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      }

      if (exportAccounts) {
        const validAccounts = (accounts || []).filter(a => !a.deleted_at).map(a => ({
          ID: a.id,
          Name: a.name,
          Type: a.type,
          Institution: a.institution || "",
          Balance_NGN: typeof a.balance === "number" ? a.balance / 100 : 0,
          Currency: a.currency || "NGN",
          Updated_At: a.updated_at,
        }));
        const ws = XLSX.utils.json_to_sheet(validAccounts);
        XLSX.utils.book_append_sheet(wb, ws, "Accounts");
      }

      if (exportBudgets) {
        const validBudgets = (budgets || []).filter(b => !b.deleted_at).map(b => ({
          ID: b.id,
          Cycle_ID: b.cycleId,
          Category: b.category,
          Planned_NGN: typeof b.planned === "number" ? b.planned / 100 : 0,
          Updated_At: b.updated_at,
        }));
        const ws = XLSX.utils.json_to_sheet(validBudgets);
        XLSX.utils.book_append_sheet(wb, ws, "Budgets");
      }

      if (!exportEvents && !exportAccounts && !exportBudgets) {
        alert("Please select at least one data type to export.");
        setIsExporting(false);
        return;
      }

      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `financeOS_export_${dateStr}.${format}`;

      if (format === "csv") {
        if (wb.SheetNames.length === 1) {
           XLSX.writeFile(wb, fileName, { bookType: "csv" });
        } else {
           wb.SheetNames.forEach(sheetName => {
             const singleWb = XLSX.utils.book_new();
             XLSX.utils.book_append_sheet(singleWb, wb.Sheets[sheetName], sheetName);
             XLSX.writeFile(singleWb, `financeOS_${sheetName}_${dateStr}.csv`, { bookType: "csv" });
           });
        }
      } else {
        XLSX.writeFile(wb, fileName, { bookType: "xlsx" });
      }

    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#635BFF]/5 border border-[#635BFF]/20 space-y-4">
      <div>
        <p className="text-xs font-bold text-[#635BFF] flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Data Export
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Export your financial data (Transactions, Accounts, Budgets) as readable CSV or XLSX files.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="space-y-2 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Data</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={exportEvents} onChange={e => setExportEvents(e.target.checked)} className="rounded text-[#635BFF] focus:ring-[#635BFF]" />
              Transactions
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={exportAccounts} onChange={e => setExportAccounts(e.target.checked)} className="rounded text-[#635BFF] focus:ring-[#635BFF]" />
              Accounts
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={exportBudgets} onChange={e => setExportBudgets(e.target.checked)} className="rounded text-[#635BFF] focus:ring-[#635BFF]" />
              Budgets
            </label>
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Format</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormat("csv")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${format === "csv" ? "bg-white dark:bg-zinc-800 border-[#635BFF] text-[#635BFF] shadow-sm" : "bg-transparent border-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              <FileText className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => setFormat("xlsx")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${format === "xlsx" ? "bg-white dark:bg-zinc-800 border-[#635BFF] text-[#635BFF] shadow-sm" : "bg-transparent border-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting || (!exportEvents && !exportAccounts && !exportBudgets)}
        className="w-full py-2.5 bg-[#635BFF] hover:bg-[#5851e5] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        {isExporting ? "Exporting..." : "Download Data"}
      </button>
    </div>
  );
}
