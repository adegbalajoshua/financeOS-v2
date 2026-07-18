import { calculateNetWorth, calculateBudgetCycleSummary } from "../../domain/financeEngine/engine";
import { Account, FinancialEvent, NetWorthSnapshot } from "../../domain/entities/types";
import { IAccountRepository, IFinancialEventRepository } from "../../domain/repositories/interfaces";

/**
 * Service responsible for materializing the current financial state into fast-read Snapshots.
 * Because calculating 50,000+ events per request is slow, this service runs asynchronously 
 * to compile down the state into a single row for the Dashboard to load instantly (< 1s).
 */
export class SnapshotService {
  constructor(
    private accountRepo: IAccountRepository,
    private eventRepo: IFinancialEventRepository
  ) {}

  async generateNetWorthSnapshot(): Promise<NetWorthSnapshot> {
    const accounts = await this.accountRepo.findAll();
    const netWorth = calculateNetWorth(accounts);
    
    // Total Assets (Cash + Savings + Investment)
    const totalAssets = calculateNetWorth(
      accounts.filter(a => ["CASH", "SAVINGS", "INVESTMENT"].includes(a.type))
    );

    // Total Liabilities (Credit + Loan)
    const totalLiabilities = Math.abs(calculateNetWorth(
      accounts.filter(a => ["CREDIT", "LOAN"].includes(a.type))
    ));

    const snapshot: NetWorthSnapshot = {
      timestamp: new Date().toISOString(),
      netWorth,
      totalAssets,
      totalLiabilities,
    };

    // In a real implementation, we would persist this snapshot to a `Snapshots` sheet here.
    return snapshot;
  }
}
