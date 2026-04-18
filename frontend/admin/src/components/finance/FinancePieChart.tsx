import type { ChartData } from "chart.js";
import { Pie } from "react-chartjs-2";

interface FinancePieChartProps {
  data: ChartData<"pie">;
}

export function FinancePieChart({ data }: FinancePieChartProps) {
  return (
    <div className="h-80">
      <Pie
        data={data}
        options={{
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: function (context) {
                  const dataset = context.chart.data.datasets[0].data;

                  const numericData = dataset.filter(
                    (v): v is number => typeof v === "number",
                  );

                  const total = numericData.reduce((a, b) => a + b, 0);
                  const value = context.raw as number;
                  const percentage =
                    total > 0 ? ((value / total) * 100).toFixed(1) : "0";

                  return `${context.label}: ${percentage}%`;
                },
              },
            },
          },
        }}
      />
    </div>
  );
}
