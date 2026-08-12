import React, { useState, useMemo } from 'react';
import { useListUsers, useUpdateUser, useDeleteUser, getListUsersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MoreHorizontal, Shield, User as UserIcon, Check, X, ShieldAlert, Trash2, Search, IdCard, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function AdminEmployees() {
  const { data: users, isLoading } = useListUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will permanently delete them from the database and dashboard.`)) {
      deleteUser.mutate({ userId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: 'Employee deleted from database & dashboard' });
        },
        onError: (err: any) => {
          toast({ variant: 'destructive', title: 'Deletion failed', description: err.message });
        }
      });
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean, name: string) => {
    if (currentStatus) {
      if (confirm(`Do you want to permanently remove "${name}" from the database and dashboard?`)) {
        handleDeleteUser(id, name);
        return;
      }
    }
    updateUser.mutate({ userId: id, data: { isActive: !currentStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: `Employee ${!currentStatus ? 'activated' : 'deactivated'}` });
      }
    });
  };

  const handleToggleRole = (id: string, currentRole: 'admin' | 'employee') => {
    if (confirm(`Are you sure you want to make this user an ${currentRole === 'admin' ? 'employee' : 'admin'}?`)) {
      updateUser.mutate({ userId: id, data: { role: currentRole === 'admin' ? 'employee' : 'admin' } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: 'Role updated successfully' });
        }
      });
    }
  };

  const handleUpdateStatus = (id: string, name: string, newStatus: 'approved' | 'rejected') => {
    if (newStatus === 'rejected') {
      handleDeleteUser(id, name);
      return;
    }
    updateUser.mutate({ userId: id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: 'Employee approved successfully' });
      }
    });
  };

  const filteredUsers = useMemo(() => {
    return (users ?? []).filter(u => {
      const displayId = u.email.includes('@taskforce.local') ? u.email.split('@')[0] : u.email;
      const matchesSearch = u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            displayId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Employees</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Manage team access permissions, role authorizations, and accounts.</p>
      </div>

      {/* Toolbar Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee by name or User ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs rounded-xl bg-card border-border/80"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-card border border-border/80 rounded-xl shadow-2xs flex-shrink-0">
          {['all', 'approved', 'pending'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === st 
                  ? 'bg-primary text-primary-foreground shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {st === 'all' ? 'All Employees' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border/80 rounded-2xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/30 text-xs">
                <TableHead className="font-bold">User & ID</TableHead>
                <TableHead className="font-bold">Role</TableHead>
                <TableHead className="font-bold whitespace-nowrap">Account Status</TableHead>
                <TableHead className="font-bold whitespace-nowrap">Access State</TableHead>
                <TableHead className="font-bold whitespace-nowrap">Joined Date</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground font-mono">Loading team records...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">No employees found matching filter criteria.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => {
                  const initials = user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const displayId = user.email.includes('@taskforce.local') ? user.email.split('@')[0].toUpperCase() : user.email;

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-primary/20 shadow-2xs shrink-0">
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-foreground truncate">{user.fullName}</span>
                            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap">
                              <IdCard className="h-3 w-3 shrink-0" />
                              {displayId}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {user.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 whitespace-nowrap">
                              <Shield className="h-3 w-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/40 whitespace-nowrap">
                              <UserIcon className="h-3 w-3" /> Employee
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold border whitespace-nowrap ${
                          user.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 
                          user.status === 'rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {user.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                          {user.status === 'pending' && <Clock className="h-3 w-3" />}
                          {user.status}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold border whitespace-nowrap ${
                          user.isActive 
                            ? 'bg-primary/10 text-primary border-primary/20' 
                            : 'bg-muted text-muted-foreground border-border/40'
                        }`}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
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
                            {user.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, user.fullName, 'approved')} className="text-xs font-semibold text-emerald-600">
                                  <Check className="mr-2 h-4 w-4" /> Approve Employee
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, user.fullName, 'rejected')} className="text-xs font-semibold text-rose-600">
                                  <X className="mr-2 h-4 w-4" /> Reject & Delete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleToggleActive(user.id, user.isActive, user.fullName)} className="text-xs font-medium">
                              {user.isActive ? (
                                <><X className="mr-2 h-4 w-4" /> Disable Access</>
                              ) : (
                                <><Check className="mr-2 h-4 w-4 text-emerald-500" /> Enable Access</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleRole(user.id, user.role)} className="text-xs font-medium">
                              <ShieldAlert className="mr-2 h-4 w-4 text-primary" /> 
                              {user.role === 'admin' ? 'Demote to Employee' : 'Promote to Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteUser(user.id, user.fullName)} className="text-xs font-semibold text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Employee
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

