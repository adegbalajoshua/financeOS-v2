import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { TopHeader } from "../TopHeader";
import { CsvImportTool } from "../CsvImportTool";
import { DashboardView } from "../DashboardView";
import * as AppContext from "../../lib/appContext";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("../../lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockSyncToSupabase = vi.fn();
const mockImportCsvData = vi.fn();

vi.mock("../../lib/appContext", () => ({
  useAppData: vi.fn(),
}));

describe("Frontend Component Happy Paths", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("1. TopHeader - Successful Sync", () => {
    it("performs a sync and shows no error badges when successful", async () => {
      mockSyncToSupabase.mockResolvedValue({ success: true });
      (AppContext.useAppData as any).mockReturnValue({
        syncToSupabase: mockSyncToSupabase,
        rejectedSyncCount: 0,
        isSyncing: false,
      });

      render(<TopHeader />);

      const syncBtn = screen.getByText("Sync");
      fireEvent.click(syncBtn);

      await waitFor(() => {
        expect(mockSyncToSupabase).toHaveBeenCalled();
        expect(screen.queryByText(/Sync Failed/i)).toBeNull();
        expect(screen.queryByText(/changes couldn't be saved/i)).toBeNull();
      });
    });
  });

  describe("2. CsvImportTool - Successful Import", () => {
    it("imports a valid CSV file completely with no errors", async () => {
      (AppContext.useAppData as any).mockReturnValue({
        importCsvData: mockImportCsvData,
      });

      render(<CsvImportTool />);

      const validCsv = `Date,Budget Cycle,Event Type,Category,Description,From Account,To Account,Amount (Naira),Notes
2026-07-15,Jul-26,Expense,Groceries,Food,Checking,,"1,500.50",note`;

      const file = new File([validCsv], "test.csv", { type: "text/csv" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      const fileReaderMock = {
        readAsText: vi.fn(function(this: any) {
          this.onload({ target: { result: validCsv } });
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

      await waitFor(() => {
        expect(screen.getByText(/Successfully imported 1 events\./i)).toBeDefined();
        // verify the amount was stripped of commas and multiplied by 100 correctly (1500.50 * 100 = 150050)
        expect(mockImportCsvData).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              type: "EXPENSE_RECORDED",
              payload: expect.objectContaining({ amount: 150050 })
            })
          ])
        );
      });
    });
  });

  describe("3. DashboardView - Successful Render", () => {
    it("renders valid net worth and recent activity without crashing", () => {
      // Mock some real accounts and events to test calculation
      (AppContext.useAppData as any).mockReturnValue({
        accounts: [
          { id: "acc1", name: "Checking", balance: 500000 }, // 5,000.00
          { id: "acc2", name: "Savings", balance: 250000 },  // 2,500.00
        ],
        events: [
          { id: "evt1", type: "EXPENSE_RECORDED", payload: { amount: 10000 } }
        ],
        activeCycleId: "Jul-26",
      });

      render(<DashboardView />);

      // Total net worth should be 7,500.00 NGN
      expect(screen.getByText(/₦7,500\.00/i)).toBeDefined();
      expect(screen.getByText("Jul-26")).toBeDefined();
      expect(screen.getByText("EXPENSE_RECORDED")).toBeDefined();
      expect(screen.getByText(/₦100\.00/i)).toBeDefined();
    });
  });
});
