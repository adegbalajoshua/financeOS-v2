import { IFinancialEventRepository } from "../../domain/repositories/interfaces";
import { FinancialEventSchema } from "../validation/schemas";
import { FinancialEvent } from "../../domain/entities/types";

export class RecordExpenseUseCase {
  constructor(private eventRepository: IFinancialEventRepository) {}

  async execute(payload: unknown): Promise<FinancialEvent> {
    // 1. Validate incoming data
    const event = FinancialEventSchema.parse(payload);

    // 2. Additional Business Rule Checks could go here
    // e.g., ensure event.type === 'EXPENSE_RECORDED'
    if (event.type !== "EXPENSE_RECORDED") {
      throw new Error("Invalid event type for RecordExpenseUseCase");
    }

    // 3. Save via repository
    await this.eventRepository.save(event);

    return event;
  }
}
