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
import { format } from 'date-fns';
import { useCountdown } from '@/hooks/use-countdown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle2, Clock, LogIn, LogOut, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@workspace/api-client-react/src/generated/api.schemas';

function TaskCard({ task, onStatusChange }: { task: Task, onStatusChange: (id: string, status: string) => void }) {
  const { label, color, bgColor, pct } = useCountdown(task.deadline);
  
  const isCompleted = task.status === 'completed';
  const isIncomplete = task.status === 'incomplete';
  const isInProgress = task.status === 'in_progress';
  const isPending = task.status === 'pending';

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${
        isCompleted ? 'bg-emerald-500' : 
        isIncomplete ? 'bg-destructive' : 
        isInProgress ? 'bg-primary' : 'bg-muted'
      }`} />
      
      <CardHeader className="pb-3 pl-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Assigned by {task.assignedByName || 'Admin'} • {format(new Date(task.createdAt), 'MMM d')}
            </CardDescription>
          </div>
          {isCompleted ? (
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Done</span>
          ) : isIncomplete ? (
            <span className="text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-1 rounded">Failed</span>
          ) : (
            <span className={`px-3 py-1.5 rounded-md text-sm font-mono font-bold ${color} ${bgColor} animate-pulse-slow shadow-sm`}>
              {label}
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pl-6">
        <p className="text-sm text-foreground/80 mb-6 line-clamp-3">
          {task.description}
        </p>
        
        <div className="flex items-center gap-2">
          {isPending && (
            <Button 
              className="w-full sm:w-auto" 
              onClick={() => onStatusChange(task.id, 'in_progress')}
            >
              <Play className="mr-2 h-4 w-4" /> Start Task
            </Button>
          )}
          
          {isInProgress && (
            <Button 
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white" 
              onClick={() => onStatusChange(task.id, 'completed')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Task
            </Button>
          )}
          
          {(isCompleted || isIncomplete) && (
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => onStatusChange(task.id, 'in_progress')}
            >
              Reopen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
        toast({ title: 'Task updated' });
      }
    });
  };

  const handleCheckIn = () => {
    checkIn.mutate({}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        toast({ title: 'Checked in successfully' });
      }
    });
  };

  const handleCheckOut = () => {
    checkOut.mutate({}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        toast({ title: 'Checked out successfully' });
      }
    });
  };

  const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed' || t.status === 'incomplete') || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My Workspace</h1>
        <p className="text-muted-foreground mt-1 text-lg">Focus on what matters. Track your execution.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Active Tasks ({pendingTasks.length})
            </h2>
          </div>
          
          <div className="space-y-4">
            {tasksLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-40 bg-muted rounded-xl"></div>
                <div className="h-40 bg-muted rounded-xl"></div>
              </div>
            ) : pendingTasks.length === 0 ? (
              <div className="p-8 text-center border rounded-xl bg-card border-dashed">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg">All caught up!</h3>
                <p className="text-muted-foreground text-sm">You have no pending tasks right now.</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))
            )}
          </div>

          {completedTasks.length > 0 && (
            <div className="pt-8">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-muted-foreground">
                <Check className="h-5 w-5" />
                Recently Completed
              </h2>
              <div className="space-y-4 opacity-80">
                {completedTasks.slice(0, 3).map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Card className="sticky top-6 border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today's Shift
              </CardTitle>
              <CardDescription>
                {format(new Date(), 'EEEE, MMMM do')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {attendanceLoading ? (
                <div className="h-24 animate-pulse bg-muted rounded"></div>
              ) : (
                <div className="space-y-6 text-center">
                  {!attendance?.checkIn ? (
                    <>
                      <div className="p-4 rounded-full bg-muted w-20 h-20 mx-auto flex items-center justify-center mb-2">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium">You haven't checked in yet.</p>
                      <Button 
                        size="lg" 
                        className="w-full h-14 text-lg font-bold" 
                        onClick={handleCheckIn}
                        disabled={checkIn.isPending}
                      >
                        <LogIn className="mr-2 h-5 w-5" /> Check In Now
                      </Button>
                    </>
                  ) : !attendance?.checkOut ? (
                    <>
                      <div className="p-4 rounded-full bg-primary/10 w-20 h-20 mx-auto flex items-center justify-center mb-2">
                        <div className="h-3 w-3 bg-primary rounded-full animate-ping absolute" />
                        <div className="h-6 w-6 bg-primary rounded-full" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Checked in at</p>
                        <p className="text-2xl font-bold font-mono text-primary mt-1">
                          {format(new Date(attendance.checkIn), 'h:mm a')}
                        </p>
                      </div>
                      <Button 
                        size="lg" 
                        variant="secondary"
                        className="w-full h-14 text-lg font-bold" 
                        onClick={handleCheckOut}
                        disabled={checkOut.isPending}
                      >
                        <LogOut className="mr-2 h-5 w-5" /> Check Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-full bg-emerald-500/10 w-20 h-20 mx-auto flex items-center justify-center mb-2">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Shift completed</p>
                        <div className="flex justify-center gap-4 mt-2 font-mono text-sm">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[10px] uppercase">In</span>
                            <span>{format(new Date(attendance.checkIn), 'h:mm a')}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[10px] uppercase">Out</span>
                            <span>{format(new Date(attendance.checkOut), 'h:mm a')}</span>
                          </div>
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
