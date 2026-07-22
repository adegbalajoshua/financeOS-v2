import { useState } from "react";
import { validateEventPayload } from "@/domain/events/validation";

export const EVENT_TYPES = [
  { key: "EXPENSE",    label: "Expense",    typeStr: "EXPENSE_RECORDED",     icon: "💸", color: "#f43f5e" },
  { key: "INCOME",     label: "Income",     typeStr: "INCOME_RECEIVED",      icon: "💰", color: "#10b981" },
  { key: "TRANSFER",   label: "Transfer",   typeStr: "TRANSFER_COMPLETED",   icon: "↔️", color: "#f59e0b" },
  { key: "SAVINGS",    label: "Savings",    typeStr: "SAVINGS_CONTRIBUTION", icon: "🎯", color: "#635BFF" },
  { key: "RECEIVABLE", label: "Receivable", typeStr: "RECEIVABLE_RECORDED",  icon: "⏳", color: "#8b5cf6" },
];

export interface TransactionFormInitialValues {
  activeType?: string;
  amount?: string;
  category?: string;
  accountName?: string;
  fromAccountName?: string;
  toAccountName?: string;
  debtorName?: string;
  dueDate?: string;
  description?: string;
  originalPayload?: Record<string, any>;
}

export interface TransactionSubmitData {
  type: string;
  amount: number;
  category: string;
  description: string;
  accountName: string;
  payload: Record<string, any>;
}

export function useTransactionForm(
  initialValues: TransactionFormInitialValues,
  onSubmitCallback: (data: TransactionSubmitData) => Promise<boolean>,
  onClose: () => void
) {
  const [activeType, setActiveType] = useState(initialValues.activeType || "EXPENSE");
  const [amount, setAmount] = useState<string>(initialValues.amount || "");
  const [category, setCategory] = useState<string>(initialValues.category || "");
  const [accountName, setAccountName] = useState<string>(initialValues.accountName || "");
  const [fromAccountName, setFromAccountName] = useState<string>(initialValues.fromAccountName || "");
  const [toAccountName, setToAccountName] = useState<string>(initialValues.toAccountName || "");
  const [debtorName, setDebtorName] = useState<string>(initialValues.debtorName || "");
  const [dueDate, setDueDate] = useState<string>(initialValues.dueDate || "");
  const [description, setDescription] = useState<string>(initialValues.description || "");
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeMeta = EVENT_TYPES.find((t) => t.key === activeType) || EVENT_TYPES[0];

  const handleTabChange = (key: string) => {
    setActiveType(key);
    setError(null);
    if (key === "TRANSFER") {
      setCategory("Account Transfer");
    } else if (key === "SAVINGS") {
      setCategory("Savings Goal");
    } else if (key === "RECEIVABLE") {
      setCategory("Money Owed / Debt");
    } else if (
      category === "Account Transfer" || 
      category === "Savings Goal" || 
      category === "Money Owed / Debt" || 
      category === "Client / Debt Receivable"
    ) {
      setCategory("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const koboAmount = Math.round(Number(amount) * 100);
    const eventTypeStr = activeMeta.typeStr;

    let payloadObj: Record<string, any> = {
      ...(initialValues.originalPayload || {}),
      amount: koboAmount,
      description: description.trim() || undefined,
    };

    let targetAccount = accountName;

    if (activeType === "TRANSFER" || activeType === "SAVINGS") {
      payloadObj.fromAccountId = fromAccountName;
      if (activeType === "TRANSFER") {
        payloadObj.toAccountId = toAccountName;
      } else {
        payloadObj.toGoalId = toAccountName;
      }
      targetAccount = fromAccountName;
    } else if (activeType === "RECEIVABLE") {
      payloadObj.debtorName = debtorName.trim();
      if (dueDate) {
        payloadObj.dueDate = dueDate;
      }
      targetAccount = accountName;
    } else if (activeType === "INCOME") {
      payloadObj.category = category.trim() || activeMeta.label;
      payloadObj.toAccountId = accountName;
    } else {
      payloadObj.category = category.trim() || activeMeta.label;
      payloadObj.fromAccountId = accountName;
    }

    const validation = validateEventPayload(eventTypeStr, payloadObj);
    if (!validation.success) {
      setError(validation.error);
      setIsSubmitting(false);
      return;
    }

    const success = await onSubmitCallback({
      type: eventTypeStr,
      amount: koboAmount,
      category: category.trim() || activeMeta.label,
      description: description.trim(),
      accountName: targetAccount,
      payload: payloadObj,
    });

    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setError("Failed to save transaction. Please check your connection.");
    }
  };

  return {
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
  };
}
