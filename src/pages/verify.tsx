import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Receipt, CheckCircle2, ShieldCheck,
  Coffee, CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";

export default function VerifyPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse the ?d= base64 string from URL parameters
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    
    if (!d) {
      setError("No invoice data found in the URL.");
      return;
    }

    try {
      // Decode Base64
      const decodedStr = atob(d);
      const parsedData = JSON.parse(decodedStr);
      setData(parsedData);
    } catch (err) {
      console.error("Decode error", err);
      setError("Invalid or corrupted invoice data.");
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="text-red-500 mb-4"><ShieldCheck className="h-16 w-16" /></div>
        <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 animate-pulse">
        <Receipt className="h-10 w-10 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">Verifying Invoice...</p>
      </div>
    );
  }

  // Data extraction
  const { id, email, y, m, cost, l, d: din, total, n = {} } = data;
  const monthName = format(new Date(y, m - 1), "MMMM yyyy");
  
  // Reconstruct timeline ONLY for days with meals
  const timeline = [];
  const maxDay = Math.max(...(l.length ? l : [0]), ...(din.length ? din : [0]), 31);
  
  for (let i = 1; i <= maxDay; i++) {
    const hasLunch = l.includes(i);
    const hasDinner = din.includes(i);
    if (hasLunch || hasDinner) {
      timeline.push({ day: i, hasLunch, hasDinner, note: n[i] || "" });
    }
  }

  const totalMeals = timeline.reduce((sum, item) => sum + (item.hasLunch ? 1 : 0) + (item.hasDinner ? 1 : 0), 0);
  const totalCostCalc = totalMeals * cost;

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8 flex justify-center items-start pt-8 pb-20">
      <div className="w-full max-w-4xl overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse border border-slate-200 text-sm text-slate-800">
          <thead className="bg-[#f4f7fb]">
            <tr>
              <th className="border border-slate-200 p-3 text-left font-bold text-slate-800 w-[150px]">Date</th>
              <th className="border border-slate-200 p-3 text-left font-bold text-slate-800 w-[100px]">Lunch</th>
              <th className="border border-slate-200 p-3 text-left font-bold text-slate-800 w-[100px]">Dinner</th>
              <th className="border border-slate-200 p-3 text-left font-bold text-slate-800 w-[80px]">Meals</th>
              <th className="border border-slate-200 p-3 text-left font-bold text-slate-800 w-[120px]">Cost (Rs)</th>
              <th className="border border-slate-200 p-3 text-left font-bold text-slate-800">Note</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((item) => {
              const meals = (item.hasLunch ? 1 : 0) + (item.hasDinner ? 1 : 0);
              const dayCost = meals * cost;
              const dateStr = `${item.day} ${format(new Date(y, m - 1), "MMM yyyy")}`;
              
              return (
                <tr key={item.day} className="bg-white">
                  <td className="border border-slate-200 p-3 text-slate-700">{dateStr}</td>
                  <td className="border border-slate-200 p-3 text-slate-700">{item.hasLunch ? 'Yes' : 'No'}</td>
                  <td className="border border-slate-200 p-3 text-slate-700">{item.hasDinner ? 'Yes' : 'No'}</td>
                  <td className="border border-slate-200 p-3 text-slate-700">{meals}</td>
                  <td className="border border-slate-200 p-3 text-slate-700">{dayCost.toFixed(2)}</td>
                  <td className="border border-slate-200 p-3 text-slate-700">{item.note}</td>
                </tr>
              );
            })}
            <tr className="bg-[#f4f7fb]">
              <td className="border border-slate-200 p-3"></td>
              <td className="border border-slate-200 p-3"></td>
              <td className="border border-slate-200 p-3 font-bold text-slate-900 text-right">TOTAL</td>
              <td className="border border-slate-200 p-3 font-bold text-slate-900">{totalMeals}</td>
              <td className="border border-slate-200 p-3 font-bold text-slate-900">{totalCostCalc.toFixed(2)}</td>
              <td className="border border-slate-200 p-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
