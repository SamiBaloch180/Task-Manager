import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from 'wouter';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

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

function ProtectedRoute({ component: Component, allowedRole }: { component: React.ComponentType, allowedRole?: 'admin' | 'employee' }) {
  const { session, role, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-sm text-muted-foreground font-mono">Authenticating...</p></div></div>;
  }
  
  if (!session) {
    return <Redirect to="/sign-in" />;
  }
  
  if (allowedRole && role && role !== allowedRole) {
    return <Redirect to={role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} />;
  }

  return (
    <Shell>
      <Component />
    </Shell>
  );
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { session, role, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div></div>;
  }
  
  if (session && role) {
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