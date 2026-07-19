const fs = require("fs");
const db = JSON.parse(fs.readFileSync("C:/Users/Joshua Adegbala/Documents/financeOS/src/infrastructure/local-db/finance_db.json", "utf-8"));
const accounts = db.accounts || [];
const events = db.events || [];

function resolveAccountColumns(e) {
  return {
    fromAccountId: e.fromAccountId || e.from_account_id || e.accountId || e.account_id,
    toAccountId: e.toAccountId || e.to_account_id,
    amount: Number(e.amount || 0)
  };
}

const activeEvents = events.filter((e) => !e.deleted_at);
const activeAccounts = accounts.filter((a) => {
  const st = String(a.status || "Active").toUpperCase();
  return st !== "INACTIVE" && st !== "CLOSED" && !a.deleted_at;
});

const sorted = [...activeEvents]
  .filter((e) => e.timestamp)
  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

const balances = {};
activeAccounts.forEach((acc) => {
  const key = String(acc.id || "").trim().toLowerCase();
  balances[key] = Number(acc.openingBalance ?? acc.balance ?? 0);
});

function totalNW() {
  let total = 0;
  activeAccounts.forEach((acc) => {
    const key = String(acc.id || "").trim().toLowerCase();
    const accType = String(acc.type || "Bank").toUpperCase();
    const isAsset = ["BANK", "CHECKING", "MOBILE", "CASH", "SAVINGS", "INVESTMENT", "CASH_WALLET"].includes(accType);
    const isLiability = ["CREDIT", "LOAN"].includes(accType);
    const bal = balances[key] ?? 0;
    if (isAsset) total += bal;
    else if (isLiability) total -= bal;
  });
  return total;
}

const series = [];
let currentDateStr = "";
console.log("Initial balances based totalNW:", totalNW());
sorted.forEach((event) => {
  const eventDate = new Date(event.timestamp).toISOString().split("T")[0];
  const { fromAccountId, toAccountId, amount } = resolveAccountColumns(event);

  if (fromAccountId) {
    const k = fromAccountId.trim().toLowerCase();
    if (balances[k] !== undefined) balances[k] -= amount;
  }
  if (toAccountId) {
    const k = toAccountId.trim().toLowerCase();
    if (balances[k] !== undefined) balances[k] += amount;
  }

  if (eventDate !== currentDateStr) {
    if (currentDateStr) {
      series.push({ date: currentDateStr, netWorth: totalNW() });
    }
    currentDateStr = eventDate;
  }
});
if (currentDateStr) {
  series.push({ date: currentDateStr, netWorth: totalNW() });
}

console.log("Final net worth in series:", series[series.length - 1]?.netWorth);
