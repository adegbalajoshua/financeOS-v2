import { z } from "zod";
import {
  ExpensePayloadSchema,
  IncomePayloadSchema,
  TransferPayloadSchema,
  SavingsPayloadSchema,
  ReceivablePayloadSchema,
  BankChargePayloadSchema
} from "./schemas";

export function validateEventPayload(typeStr: string, payload: any): { success: true; data: any } | { success: false; error: string } {
  let schema: z.ZodSchema<any> | null = null;

  switch (typeStr) {
    case "EXPENSE_RECORDED":
      schema = ExpensePayloadSchema;
      break;
    case "INCOME_RECEIVED":
      schema = IncomePayloadSchema;
      break;
    case "TRANSFER_COMPLETED":
      schema = TransferPayloadSchema;
      break;
    case "SAVINGS_CONTRIBUTION":
      schema = SavingsPayloadSchema;
      break;
    case "RECEIVABLE_RECORDED":
      schema = ReceivablePayloadSchema;
      break;
    case "BANK_CHARGE_RECORDED":
      schema = BankChargePayloadSchema;
      break;
  }

  if (schema) {
    const result = schema.safeParse(payload);
    
    if (!result.success) {
      const firstError = result.error.issues[0];
      const fieldName = firstError.path.join(".");
      // Format to be more user-friendly: "fromAccountId" -> "from account"
      const friendlyName = fieldName.replace(/Id$/, "").replace(/([A-Z])/g, " $1").toLowerCase();
      return { success: false, error: `Invalid ${friendlyName}: ${firstError.message}` };
    }
    return { success: true, data: result.data };
  }

  return { success: true, data: payload };
}
