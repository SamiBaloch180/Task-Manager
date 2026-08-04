import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Clock, 
  LogOut,
  Target
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth();
  const [location] = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/admin/employees', label: 'Employees', icon: Users },
    { href: '/admin/attendance', label: 'Attendance', icon: Clock },
  ];

  const employeeLinks = [
    { href: '/employee/dashboard', label: 'My Tasks', icon: CheckSquare },
    { href: '/employee/attendance', label: 'Attendance', icon: Clock },
  ];

  const links = role === 'admin' ? adminLinks : employeeLinks;

  const initials = profile?.fullName
    ? profile.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background md:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
            <Target className="h-6 w-6" />
            <span>TaskForce</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto py-6 flex flex-col gap-1 px-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            {role === 'admin' ? 'Admin Portal' : 'Employee Portal'}
          </div>
          {links.map((link) => {
            const isActive = location === link.href;
            const Icon = link.icon;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{profile?.fullName}</span>
              <span className="text-xs text-muted-foreground capitalize">{role}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="flex h-14 items-center border-b bg-card px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
          <Target className="h-5 w-5" />
          <span>TaskForce</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Nav (Bottom) */}
      <nav className="fixed bottom-0 z-50 flex h-16 w-full border-t bg-card md:hidden">
        {links.map((link) => {
          const isActive = location === link.href;
          const Icon = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
