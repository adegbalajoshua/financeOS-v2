import { Account, BudgetCycle, FinancialEvent } from "../entities/types";

export interface IAccountRepository {
  findAll(): Promise<Account[]>;
  findById(id: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
}

export interface IBudgetCycleRepository {
  findAll(): Promise<BudgetCycle[]>;
  findById(id: string): Promise<BudgetCycle | null>;
  save(cycle: BudgetCycle): Promise<void>;
}

export interface IFinancialEventRepository {
  findByBudgetCycle(budgetCycleId: string): Promise<FinancialEvent[]>;
  save(event: FinancialEvent): Promise<void>;
  saveBatch(events: FinancialEvent[]): Promise<void>;
}
