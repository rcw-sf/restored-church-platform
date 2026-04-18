import db from "@/lib/firestore";
import type {
  CentralAdminData,
  ExpenseItem,
  FinanceDocument,
  IncomeData,
} from "@/types/finance";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useFinanceData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [income, setIncome] = useState<IncomeData>({
    weeklyContribution: 0,
    specialMissions: 0,
    benevolence: 0,
  });
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [centralAdmin, setCentralAdmin] = useState<CentralAdminData>({
    budget: 0,
    breakdown: [],
  });

  useEffect(() => {
    const fetchFinanceData = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, "public_finance_dashboard", "current");
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const rawData = snap.data() as FinanceDocument;
          // Drill down into the nested structure provided in the data
          const data = rawData.public_finance_dashboard?.current || rawData;

          if (data.income) {
            setIncome(data.income);
          }
          if (Array.isArray(data.expenses)) {
            setExpenses(data.expenses);
          }
          if (data.centralAdmin) {
            setCentralAdmin(data.centralAdmin);
          }
        } else {
          console.warn("No finance dashboard document found in Firestore.");
        }
      } catch (err) {
        console.error("Error fetching finance data from Firestore:", err);
        setError(
          "Failed to load financial data. Please check your network or disable ad-blockers.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchFinanceData();
  }, []);

  return { loading, error, income, expenses, centralAdmin };
}
