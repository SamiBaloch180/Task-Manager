import React from 'react';
import { Link } from 'wouter';
import { Target, ArrowRight, Activity, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <header className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
          <Target className="h-6 w-6" />
          <span>TaskForce</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="font-semibold shadow-sm">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
          The cockpit for team productivity
        </div>
        
        <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tighter text-foreground mb-6 leading-[1.1]">
          Execute with <span className="text-primary bg-clip-text">precision.</span>
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 font-medium">
          A high-density command center for your team. Assign deadline-driven tasks, track live execution, and manage attendance all in one place.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="h-12 px-8 text-base font-bold shadow-md w-full sm:w-auto">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full text-left">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <Activity className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Live Accountability</h3>
            <p className="text-muted-foreground text-sm">Countdown timers on every task keep the pressure healthy and the priorities clear.</p>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <ShieldCheck className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Role-Based Control</h3>
            <p className="text-muted-foreground text-sm">Adins command. Employees execute. Clean separation of concerns with instant sync.</p>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <Clock className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Integrated Attendance</h3>
            <p className="text-muted-foreground text-sm">Simple daily check-ins baked right into the daily workflow. No separate apps needed.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
