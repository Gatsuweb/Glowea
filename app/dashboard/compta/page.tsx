import React from "react";
import ComptaClient from "./ComptaClient";
import { getVueEnsembleData, getStatsData } from "../../actions/comptaActions";

export default async function ComptaPage() {
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2024-05"
  
  const [response, statsResponse] = await Promise.all([
    getVueEnsembleData(currentMonth),
    getStatsData(currentMonth)
  ]);

  const initialData = response.success ? response.data : {
    transactions: [],
    prevTransactions: [],
    recurringExpenses: []
  };

  const initialStatsData = statsResponse.success ? statsResponse.data : null;

  return <ComptaClient initialData={initialData} initialStatsData={initialStatsData} currentMonth={currentMonth} />;
}
