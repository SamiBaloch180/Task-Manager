import React from 'react';
import { useListAttendance } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminAttendance() {
  const { data: attendance, isLoading } = useListAttendance();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance Log</h1>
        <p className="text-muted-foreground">Company-wide daily check-ins and check-outs.</p>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : !attendance || attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No attendance records found.</TableCell>
              </TableRow>
            ) : (
              attendance.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(record.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.employeeName || 'Unknown'}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
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
