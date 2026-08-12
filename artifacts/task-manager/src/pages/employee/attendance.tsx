import React from 'react';
import { useListAttendance } from '@workspace/api-client-react';
import { format, differenceInMinutes } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, LogIn, LogOut, Timer, CheckCircle2 } from 'lucide-react';

export default function EmployeeAttendance() {
  const { data: attendance, isLoading } = useListAttendance();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-border/60 pb-5">
        <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-xs">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">My Attendance History</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">Your personal record of past check-ins, check-outs, and shift durations.</p>
        </div>
      </div>

      {/* History Table */}
      <div className="border border-border/80 rounded-2xl bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 text-xs">
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold"><LogIn className="h-3.5 w-3.5 inline mr-1 text-primary" /> Check In</TableHead>
              <TableHead className="font-bold"><LogOut className="h-3.5 w-3.5 inline mr-1 text-emerald-500" /> Check Out</TableHead>
              <TableHead className="font-bold">Duration</TableHead>
              <TableHead className="font-bold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground font-mono">Loading attendance history...</TableCell>
              </TableRow>
            ) : !attendance || attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">No attendance records found yet.</TableCell>
              </TableRow>
            ) : (
              attendance.map(record => {
                const duration = record.checkOut
                  ? (() => {
                      const mins = differenceInMinutes(new Date(record.checkOut), new Date(record.checkIn));
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return h > 0 ? `${h}h ${m}m` : `${m}m`;
                    })()
                  : '—';

                return (
                  <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-foreground font-bold">
                      {format(new Date(record.date), 'EEEE, MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-primary font-bold">
                      {format(new Date(record.checkIn), 'h:mm:ss a')}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.checkOut ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{format(new Date(record.checkOut), 'h:mm:ss a')}</span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">Still Active</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {duration}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold border ${
                        record.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        record.status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}>
                        {record.status === 'present' && <CheckCircle2 className="h-3 w-3" />}
                        {record.status}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

