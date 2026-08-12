import React from 'react';
import { Link } from 'wouter';
import { Target, ArrowRight, Activity, Clock, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary relative overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5 text-foreground font-extrabold text-xl tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Target className="h-5 w-5" />
          </div>
          <span>TaskForce</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="font-bold shadow-md shadow-primary/20 rounded-lg px-5">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-28 relative">
        {/* Ambient Glow background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Hero Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-8 shadow-xs animate-fade-in">
          <Sparkles className="h-3.5 w-3.5" />
          <span>The cockpit for team productivity</span>
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
        
        <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
          Execute with <span className="bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent">precision.</span>
        </h1>
        
        <p className="max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground mb-10 font-normal leading-relaxed">
          A high-density command center for your team. Assign deadline-driven tasks, track live execution, and manage attendance all in one place.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link href="/sign-up">
            <Button size="lg" className="h-12 px-8 text-base font-bold shadow-lg shadow-primary/25 rounded-xl w-full sm:w-auto">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold border-border/80 rounded-xl w-full sm:w-auto">
              Sign In to Command Center
            </Button>
          </Link>
        </div>

        {/* Interactive Feature Cards Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full text-left">
          <div className="bg-card/90 border border-border/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 text-primary group-hover:scale-110 transition-transform">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground">Live Accountability</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Countdown timers on every task keep the pressure healthy and priorities crystal clear.</p>
          </div>

          <div className="bg-card/90 border border-border/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 text-indigo-500 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground">Role-Based Control</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Admins command. Employees execute. Clean separation of concerns with instant sync.</p>
          </div>

          <div className="bg-card/90 border border-border/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 text-emerald-500 group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground">Integrated Attendance</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Simple daily check-ins baked right into the daily workflow. No separate apps needed.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

