import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from 'wouter';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

// Pages
import Landing from '@/pages/landing';
import SignIn from '@/pages/auth/sign-in';
import SignUp from '@/pages/auth/sign-up';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminTasks from '@/pages/admin/tasks';
import AdminEmployees from '@/pages/admin/employees';
import AdminAttendance from '@/pages/admin/attendance';
import EmployeeDashboard from '@/pages/employee/dashboard';
import EmployeeAttendance from '@/pages/employee/attendance';
import Shell from '@/components/layout/shell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PendingApproval({ status }: { status: 'pending' | 'rejected' }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-sm p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          {status === 'pending' ? (
            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {status === 'pending' ? 'Pending Approval' : 'Account Rejected'}
        </h1>
        <p className="text-muted-foreground">
          {status === 'pending'
            ? 'Your account has been created and is waiting for an administrator to approve it. Please check back later.'
            : 'Your account access has been rejected by an administrator. If you believe this is a mistake, please contact support.'}
        </p>
        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorProfileScreen() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-sm p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Error Loading Profile</h1>
        <p className="text-muted-foreground text-sm">
          Unable to retrieve your account profile details. Please verify your connection or try signing out and signing back in.
        </p>
        <div className="pt-4 border-t flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
            Retry
          </Button>
          <Button variant="destructive" className="flex-1" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component, allowedRole }: { component: React.ComponentType, allowedRole?: 'admin' | 'employee' }) {
  const { session, role, status, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-sm text-muted-foreground font-mono">Authenticating...</p></div></div>;
  }
  
  if (!session) {
    return <Redirect to="/sign-in" />;
  }

  if (status === 'pending' || status === 'rejected') {
    return <PendingApproval status={status} />;
  }

  if (!role) {
    return <ErrorProfileScreen />;
  }
  
  if (allowedRole && role !== allowedRole) {
    return <Redirect to={role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} />;
  }

  return (
    <Shell>
      <Component />
    </Shell>
  );
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { session, role, status, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div></div>;
  }
  
  if (session) {
    if (!role) {
       return <ErrorProfileScreen />;
    }
    if (status === 'pending' || status === 'rejected') {
      return <PendingApproval status={status} />;
    }
    return <Redirect to={role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <AuthRoute component={Landing} />} />
      <Route path="/sign-in" component={() => <AuthRoute component={SignIn} />} />
      <Route path="/sign-up" component={() => <AuthRoute component={SignUp} />} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={() => <ProtectedRoute component={AdminDashboard} allowedRole="admin" />} />
      <Route path="/admin/tasks" component={() => <ProtectedRoute component={AdminTasks} allowedRole="admin" />} />
      <Route path="/admin/employees" component={() => <ProtectedRoute component={AdminEmployees} allowedRole="admin" />} />
      <Route path="/admin/attendance" component={() => <ProtectedRoute component={AdminAttendance} allowedRole="admin" />} />
      
      {/* Employee Routes */}
      <Route path="/employee/dashboard" component={() => <ProtectedRoute component={EmployeeDashboard} allowedRole="employee" />} />
      <Route path="/employee/attendance" component={() => <ProtectedRoute component={EmployeeAttendance} allowedRole="employee" />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;