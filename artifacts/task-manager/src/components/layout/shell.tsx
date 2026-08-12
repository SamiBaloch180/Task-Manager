import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Clock, 
  LogOut,
  Target,
  Sun,
  Moon,
  ChevronRight,
  Shield,
  UserCheck
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth();
  const [location] = useLocation();
  
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

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
  const activeLink = links.find(l => l.href === location) || { label: 'Overview' };

  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background text-foreground md:flex-row font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex select-none z-20">
        {/* App Logo & Header */}
        <div className="flex h-16 items-center gap-3 border-b border-border/80 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Target className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight leading-none text-foreground">TaskForce</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Command Center</span>
          </div>
        </div>
        
        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1.5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
            <span>{role === 'admin' ? 'Management' : 'Workspace'}</span>
            {role === 'admin' ? (
              <Shield className="h-3 w-3 text-primary/70" />
            ) : (
              <UserCheck className="h-3 w-3 text-emerald-500/70" />
            )}
          </div>

          {links.map((link) => {
            const isActive = location === link.href;
            const Icon = link.icon;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25' 
                    : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        {/* User Card & Sign Out */}
        <div className="border-t border-border/80 p-3 bg-muted/20">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border/60 shadow-xs mb-3">
            <Avatar className="h-9 w-9 border border-primary/20 shadow-2xs">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-foreground truncate">{profile?.fullName || 'User'}</span>
              <span className="text-[10px] font-semibold text-muted-foreground capitalize flex items-center gap-1">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${role === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                {role}
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-medium h-9" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold text-base text-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Target className="h-4 w-4" />
          </div>
          <span>TaskForce</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar Header Desktop */}
        <header className="hidden md:flex h-14 items-center justify-between border-b border-border/80 bg-card/50 backdrop-blur-md px-8 select-none">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>TaskForce</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">{activeLink.label}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold tracking-wide uppercase">
              {role} portal
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-lg border-border hover:bg-accent" 
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 pb-20 md:pb-8 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 z-50 flex h-16 w-full border-t border-border bg-card/95 backdrop-blur-lg md:hidden">
        {links.map((link) => {
          const isActive = location === link.href;
          const Icon = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

