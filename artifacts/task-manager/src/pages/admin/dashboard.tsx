import React from 'react';
import { Link } from 'wouter';
import { 
  useGetDashboardStats, 
  useGetTaskStatusBreakdown, 
  useGetAttendanceSummary,
  useListTasks,
  useListUsers,
  useListAttendance
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { CheckSquare, Users, UserCheck, AlertTriangle, Loader2, Timer, LogIn, LogOut, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

const COLORS = {
  pending: 'hsl(38 92% 50%)',
  in_progress: 'hsl(238 84% 60%)',
  completed: 'hsl(160 84% 45%)',
  incomplete: 'hsl(350 89% 60%)'
};

export default function AdminDashboard() {
  const { data: users } = useListUsers();
  const pendingUsers = users?.filter(u => u.status === 'pending') || [];
  const hasPending = pendingUsers.length > 0;
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: statusBreakdown, isLoading: breakdownLoading } = useGetTaskStatusBreakdown();
  const { data: attendanceSummary, isLoading: attendanceLoading } = useGetAttendanceSummary();
  const { data: tasks, isLoading: tasksLoading } = useListTasks();
  const { data: allAttendance } = useListAttendance();

  // Filter to today's attendance records
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = (allAttendance ?? []).filter(r => r.date === todayStr);

  const isLoading = statsLoading || breakdownLoading || attendanceLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-mono text-muted-foreground">Loading Command Center analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Pending Approval Banner */}
      {hasPending && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-xl flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{pendingUsers.length} employee account(s) pending approval</p>
              <p className="text-xs text-amber-700 dark:text-amber-400/80">Review access permissions before granting workspace control.</p>
            </div>
          </div>
          <Link href="/admin/employees" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 self-start sm:self-auto shrink-0">
            Review <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Real-time command metrics for team execution & attendance.</p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <Card className="relative overflow-hidden border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Tasks</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CheckSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-mono text-foreground">{stats?.totalTasks || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Across all workspace workflows</p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="relative overflow-hidden border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-destructive" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Overdue Tasks</CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-mono text-destructive">{stats?.overdueTasksCount || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="relative overflow-hidden border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Employees</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-mono text-foreground">{stats?.totalEmployees || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Registered team members</p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="relative overflow-hidden border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Present Today</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{stats?.presentToday || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Checked in for shift today</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        {/* Attendance Bar Chart */}
        <Card className="lg:col-span-4 border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Attendance Velocity (7 Days)</CardTitle>
            <CardDescription className="text-xs">Daily shift activity count across teams</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pl-0 pr-2">
            <div className="h-[220px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceSummary} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(new Date(val), 'MMM d')} 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    width={28}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))', 
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-lg)',
                      fontSize: '12px'
                    }}
                    labelFormatter={(val) => format(new Date(val), 'MMM d, yyyy')}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="present" name="Present" fill="hsl(160 84% 45%)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="late" name="Late" fill="hsl(38 92% 50%)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="hsl(350 89% 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Task Status Breakdown Pie */}
        <Card className="lg:col-span-3 border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Task Breakdown</CardTitle>
            <CardDescription className="text-xs">Execution status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[280px] flex items-center justify-center">
              {statusBreakdown && statusBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || 'gray'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))', 
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}
                      itemStyle={{ textTransform: 'capitalize' }}
                    />
                    <Legend formatter={(value) => <span className="capitalize text-xs font-semibold">{String(value).replace('_', ' ')}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-xs">No tasks data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance Table */}
      <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary shrink-0" />
            Today's Shift Activity — {format(new Date(), 'MMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {todayAttendance.length === 0 ? (
            <p className="text-xs text-muted-foreground p-6 text-center">No employee check-ins recorded for today yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="font-bold">Employee</TableHead>
                    <TableHead className="font-bold whitespace-nowrap"><LogIn className="h-3.5 w-3.5 inline mr-1 text-primary" /> Check In</TableHead>
                    <TableHead className="font-bold whitespace-nowrap"><LogOut className="h-3.5 w-3.5 inline mr-1 text-emerald-500" /> Check Out</TableHead>
                    <TableHead className="font-bold">Duration</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAttendance.map(record => {
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
                        <TableCell className="font-bold text-xs whitespace-nowrap">{record.employeeName || 'Unknown'}</TableCell>
                        <TableCell className="font-mono text-xs text-primary font-bold whitespace-nowrap">
                          {format(new Date(record.checkIn), 'h:mm a')}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {record.checkOut ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{format(new Date(record.checkOut), 'h:mm a')}</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">Still Active</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{duration}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold border whitespace-nowrap ${
                            record.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            record.status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}>
                            {record.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

