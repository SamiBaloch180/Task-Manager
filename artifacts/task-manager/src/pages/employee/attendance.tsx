import React from 'react';
import { useListAttendance } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock } from 'lucide-react';

export default function EmployeeAttendance() {
  const { data: attendance, isLoading } = useListAttendance();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Attendance History</h1>
          <p className="text-muted-foreground">Your past check-ins and check-outs.</p>
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : !attendance || attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No attendance records found.</TableCell>
              </TableRow>
            ) : (
              attendance.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {format(new Date(record.date), 'EEEE, MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(record.checkIn), 'h:mm:ss a')}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {record.checkOut ? format(new Date(record.checkOut), 'h:mm:ss a') : '--:--:--'}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                      record.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' :
                      record.status === 'late' ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {record.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
