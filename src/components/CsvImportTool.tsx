"use client";

import React, { useState } from "react";
import { useAppData } from "@/lib/appContext";
import { validateEventPayload } from "@/domain/events/validation";

export function CsvImportTool() {
  const { importCsvData } = useAppData();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [parsedEvents, setParsedEvents] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setRowErrors([]);
    setParsedEvents([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("File is empty");

        const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length <= 1) {
          setErrorMsg("No data rows found in CSV");
          setIsProcessing(false);
          return;
        }

        const events = [];
        const errors: string[] = [];

        // Header is index 0. Data starts at index 1.
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const row: string[] = [];
          let curr = "";
          let inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' && line[j + 1] === '"') {
              curr += '"';
              j++;
            } else if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(curr.trim());
              curr = "";
            } else {
              curr += char;
            }
          }
          row.push(curr.trim());

          const dateStr = row[0];
          const cycleId = row[1];
          const eventTypeStr = row[2]?.trim();
          const category = row[3]?.trim();
          const description = row[4]?.trim();
          const fromAccount = row[5]?.trim();
          const toAccount = row[6]?.trim();
          const amountStr = row[7]?.trim();
          const notes = row[8]?.trim();

          // 1. Date parsing with try/catch
          let parsedDate: Date;
          try {
            parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) {
              errors.push(`Row ${i + 1}: Could not parse date "${dateStr}"`);
              continue;
            }
          } catch (e) {
            errors.push(`Row ${i + 1}: Could not parse date "${dateStr}"`);
            continue;
          }

          // 2. Amount parsing with Kobo conversion
          const cleanAmount = amountStr ? amountStr.replace(/,/g, "") : "0";
          const parsedAmount = Number(cleanAmount);
          const koboAmount = isNaN(parsedAmount) ? 0 : Math.round(parsedAmount * 100);

          // 3. Construct payload object based on type
          const payloadObj: any = {
            amount: koboAmount,
            description: description || undefined,
          };

          const activeType = eventTypeStr?.toUpperCase();
          if (activeType === "TRANSFER" || activeType === "SAVINGS") {
            payloadObj.fromAccountId = fromAccount;
            if (activeType === "TRANSFER") {
              payloadObj.toAccountId = toAccount;
            } else {
              payloadObj.toGoalId = toAccount;
            }
          } else if (activeType === "RECEIVABLE") {
            payloadObj.debtorName = fromAccount || toAccount || "Unknown";
            if (dateStr) {
              payloadObj.dueDate = parsedDate.toISOString();
            }
          } else if (activeType === "INCOME") {
            payloadObj.category = category;
            payloadObj.toAccountId = toAccount || fromAccount;
          } else {
            // Default to expense
            payloadObj.category = category;
            payloadObj.fromAccountId = fromAccount || toAccount;
          }

          // Map string type back to internal event types used in validation
          let internalEventType = activeType;
          if (activeType === "EXPENSE") internalEventType = "EXPENSE_RECORDED";
          if (activeType === "INCOME") internalEventType = "INCOME_RECEIVED";
          if (activeType === "TRANSFER") internalEventType = "TRANSFER_COMPLETED";
          if (activeType === "SAVINGS") internalEventType = "SAVINGS_DEPOSITED";

          // 4. Validate payload
          const validation = validateEventPayload(internalEventType, payloadObj);
          if (!validation.success) {
            errors.push(`Row ${i + 1}: ${validation.error}`);
            continue;
          }

          events.push({
            date: parsedDate.toISOString(),
            cycleId,
            type: internalEventType,
            payload: validation.data,
            notes: notes || undefined,
          });
        }

        // 5. Summary Logic exactly per brief
        if (events.length === 0 && errors.length > 0) {
          setErrorMsg(`Failed to import any rows. Examples:\n${errors.slice(0, 3).join("\n")}`);
        } else {
          setParsedEvents(events);
          if (errors.length > 0) {
            setRowErrors(errors);
            setErrorMsg(`Imported ${events.length} rows, but ${errors.length} rows failed.`);
          } else {
            setErrorMsg(null);
          }
          
          if (events.length > 0) {
            await importCsvData(events);
          }
        }
      } catch (e: any) {
        setErrorMsg(`Error reading CSV: ${e.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read file");
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Import Data</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Upload CSV File
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <div className="space-y-1 text-center">
            <div className="flex text-sm text-zinc-600 dark:text-zinc-400 justify-center">
              <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                <span>Upload a file</span>
                <input id="file-upload" name="file-upload" type="file" accept=".csv" className="sr-only" onChange={handleFileUpload} disabled={isProcessing} />
              </label>
            </div>
            <p className="text-xs text-zinc-500">CSV up to 10MB</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 whitespace-pre-wrap">{errorMsg}</h3>
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-rose-800 dark:text-rose-400 mb-2">Detailed Errors:</h4>
          <ul className="text-sm text-rose-700 dark:text-rose-300 space-y-1 max-h-40 overflow-y-auto p-3 bg-rose-50 dark:bg-rose-900/10 rounded-md border border-rose-100 dark:border-rose-800">
            {rowErrors.map((err, idx) => (
              <li key={idx} className="font-mono text-xs">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {parsedEvents.length > 0 && !errorMsg && (
        <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Successfully imported {parsedEvents.length} events.
          </p>
        </div>
      )}
    </div>
  );
}
