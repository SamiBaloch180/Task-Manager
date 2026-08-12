import React, { useState, useMemo } from 'react';
import { 
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateTaskStatus,
  useListUsers,
  getListTasksQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, MoreHorizontal, Pencil, Trash, Play, Check, X, Search, Clock, AlertTriangle, CheckCircle2, XCircle, Timer, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useCountdown } from '@/hooks/use-countdown';
import { Task } from '@workspace/api-client-react';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  assignedTo: z.string().min(1, 'Assignee is required'),
  durationValue: z.coerce.number().min(1, 'Duration must be at least 1'),
  durationUnit: z.enum(['hours', 'days', 'weeks']),
});

function TimerCell({ deadline }: { deadline: string }) {
  const { label, color, bgColor, isOverdue } = useCountdown(deadline);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold shadow-2xs border border-border/40 ${color} ${bgColor}`}>
      <Timer className={`h-3.5 w-3.5 ${isOverdue ? 'animate-bounce' : ''}`} />
      {label}
    </span>
  );
}

export default function AdminTasks() {
  const { data: tasks, isLoading: tasksLoading } = useListTasks();
  const { data: users } = useListUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      assignedTo: '',
      durationValue: 1,
      durationUnit: 'days',
    },
  });

  const resetForm = () => {
    form.reset({
      title: '',
      description: '',
      assignedTo: '',
      durationValue: 1,
      durationUnit: 'days',
    });
    setEditingTask(null);
  };

  const handleOpenEdit = (task: Task) => {
    form.reset({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      durationValue: task.durationValue,
      durationUnit: task.durationUnit,
    });
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    if (editingTask) {
      updateTask.mutate({ taskId: editingTask.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: 'Task updated successfully' });
          setIsDialogOpen(false);
          resetForm();
        }
      });
    } else {
      createTask.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: 'Task created successfully' });
          setIsDialogOpen(false);
          resetForm();
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate({ taskId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: 'Task deleted' });
        }
      });
    }
  };

  const handleStatusUpdate = (id: string, status: 'pending' | 'in_progress' | 'completed' | 'incomplete') => {
    updateTaskStatus.mutate({ taskId: id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: 'Task status updated' });
      }
    });
  };

  const filteredTasks = useMemo(() => {
    return (tasks ?? []).filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.assignedToName && t.assignedToName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Assign, track, and monitor deadline-driven deliverables.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="font-bold shadow-md shadow-primary/20 rounded-xl px-5 h-10">
              <Plus className="mr-1.5 h-4 w-4 stroke-[3]" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Complete Q3 Financial Audit" {...field} className="text-xs rounded-lg" />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Provide detailed execution instructions..." {...field} className="text-xs rounded-lg min-h-[90px]" />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Assignee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-xs rounded-lg">
                            <SelectValue placeholder="Select an employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {users?.filter(u => u.role === 'employee' && u.status === 'approved').map(user => {
                            const empId = user.email.includes('@taskforce.local')
                              ? user.email.split('@')[0].toUpperCase()
                              : user.email;
                            return (
                              <SelectItem key={user.id} value={user.id} className="text-xs font-medium">
                                <span className="font-mono font-bold text-primary mr-1.5">[{empId}]</span>
                                <span>{user.fullName}</span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="durationValue"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs font-semibold">Duration</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} className="text-xs rounded-lg font-mono" />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationUnit"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs font-semibold">Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl text-xs">
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full font-bold mt-3 h-10 rounded-xl shadow-md shadow-primary/20" disabled={createTask.isPending || updateTask.isPending}>
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, description or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs rounded-xl bg-card border-border/80"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-card border border-border/80 rounded-xl shadow-2xs flex-shrink-0 max-w-full">
          {['all', 'pending', 'in_progress', 'completed', 'incomplete'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === status 
                  ? 'bg-primary text-primary-foreground shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {status === 'all' ? 'All Tasks' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="border border-border/80 rounded-2xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-muted/30 text-xs">
                <TableHead className="w-[260px] sm:w-[340px] font-bold">Task Title & Details</TableHead>
                <TableHead className="font-bold">Assignee</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold whitespace-nowrap">Deadline Counter</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasksLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground font-mono">Loading workspace tasks...</TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                    No matching tasks found. Create a new task to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map(task => {
                  const assigneeInitials = task.assignedToName
                    ? task.assignedToName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                    : 'U';

                  return (
                    <TableRow key={task.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-bold text-sm text-foreground">{task.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-[220px] sm:max-w-[280px] mt-0.5">{task.description || 'No description provided'}</div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-primary/20 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">{assigneeInitials}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-semibold text-foreground whitespace-nowrap">{task.assignedToName || 'Unknown'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold border whitespace-nowrap ${
                          task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                          task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                          task.status === 'incomplete' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {task.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                          {task.status === 'in_progress' && <Play className="h-3 w-3" />}
                          {task.status === 'incomplete' && <XCircle className="h-3 w-3" />}
                          {task.status === 'pending' && <Clock className="h-3 w-3" />}
                          {task.status.replace('_', ' ')}
                        </span>
                      </TableCell>

                      <TableCell>
                        {task.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </span>
                        ) : task.status === 'incomplete' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 whitespace-nowrap">
                            <XCircle className="h-3 w-3" /> Expired
                          </span>
                        ) : (
                          <TimerCell deadline={task.deadline} />
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-accent">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => handleOpenEdit(task)} className="text-xs font-medium">
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-xs font-medium">
                                <Play className="mr-2 h-3.5 w-3.5" /> Change Status
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="rounded-xl">
                                <DropdownMenuRadioGroup value={task.status} onValueChange={(val) => handleStatusUpdate(task.id, val as any)}>
                                  <DropdownMenuRadioItem value="pending" className="text-xs">Pending</DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="in_progress" className="text-xs">In Progress</DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="completed" className="text-xs text-emerald-600">Completed</DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="incomplete" className="text-xs text-rose-600">Incomplete</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs font-medium text-destructive focus:text-destructive" onClick={() => handleDelete(task.id)}>
                              <Trash className="mr-2 h-3.5 w-3.5" /> Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

