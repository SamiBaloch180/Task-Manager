import React, { useState, useMemo } from 'react';
import { useListAttendance, useListUsers } from '@workspace/api-client-react';
import { format, differenceInMinutes } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, LogIn, LogOut, Search, Timer, CheckCircle2, IdCard, Filter, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function AdminAttendance() {
  const { data: attendance, isLoading: attendanceLoading } = useListAttendance();
  const { data: users, isLoading: usersLoading } = useListUsers();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');

  // Build a lookup map from employee ID (Supabase profile UUID) to User ID display string (e.g. EMP-101)
  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; displayId: string }>();
    (users ?? []).forEach(u => {
      const displayId = u.email.includes('@taskforce.local') ? u.email.split('@')[0].toUpperCase() : u.email;
      map.set(u.id, { name: u.fullName, displayId });
    });
    return map;
  }, [users]);

  // Unique list of employees for the Employee ID filter dropdown
  const employeeOptions = useMemo(() => {
    const employeeList = (users ?? []).filter(u => u.role === 'employee');
    return employeeList.map(u => ({
      id: u.id,
      name: u.fullName,
      displayId: u.email.includes('@taskforce.local') ? u.email.split('@')[0].toUpperCase() : u.email,
    }));
  }, [users]);

  const filteredAttendance = useMemo(() => {
    return (attendance ?? []).filter(r => {
      const userInfo = userMap.get(r.employeeId);
      const name = r.employeeName || userInfo?.name || 'Unknown';
      const displayId = (r as any).displayUserId || userInfo?.displayId || '';
      const dateFormatted = format(new Date(r.date), 'MMM d, yyyy');

      // Filter 1: Dropdown selection
      const matchesDropdown = selectedEmployeeId === 'all' || r.employeeId === selectedEmployeeId;

      // Filter 2: Search input query (matches Name, User ID, or Date)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        name.toLowerCase().includes(q) || 
        displayId.toLowerCase().includes(q) || 
        dateFormatted.toLowerCase().includes(q);

      return matchesDropdown && matchesSearch;
    });
  }, [attendance, userMap, selectedEmployeeId, searchQuery]);

  const isLoading = attendanceLoading || usersLoading;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Attendance Log</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Company-wide historical shift check-ins, check-outs, and active durations.</p>
      </div>

      {/* Toolbar Filters: Search Bar & Employee ID Dropdown */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by Employee ID, name, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs rounded-xl bg-card border-border/80"
          />
        </div>

        {/* Dedicated Employee ID Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative flex-1">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="text-xs rounded-xl bg-card border-border/80 h-10">
                <div className="flex items-center gap-2 text-foreground font-medium truncate">
                  <IdCard className="h-4 w-4 text-primary shrink-0" />
                  <SelectValue placeholder="Filter by Employee ID" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                <SelectItem value="all" className="text-xs font-semibold">
                  All Employees ({employeeOptions.length})
                </SelectItem>
                {employeeOptions.map(emp => (
                  <SelectItem key={emp.id} value={emp.id} className="text-xs">
                    <span className="font-mono font-bold text-primary mr-1.5">[{emp.displayId}]</span>
                    <span>{emp.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployeeId !== 'all' && (
            <button
              onClick={() => setSelectedEmployeeId('all')}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors whitespace-nowrap shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Log Table */}
      <div className="border border-border/80 rounded-2xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/30 text-xs">
                <TableHead className="font-bold whitespace-nowrap">Date</TableHead>
                <TableHead className="font-bold whitespace-nowrap">Employee & ID</TableHead>
                <TableHead className="font-bold whitespace-nowrap"><LogIn className="h-3.5 w-3.5 inline mr-1 text-primary" /> Check In</TableHead>
                <TableHead className="font-bold whitespace-nowrap"><LogOut className="h-3.5 w-3.5 inline mr-1 text-emerald-500" /> Check Out</TableHead>
                <TableHead className="font-bold whitespace-nowrap">Total Duration</TableHead>
                <TableHead className="font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground font-mono">Loading company attendance log...</TableCell>
              </TableRow>
            ) : filteredAttendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  No attendance records found for the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredAttendance.map(record => {
                const userInfo = userMap.get(record.employeeId);
                const displayId = (record as any).displayUserId || userInfo?.displayId || 'EMP';
                const employeeName = record.employeeName || userInfo?.name || 'Unknown';
                const initials = employeeName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

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
                    <TableCell className="font-mono text-xs text-foreground font-bold whitespace-nowrap">
                      {format(new Date(record.date), 'EEEE, MMM d, yyyy')}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 border border-primary/20 shadow-2xs shrink-0">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-foreground whitespace-nowrap">{employeeName}</span>
                          <span className="text-[11px] text-primary font-mono font-bold flex items-center gap-1 mt-0.5 whitespace-nowrap">
                            <IdCard className="h-3 w-3" />
                            {displayId}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-primary font-bold whitespace-nowrap">
                      {format(new Date(record.checkIn), 'h:mm:ss a')}
                    </TableCell>

                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {record.checkOut ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{format(new Date(record.checkOut), 'h:mm:ss a')}</span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md whitespace-nowrap">Still Active</span>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3 w-3 text-muted-foreground" />
                        {duration}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold border whitespace-nowrap ${
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
    </div>
  );
}


