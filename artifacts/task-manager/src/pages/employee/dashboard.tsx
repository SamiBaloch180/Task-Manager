import React from 'react';
import { 
  useListTasks, 
  useUpdateTaskStatus, 
  useGetTodayAttendance,
  useCheckIn,
  useCheckOut,
  getListTasksQueryKey,
  getGetTodayAttendanceQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, differenceInMinutes } from 'date-fns';
import { useCountdown } from '@/hooks/use-countdown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle2, Clock, LogIn, LogOut, Check, Timer, UserCheck, Sparkles, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@workspace/api-client-react';

function TaskCard({ task, onStatusChange }: { task: Task, onStatusChange: (id: string, status: string) => void }) {
  const { label, color, bgColor, isOverdue } = useCountdown(task.deadline);
  
  const isCompleted = task.status === 'completed';
  const isIncomplete = task.status === 'incomplete';
  const isInProgress = task.status === 'in_progress';
  const isPending = task.status === 'pending';

  return (
    <Card className={`relative overflow-hidden border-border/80 bg-card shadow-xs hover:shadow-md transition-all duration-200 ${isCompleted ? 'opacity-70 bg-card/60' : ''}`}>
      {/* Status Bar Left Accent */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${
        isCompleted ? 'bg-emerald-500' : 
        isIncomplete ? 'bg-rose-500' : 
        isInProgress ? 'bg-blue-500' : 'bg-amber-500'
      }`} />
      
      <CardHeader className="pb-2 pl-6 pt-5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-foreground leading-snug">{task.title}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Assigned by <strong>{task.assignedByName || 'Admin'}</strong></span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{format(new Date(task.createdAt), 'MMM d, h:mm a')}</span>
            </CardDescription>
          </div>

          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> Done
            </span>
          ) : isIncomplete ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
              <XCircle className="h-3.5 w-3.5" /> Expired
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border border-border/40 shadow-2xs ${color} ${bgColor}`}>
              <Timer className={`h-3.5 w-3.5 ${isOverdue ? 'animate-bounce' : ''}`} />
              {label}
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pl-6 pb-5">
        <p className="text-xs text-muted-foreground/90 mb-5 line-clamp-3 leading-relaxed">
          {task.description || 'No additional instructions provided for this task.'}
        </p>
        
        <div className="flex items-center gap-2">
          {isPending && !isOverdue && (
            <Button 
              size="sm"
              className="w-full sm:w-auto font-bold rounded-xl shadow-md shadow-primary/20" 
              onClick={() => onStatusChange(task.id, 'in_progress')}
            >
              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Start Task
            </Button>
          )}
          
          {isInProgress && !isOverdue && (
            <Button 
              size="sm"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20" 
              onClick={() => onStatusChange(task.id, 'completed')}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Complete Task
            </Button>
          )}
          
          {(isCompleted || isIncomplete) && !isOverdue && (
            <Button 
              size="sm"
              variant="outline" 
              className="w-full sm:w-auto font-semibold rounded-xl text-xs"
              onClick={() => onStatusChange(task.id, 'in_progress')}
            >
              Reopen Task
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(checkIn: string, checkOut: string) {
  const mins = differenceInMinutes(new Date(checkOut), new Date(checkIn));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function EmployeeDashboard() {
  const { data: tasks, isLoading: tasksLoading } = useListTasks();
  const { data: attendance, isLoading: attendanceLoading } = useGetTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const updateTaskStatus = useUpdateTaskStatus();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (taskId: string, status: string) => {
    updateTaskStatus.mutate({ taskId, data: { status: status as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: 'Task status updated' });
      }
    });
  };

  const handleCheckIn = () => {
    checkIn.mutate(undefined as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        toast({ title: 'Checked in successfully' });
      }
    });
  };

  const handleCheckOut = () => {
    checkOut.mutate(undefined as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        toast({ title: 'Checked out successfully' });
      }
    });
  };

  const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed' || t.status === 'incomplete') || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">My Workspace</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Focus on active execution deliverables and track your shift log.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Main Tasks List */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
              <Play className="h-4 w-4 text-primary fill-primary" />
              Active Tasks ({pendingTasks.length})
            </h2>
          </div>
          
          <div className="space-y-4">
            {tasksLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-36 bg-muted/60 rounded-2xl"></div>
                <div className="h-36 bg-muted/60 rounded-2xl"></div>
              </div>
            ) : pendingTasks.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-border/80 rounded-2xl bg-card">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-base text-foreground">All caught up!</h3>
                <p className="text-muted-foreground text-xs mt-1">You have no active pending tasks right now.</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))
            )}
          </div>

          {completedTasks.length > 0 && (
            <div className="pt-6">
              <h2 className="text-sm font-bold flex items-center gap-2 mb-4 text-muted-foreground">
                <Check className="h-4 w-4 text-emerald-500" />
                Recently Completed Tasks ({completedTasks.length})
              </h2>
              <div className="space-y-4">
                {completedTasks.slice(0, 4).map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Shift Card */}
        <div className="md:col-span-1">
          <Card className="sticky top-20 border-border/80 shadow-md bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/60 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Today's Shift Log
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-mono">
                {format(new Date(), 'EEEE, MMMM d')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              {attendanceLoading ? (
                <div className="h-28 animate-pulse bg-muted rounded-xl"></div>
              ) : (
                <div className="space-y-5 text-center">
                  {!attendance?.checkIn ? (
                    <>
                      <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary shadow-xs">
                        <Clock className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">You haven't checked in yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Click below to log your shift arrival.</p>
                      </div>
                      <Button 
                        size="lg" 
                        className="w-full h-12 text-sm font-bold rounded-xl shadow-lg shadow-primary/20" 
                        onClick={handleCheckIn}
                        disabled={checkIn.isPending}
                      >
                        <LogIn className="mr-2 h-4 w-4" /> Check In Now
                      </Button>
                    </>
                  ) : !attendance?.checkOut ? (
                    <>
                      <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center relative shadow-xs">
                        <div className="h-3 w-3 bg-primary rounded-full animate-ping absolute" />
                        <div className="h-5 w-5 bg-primary rounded-full" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Checked in at</p>
                        <p className="text-2xl font-extrabold font-mono text-primary mt-1">
                          {format(new Date(attendance.checkIn), 'h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/40 py-1.5 px-3 rounded-lg">
                        <Timer className="h-3.5 w-3.5 text-primary" />
                        <span>Active Duration: {formatDuration(attendance.checkIn, new Date().toISOString())}</span>
                      </div>
                      <Button 
                        size="lg" 
                        variant="secondary"
                        className="w-full h-12 text-sm font-bold rounded-xl border border-border shadow-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors" 
                        onClick={handleCheckOut}
                        disabled={checkOut.isPending}
                      >
                        <LogOut className="mr-2 h-4 w-4" /> Check Out Shift
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-full bg-emerald-500/10 w-16 h-16 mx-auto flex items-center justify-center text-emerald-500 shadow-xs">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider">Shift Completed ✓</p>
                        <div className="flex justify-center items-center gap-5 mt-3 font-mono">
                          <div className="flex flex-col items-center">
                            <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">In</span>
                            <span className="text-sm font-bold text-primary">{format(new Date(attendance.checkIn), 'h:mm a')}</span>
                          </div>
                          <div className="w-px h-6 bg-border" />
                          <div className="flex flex-col items-center">
                            <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Out</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{format(new Date(attendance.checkOut), 'h:mm a')}</span>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground font-mono flex items-center justify-center gap-1 bg-muted/30 py-1 rounded-lg">
                          <Timer className="h-3.5 w-3.5" />
                          <span>Total Shift: {formatDuration(attendance.checkIn, attendance.checkOut)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

