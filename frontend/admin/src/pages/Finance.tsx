import { BreakdownItem } from "@/components/finance/BreakdownItem";
import { FinancePieChart } from "@/components/finance/FinancePieChart";
import { StatCard } from "@/components/finance/StatCard";
import { useFinanceData } from "@/hooks/useFinanceData";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Finance() {
  const { loading, error, income, expenses, centralAdmin } = useFinanceData();

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div
          data-testid="loading-spinner"
          className="loading loading-spinner loading-lg text-primary"
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error shadow-lg">
          <div className="flex gap-2">
            <span className="font-medium">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const { weeklyContribution, specialMissions, benevolence } = income;

  const incomeBreakdown = [
    { category: "Weekly Contribution", amount: weeklyContribution },
    { category: "Special Missions", amount: specialMissions },
    { category: "Benevolence", amount: benevolence },
  ];

  const totalIncome = incomeBreakdown.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalIncome - totalExpense;

  const pieData = {
    labels: ["Weekly Contribution", "Special Missions", "Benevolence"],
    datasets: [
      {
        data: [weeklyContribution, specialMissions, benevolence],
        backgroundColor: ["#36A2EB", "#4BC0C0", "#FF6384"],
      },
    ],
  };

  const expensePieData = {
    labels: expenses.map((e) => e.category),
    datasets: [
      {
        data: expenses.map((e) => e.amount),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
          "#C9CBCF",
          "#8DD1E1",
        ],
      },
    ],
  };

  // Central Administration Budget
  const centralAdminBudget = centralAdmin.budget;

  const centralAdminBreakdown = centralAdmin.breakdown;

  const centralAdminPieData = {
    labels: centralAdminBreakdown.map((i) => i.category),
    datasets: [
      {
        data: centralAdminBreakdown.map(
          (i) => +((centralAdminBudget * i.percent) / 100).toFixed(2),
        ),
        backgroundColor: [
          "#36A2EB",
          "#4BC0C0",
          "#FF6384",
          "#FFCE56",
          "#9966FF",
          "#8DD1E1",
        ],
      },
    ],
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-4 pb-20">
        <div className="p-6 space-y-6">
          {/* Page Title */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Church Financial Dashboard</h1>
            <p className="text-sm opacity-70">
              Overview of income, expenses, and central administration
            </p>
          </div>

          {/* KPI Header */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Income" value={totalIncome} />
            <StatCard title="Total Expenses" value={totalExpense} />
            <StatCard
              title="Net Income"
              value={netIncome}
              variant={netIncome >= 0 ? "success" : "error"}
            />
          </div>

          {/* Income Section */}
          <div className="card bg-base-100 shadow-xl p-6 space-y-6">
            <h2 className="card-title text-lg">Income</h2>

            <FinancePieChart data={pieData} />

            {/* Income Breakdown List */}
            <div className="space-y-3">
              {incomeBreakdown.map((item) => {
                const percentage =
                  totalIncome > 0 ? (item.amount / totalIncome) * 100 : 0;
                return (
                  <BreakdownItem
                    key={item.category}
                    category={item.category}
                    amount={item.amount}
                    percentage={percentage}
                  />
                );
              })}

              {/* Income Total (list only) */}
              <div className="flex justify-between pt-3 font-semibold">
                <span>Total Income</span>
                <span className="tabular-nums">
                  $
                  {totalIncome.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="card bg-base-100 shadow-xl p-6 space-y-6">
            <h2 className="card-title text-lg">Expenses</h2>

            <FinancePieChart data={expensePieData} />

            {/* Expense List */}
            <div className="space-y-3">
              {expenses.map((item) => {
                const percentage =
                  totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0;
                return (
                  <BreakdownItem
                    key={item.category}
                    category={item.category}
                    amount={item.amount}
                    percentage={percentage}
                  />
                );
              })}

              {/* Total Expense (list only) */}
              <div className="flex justify-between pt-3 font-semibold">
                <span>Total Expenses</span>
                <span className="tabular-nums">
                  $
                  {totalExpense.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Central Administration Section */}
          <div className="card bg-base-100 shadow-xl p-6 space-y-6">
            <h2 className="card-title text-lg">Central Administration</h2>

            <div className="text-sm opacity-70">
              Global monthly administration budget:{" "}
              <span className="font-semibold">
                $
                {centralAdminBudget.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <FinancePieChart data={centralAdminPieData} />
          </div>
        </div>
      </div>
    </div>
  );
}
