import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { TopHeader } from "../TopHeader";
import { CsvImportTool } from "../CsvImportTool";
import { DashboardView } from "../DashboardView";
import * as AppContext from "../../lib/appContext";
import * as nextAuth from "next-auth/react";
import * as nextNavigation from "next/navigation";
import { logger } from "../../lib/logger";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("../../lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

const mockSyncToSupabase = vi.fn();
const mockImportCsvData = vi.fn();

vi.mock("../../lib/appContext", () => ({
  useAppData: vi.fn(),
}));

describe("Frontend Failure Paths", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    (AppContext.useAppData as any).mockReturnValue({
      syncToSupabase: mockSyncToSupabase,
      importCsvData: mockImportCsvData,
      activeCycleId: "Jul-26",
      events: [],
      accounts: [],
      budgets: [],
    });
  });

  describe("1. TopHeader - Rejected Sync Call", () => {
    it("displays a 'N changes couldn't be saved' indicator when sync is rejected by the server", async () => {
      (AppContext.useAppData as any).mockReturnValue({
        syncToSupabase: mockSyncToSupabase,
        rejectedSyncCount: 2,
      });

      render(<TopHeader />);

      // Verify visual indicator for server rejection
      await waitFor(() => {
        expect(screen.getByText(/2 changes couldn't be saved/i)).toBeDefined();
      });
    });

    it("displays a subtle 'Sync Failed' indicator for a genuine network failure, but NOT the 'changes couldn't be saved' badge", async () => {
      // Mock network failure behavior manually by clicking our mock sync button
      mockSyncToSupabase.mockResolvedValue({ success: false, message: "Network error saving records", errorType: "NETWORK_ERROR" });
      (AppContext.useAppData as any).mockReturnValue({
        syncToSupabase: mockSyncToSupabase,
        rejectedSyncCount: 0,
      });

      render(<TopHeader />);

      // Trigger sync manually via our mock button to simulate network failure
      const syncBtn = screen.getByText("Sync");
      fireEvent.click(syncBtn);

      // Verify 'Sync Failed' indicator for network error
      await waitFor(() => {
        expect(screen.getByText(/Sync Failed \(Will Retry\)/i)).toBeDefined();
        expect(screen.queryByText(/changes couldn't be saved/i)).toBeNull();
      });
    });
  });

  describe("2. CsvImportTool - Malformed CSV Row", () => {
    it("collects row errors and displays them instead of silently dropping bad rows", async () => {
      render(<CsvImportTool />);

      const file = new File([
        `Date,Budget Cycle,Event Type,Category,Description,From Account,To Account,Amount (Naira),Notes
2026-07-15,Jul-26,Expense,Salary,Desc,Acc1,,500,note1
invalid-date,Jul-26,Expense,Salary,Desc,Acc1,,500,note2
2026-07-17,Jul-26,Transfer,Salary,Desc,Acc1,Acc2,invalid_amount,note3`
      ], "test.csv", { type: "text/csv" });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Mock FileReader
      const fileReaderMock = {
        readAsText: vi.fn(function(this: any, file: File) {
          this.onload({ target: { result: `Date,Budget Cycle,Event Type,Category,Description,From Account,To Account,Amount (Naira),Notes\n2026-07-15,Jul-26,Expense,Salary,Desc,Acc1,,500,note1\ninvalid-date,Jul-26,Expense,Salary,Desc,Acc1,,500,note2\n2026-07-17,Jul-26,Transfer,Salary,Desc,Acc1,Acc2,invalid_amount,note3` } });
        }),
        onload: vi.fn(),
        onerror: vi.fn(),
      };
      vi.spyOn(window, "FileReader").mockImplementation(function() {
        return fileReaderMock;
      } as any);

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      // Assert error message includes row numbers and specific failures
      await waitFor(() => {
        expect(screen.getByText(/Imported 1 rows, but 2 rows failed\./i)).toBeDefined();
        // Row 3 should be invalid date
        expect(screen.getByText(/Row 3: Could not parse date "invalid-date"/i)).toBeDefined();
        // Row 4 should be invalid transfer payload due to amount parsing to NaN/0 or validation rejecting
        expect(screen.getByText(/amount: Too small: expected number to be >0/i)).toBeDefined();
      });
    });
  });

  describe("3. DashboardView - Engine Calculation Crash", () => {
    it("catches calculation errors in an ErrorBoundary and displays a fallback message", () => {
      // Mock an invalid account structure to force calculateNetWorth to crash (e.g. accounts.reduce is not a function)
      (AppContext.useAppData as any).mockReturnValue({
        accounts: null, // this will crash accounts.reduce
        events: [],
        budgets: [],
      });

      // Suppress console.error in this test since React logs the error boundary catch
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<DashboardView />);

      expect(screen.getByText(/Couldn't calculate your balance right now/i)).toBeDefined();
      expect(screen.getByText(/There was an error processing your financial data/i)).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
