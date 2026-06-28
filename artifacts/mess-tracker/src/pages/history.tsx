import { useState } from "react";
import { format, getDaysInMonth } from "date-fns";
import {
  useListEntries,
  useGetMonthlySummary,
  useUpsertEntry,
  getListEntriesQueryKey,
  getGetMonthlySummaryQueryKey,
  getGetTodayEntryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Download, ChevronLeft, ChevronRight, Coffee, Moon, FileText, StickyNote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mr } from "@/lib/i18n";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Entry = {
  id: number;
  date: string;
  lunchTaken: boolean;
  dinnerTaken: boolean;
  lunchPresent: boolean;
  dinnerPresent: boolean;
  notes?: string | null;
};

function exportCSV(entries: Entry[], year: number, month: number, costPerMeal: number) {
  const header = "तारीख,दुपारचे जेवण,रात्रीचे जेवण,जेवणे,खर्च (रु.),नोंद";
  const rows = entries.map((e) => {
    const meals = (e.lunchTaken ? 1 : 0) + (e.dinnerTaken ? 1 : 0);
    return `${e.date},${e.lunchTaken ? "घेतले" : "नाही"},${e.dinnerTaken ? "घेतले" : "नाही"},${meals},${meals * costPerMeal},"${e.notes ?? ""}"`;
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mess-${year}-${String(month).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(entries: Entry[], year: number, month: number, costPerMeal: number) {
  const doc = new jsPDF();
  const monthLabel = format(new Date(year, month - 1), "MMMM yyyy");
  const totalMeals = entries.reduce((s, e) => s + (e.lunchTaken ? 1 : 0) + (e.dinnerTaken ? 1 : 0), 0);
  const totalCost = totalMeals * costPerMeal;

  doc.setFontSize(22); doc.setTextColor(30, 30, 30);
  doc.text(mr.history.pdfTitle, 14, 22);
  doc.setFontSize(12); doc.setTextColor(100, 100, 100);
  doc.text(monthLabel, 14, 32);
  doc.setDrawColor(200, 200, 200); doc.line(14, 36, 196, 36);
  doc.setFontSize(11); doc.setTextColor(50, 50, 50);
  doc.text(`${mr.history.pdfCostPerMeal}:   Rs. ${costPerMeal}`, 14, 46);
  doc.text(`${mr.history.pdfTotalMeals}: ${totalMeals}`, 14, 54);
  doc.text(`${mr.history.pdfTotal}:    Rs. ${totalCost.toFixed(2)}`, 14, 62);

  autoTable(doc, {
    startY: 72,
    head: [[...mr.history.pdfHeaders]],
    body: entries.map((e) => {
      const meals = (e.lunchTaken ? 1 : 0) + (e.dinnerTaken ? 1 : 0);
      return [
        format(new Date(e.date + "T12:00:00"), "dd MMM yyyy"),
        e.lunchTaken ? mr.history.pdfTaken : "—",
        e.dinnerTaken ? mr.history.pdfTaken : "—",
        String(meals),
        (meals * costPerMeal).toFixed(2),
        e.notes ?? "",
      ];
    }),
    foot: [["", "", mr.history.pdfTotal2, String(totalMeals), totalCost.toFixed(2), ""]],
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [240, 253, 244], textColor: [15, 60, 30], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 5: { cellWidth: 40, fontSize: 8 } },
  });

  doc.save(`mess-bill-${year}-${String(month).padStart(2, "0")}.pdf`);
}

function EntryRow({ entry, costPerMeal, onToggle }: {
  entry: Entry;
  costPerMeal: number;
  onToggle: () => void;
}) {
  const [localEntry, setLocalEntry] = useState(entry);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(entry.notes ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const upsert = useUpsertEntry();
  const qc = useQueryClient();
  const dateObj = new Date(localEntry.date + "T12:00:00");
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  const toggle = async (field: keyof Pick<Entry, "lunchTaken" | "dinnerTaken" | "lunchPresent" | "dinnerPresent">) => {
    const updated = { ...localEntry, [field]: !localEntry[field] };
    setLocalEntry(updated);
    await upsert.mutateAsync({
      data: {
        date: updated.date, lunchTaken: updated.lunchTaken, dinnerTaken: updated.dinnerTaken,
        lunchPresent: updated.lunchPresent, dinnerPresent: updated.dinnerPresent,
        notes: updated.notes ?? undefined,
      },
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) }),
      qc.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ year, month }) }),
      qc.invalidateQueries({ queryKey: getGetTodayEntryQueryKey() }),
    ]);
    onToggle();
  };

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await upsert.mutateAsync({
        data: {
          date: localEntry.date, lunchTaken: localEntry.lunchTaken, dinnerTaken: localEntry.dinnerTaken,
          lunchPresent: localEntry.lunchPresent, dinnerPresent: localEntry.dinnerPresent,
          notes: noteText || undefined,
        },
      });
      setLocalEntry((prev) => ({ ...prev, notes: noteText }));
      await qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) });
      toast({ title: mr.history.noteSaved });
      setShowNote(false);
    } finally {
      setSavingNote(false);
    }
  };

  const meals = (localEntry.lunchTaken ? 1 : 0) + (localEntry.dinnerTaken ? 1 : 0);
  const cost = meals * costPerMeal;

  return (
    <div className="py-3.5 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {format(dateObj, "EEE, MMM d")}
          </p>
          {localEntry.notes && !showNote && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 italic">"{localEntry.notes}"</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Cost badge */}
          <span className="hidden sm:flex text-xs font-semibold text-muted-foreground bg-muted/60 rounded-xl px-2 py-1">
            {meals > 0 ? `₹${cost}` : "—"}
          </span>

          {/* Lunch toggle */}
          <div className="flex items-center gap-1">
            <Coffee className="h-3 w-3 text-muted-foreground" />
            <button
              onClick={() => toggle("lunchTaken")}
              className={cn(
                "text-xs font-semibold px-2 py-1 rounded-xl border transition-all",
                localEntry.lunchTaken
                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
                  : "text-muted-foreground border-border hover:border-primary/30 hover:bg-muted/60"
              )}
            >
              {localEntry.lunchTaken ? "✓" : "—"}
            </button>
          </div>

          {/* Dinner toggle */}
          <div className="flex items-center gap-1">
            <Moon className="h-3 w-3 text-muted-foreground" />
            <button
              onClick={() => toggle("dinnerTaken")}
              className={cn(
                "text-xs font-semibold px-2 py-1 rounded-xl border transition-all",
                localEntry.dinnerTaken
                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
                  : "text-muted-foreground border-border hover:border-primary/30 hover:bg-muted/60"
              )}
            >
              {localEntry.dinnerTaken ? "✓" : "—"}
            </button>
          </div>

          {/* Note toggle */}
          <button
            onClick={() => setShowNote((v) => !v)}
            title={mr.common.addNote}
            className={cn(
              "h-7 w-7 rounded-xl flex items-center justify-center transition-all",
              showNote || localEntry.notes
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            {showNote ? <X className="h-3.5 w-3.5" /> : <StickyNote className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {showNote && (
        <div className="mt-2.5 flex gap-2 items-start">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={mr.common.addNote + "..."}
            rows={2}
            className="flex-1 text-xs border border-border rounded-xl p-2.5 resize-none bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button size="sm" onClick={saveNote} disabled={savingNote} className="shrink-0 rounded-xl">
            {savingNote ? mr.common.saving : mr.common.save}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [refresh, setRefresh] = useState(0);

  const { data: entries, isLoading: entriesLoading } = useListEntries(
    { year, month },
    { query: { queryKey: [...getListEntriesQueryKey({ year, month }), refresh] } }
  );

  const { data: summary } = useGetMonthlySummary(
    { year, month },
    { query: { queryKey: [...getGetMonthlySummaryQueryKey({ year, month }), refresh] } }
  );

  const costPerMeal = summary?.mealCostPerMeal ?? 50;

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const isFutureMonth  = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);

  const handleExportCSV = () => {
    if (!entries?.length) { toast({ title: mr.history.noDataToExport, description: mr.history.noEntriesDesc }); return; }
    exportCSV(entries as Entry[], year, month, costPerMeal);
    toast({ title: mr.history.csvExported, description: `mess-${year}-${String(month).padStart(2, "0")}.csv` });
  };

  const handleExportPDF = () => {
    if (!entries?.length) { toast({ title: mr.history.noDataToExport, description: mr.history.noEntriesDesc }); return; }
    downloadPDF(entries as Entry[], year, month, costPerMeal);
    toast({ title: mr.history.pdfDownloaded, description: `mess-bill-${year}-${String(month).padStart(2, "0")}.pdf` });
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">इतिहास</p>
          <h1 className="text-2xl font-black text-foreground">{mr.nav.history}</h1>
          <p className="text-muted-foreground text-sm mt-1">{mr.history.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 rounded-xl text-xs font-semibold">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 rounded-xl text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Month selector */}
      <Card className="p-4 mb-4 rounded-3xl border-0 shadow-sm">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-2xl h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-base font-bold text-foreground">
            {format(new Date(year, month - 1), "MMMM yyyy")}
          </p>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={isCurrentMonth} className="rounded-2xl h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Summary chips */}
      {summary && (
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label: mr.history.mealsTaken, value: summary.totalMealsTaken, color: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" },
            { label: mr.history.daysPresent, value: summary.daysPresent, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300" },
            { label: mr.history.totalBill, value: `₹${summary.totalCost.toFixed(0)}`, color: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300" },
          ].map(({ label, value, color }) => (
            <Card key={label} className={cn("p-3.5 text-center rounded-2xl border-0 shadow-sm", color)}>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Entry list */}
      <Card className="p-4 rounded-3xl border-0 shadow-sm">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          {mr.history.dailyRecords}
        </p>

        {isFutureMonth ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{mr.history.noDataFuture}</p>
        ) : entriesLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 rounded-2xl" />)}
          </div>
        ) : !entries?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{mr.history.noEntries}</p>
        ) : (
          <div>
            {(entries as Entry[]).map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                costPerMeal={costPerMeal}
                onToggle={() => setRefresh(r => r + 1)}
              />
            ))}
          </div>
        )}
      </Card>
    </Layout>
  );
}
