export interface IncomeData {
  weeklyContribution: number;
  specialMissions: number;
  benevolence: number;
}

export interface ExpenseItem {
  category: string;
  amount: number;
}

export interface CentralAdminData {
  budget: number;
  breakdown: { category: string; percent: number }[];
}

export interface FinanceDashboardData {
  income?: IncomeData;
  expenses?: ExpenseItem[];
  centralAdmin?: CentralAdminData;
}

export interface FinanceDocument extends FinanceDashboardData {
  public_finance_dashboard?: {
    current: FinanceDashboardData;
  };
}
