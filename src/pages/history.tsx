import React, { useRef, useState } from "react";
import { format, getDaysInMonth } from "date-fns";
import {
  useListEntries,
  useGetMonthlySummary,
} from "@/lib/api";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Printer, ChevronLeft, ChevronRight, Receipt, CheckCircle2, XCircle
} from "lucide-react";
import QRCode from "react-qr-code";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

type Entry = {
  id: number;
  date: string;
  lunchTaken: boolean;
  dinnerTaken: boolean;
  lunchPresent: boolean;
  dinnerPresent: boolean;
  notes?: string | null;
};

export default function HistoryPage() {
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthLabel = format(currentDate, "MMMM yyyy");

  const { data: entriesData, isLoading: isLoadingEntries } = useListEntries({ year, month });
  const { data: summaryData, isLoading: isLoadingSummary } = useGetMonthlySummary({ year, month });

  const prevMonth = () => setCurrentDate(new Date(year, month - 2));
  const nextMonth = () => setCurrentDate(new Date(year, month));

  const entries: Entry[] = (Array.isArray(entriesData) ? entriesData : []) as Entry[];
  
  // Sort entries for the history list
  const sortedEntries = [...entries].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const costPerMeal = summaryData?.mealCostPerMeal ?? 50;

  // Invoice Data Calculation
  const totalMeals = entries.reduce((s, e) => s + (e.lunchTaken ? 1 : 0) + (e.dinnerTaken ? 1 : 0), 0);
  const totalLunch = entries.reduce((s, e) => s + (e.lunchTaken ? 1 : 0), 0);
  const totalDinner = entries.reduce((s, e) => s + (e.dinnerTaken ? 1 : 0), 0);
  
  const skippedMeals = entries.reduce((s, e) => {
    let skipped = 0;
    if (e.lunchPresent !== undefined && !e.lunchTaken) skipped++;
    if (e.dinnerPresent !== undefined && !e.dinnerTaken) skipped++;
    return s + skipped;
  }, 0);

  const totalCost = totalMeals * costPerMeal;

  // PDF Export Reference
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      // The element is always rendered off-screen so the browser computes layout instantly.
      const imgData = await htmlToImage.toPng(printRef.current, { 
        quality: 1, 
        pixelRatio: 2 // High resolution
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (printRef.current.offsetHeight * pdfWidth) / printRef.current.offsetWidth;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Mess_Invoice_${monthLabel.replace(' ', '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoadingEntries || isLoadingSummary) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <Receipt className="h-10 w-10 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Loading History...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6 md:gap-8 pb-20 max-w-4xl mx-auto">
        
        {/* --- VISIBLE UI: Navigation & Controls --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-10 w-10 rounded-xl hover:bg-white dark:hover:bg-slate-800">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="w-40 text-center font-bold text-lg text-slate-800 dark:text-slate-100">
              {monthLabel}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-10 w-10 rounded-xl hover:bg-white dark:hover:bg-slate-800">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button onClick={exportPDF} disabled={isExporting} className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white gap-2">
            <Printer className="h-4 w-4" />
            {isExporting ? "Generating PDF..." : "Download Invoice"}
          </Button>
        </div>

        {/* --- VISIBLE UI: Summary Cards --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Meals</p>
            <p className="text-2xl font-black">{totalMeals}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Skipped</p>
            <p className="text-2xl font-black text-rose-500">{skippedMeals}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm col-span-2 md:col-span-2">
            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Due</p>
            <p className="text-2xl font-black text-primary">₹{totalCost}</p>
          </div>
        </div>

        {/* --- VISIBLE UI: History Timeline --- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-slate-400" /> Meal History
          </h2>

          {sortedEntries.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No meal records found for {monthLabel}.</p>
          ) : (
            <div className="space-y-3">
              {sortedEntries.map((entry) => {
                const isLunch = entry.lunchTaken;
                const isDinner = entry.dinnerTaken;
                const mealsCount = (isLunch ? 1 : 0) + (isDinner ? 1 : 0);

                return (
                  <div key={entry.date} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-400 uppercase leading-none mb-0.5">{format(new Date(entry.date), "MMM")}</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{format(new Date(entry.date), "dd")}</span>
                      </div>
                      <div>
                        <div className="flex gap-2">
                          <span className={cn("text-[10px] font-bold px-2 py-1 rounded", isLunch ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}>LUNCH</span>
                          <span className={cn("text-[10px] font-bold px-2 py-1 rounded", isDinner ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}>DINNER</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Cost</p>
                      <p className="font-bold text-slate-900 dark:text-white">₹{mealsCount * costPerMeal}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* --- HIDDEN UI: PRINTABLE A4 INVOICE AREA --- */}
        <div style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}>
          <div 
            ref={printRef} 
            className="bg-white text-slate-900 w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] relative overflow-hidden"
            style={{ boxSizing: "border-box" }} // Enforce A4 dimensions exactly for printing
          >
            {/* Top Border Accent */}
            <div className="absolute top-0 left-0 w-full h-2 bg-primary" />

            {/* Header: Company & Invoice Info */}
            <div className="flex justify-between items-start mb-16">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">MEALPING</h1>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Main Campus Dining Facility<br />
                  123 University Road<br />
                  contact@messmanager.com
                </p>
              </div>

              <div className="text-right">
                <h2 className="text-4xl font-black text-slate-200 mb-2 uppercase tracking-widest">Invoice</h2>
                <div className="flex flex-col gap-1 text-sm">
                  <p><span className="text-slate-400 font-medium mr-2">Invoice No:</span> <span className="font-bold">INV-{year}{String(month).padStart(2, '0')}-{String(user?.id || '000').slice(0, 4).toUpperCase()}</span></p>
                  <p><span className="text-slate-400 font-medium mr-2">Date:</span> <span className="font-bold">{format(new Date(), "dd MMM yyyy")}</span></p>
                </div>
              </div>
            </div>

            {/* Bill To & QR */}
            <div className="flex justify-between items-end mb-12 pb-8 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{user?.email || "Student Name"}</h3>
                <p className="text-slate-500 text-sm">Student ID: {String(user?.id || 'N/A').slice(0, 8).toUpperCase()}</p>
                <p className="text-slate-500 text-sm">Billing Period: <span className="font-semibold">{monthLabel}</span></p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
                <QRCode 
                  value={(() => {
                    const l: number[] = [];
                    const din: number[] = [];
                    const n: Record<number, string> = {};
                    
                    entries.forEach(e => {
                      const day = new Date(e.date).getDate();
                      if (e.lunchTaken) l.push(day);
                      if (e.dinnerTaken) din.push(day);
                      if (e.notes) n[day] = e.notes;
                    });
                    
                    const payload = {
                      id: String(user?.id || '0').slice(0,4).toUpperCase(),
                      email: user?.email || 'Student',
                      y: year,
                      m: month,
                      cost: costPerMeal,
                      total: totalCost,
                      l,
                      d: din,
                      n
                    };
                    
                    const base64Data = btoa(JSON.stringify(payload));
                    return `${window.location.origin}/verify?d=${base64Data}`;
                  })()} 
                  size={130} 
                  level="M"
                  bgColor="transparent"
                />
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center">Scan to Verify<br/>Authenticity</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-12">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-sm">
                    <th className="py-3 font-bold text-slate-900 w-1/2">Description</th>
                    <th className="py-3 font-bold text-slate-900 text-center">Qty</th>
                    <th className="py-3 font-bold text-slate-900 text-right">Rate</th>
                    <th className="py-3 font-bold text-slate-900 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-slate-100">
                    <td className="py-4">
                      <p className="font-semibold text-slate-900">Lunch Meals</p>
                      <p className="text-slate-500 text-xs mt-1">Total lunches consumed in {monthLabel}</p>
                    </td>
                    <td className="py-4 text-center text-slate-600">{totalLunch}</td>
                    <td className="py-4 text-right text-slate-600">Rs. {costPerMeal.toFixed(2)}</td>
                    <td className="py-4 text-right font-medium text-slate-900">Rs. {(totalLunch * costPerMeal).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-4">
                      <p className="font-semibold text-slate-900">Dinner Meals</p>
                      <p className="text-slate-500 text-xs mt-1">Total dinners consumed in {monthLabel}</p>
                    </td>
                    <td className="py-4 text-center text-slate-600">{totalDinner}</td>
                    <td className="py-4 text-right text-slate-600">Rs. {costPerMeal.toFixed(2)}</td>
                    <td className="py-4 text-right font-medium text-slate-900">Rs. {(totalDinner * costPerMeal).toFixed(2)}</td>
                  </tr>
                  {skippedMeals > 0 && (
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="py-4">
                        <p className="font-semibold text-slate-900">Skipped Meals (Credit)</p>
                        <p className="text-slate-500 text-xs mt-1">Meals marked as skipped</p>
                      </td>
                      <td className="py-4 text-center text-slate-600">{skippedMeals}</td>
                      <td className="py-4 text-right text-slate-600">—</td>
                      <td className="py-4 text-right text-slate-400 font-medium">Rs. 0.00</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-16">
              <div className="w-full sm:w-1/2 md:w-1/3">
                <div className="flex justify-between py-2 text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">Rs. {totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm text-slate-600 border-b border-slate-100">
                  <span>Tax & Fees (0%)</span>
                  <span className="font-medium text-slate-900">Rs. 0.00</span>
                </div>
                <div className="flex justify-between py-4">
                  <span className="text-lg font-bold text-slate-900">Total Due</span>
                  <span className="text-2xl font-black text-primary">Rs. {totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer / Terms */}
            <div className="mt-auto pt-12 border-t border-slate-100 flex justify-between items-end">
              <div className="text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-500 mb-2">Terms & Conditions</p>
                <p>1. Please pay within 15 days of receiving this invoice.</p>
                <p>2. Late payments are subject to a 5% fee.</p>
                <p>3. For billing queries, contact support@mealping.com</p>
              </div>
              <div className="text-right">
                <p className="font-serif italic text-2xl text-slate-300 mb-1">MealPing</p>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Authorized Signatory</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
