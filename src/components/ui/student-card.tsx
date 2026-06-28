// src/components/ui/student-card.tsx
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Student = {
  id: string;
  name: string;
  messName: string;
  users: number;
  status: string;
  revenue: number;
  initials: string;
  color: string; // Tailwind gradient class e.g. "from-blue-500 to-cyan-500"
};

export default function StudentCard({ student }: { student: Student }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
    >
      {/* Student Info */}
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${student.color} flex items-center justify-center shadow-inner flex-shrink-0`}
        >
          <span className="text-white font-bold text-lg">{student.initials}</span>
        </div>
        <div>
          <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
            {student.messName}
          </h4>
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            Student: {student.name}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-8 flex-1 justify-between sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
            Users
          </p>
          <p className="font-semibold text-foreground text-sm">{student.users}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
            Revenue
          </p>
          <p className="font-semibold text-foreground text-sm">₹{student.revenue ? student.revenue.toLocaleString() : "-"}</p>
        </div>
        {/* Status Badge */}
        <div className="w-[100px] flex justify-end">
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border",
              student.status === "active"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400"
            )}
          >
            {student.status}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
