import React, { useState } from 'react';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function SignIn() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmHelp, setShowConfirmHelp] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setIsLoading(true);
    setShowConfirmHelp(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    setIsLoading(false);

    if (error) {
      // "Email not confirmed" — offer a one-click fix via backend
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setConfirmEmail(values.email);
        setShowConfirmHelp(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: error.message,
        });
      }
    }
    // On success, auth state change in use-auth.tsx handles redirect automatically
  }

  async function handleConfirmEmail() {
    setIsConfirming(true);
    try {
      const res = await fetch(`${BASE}/api/auth/confirm-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: confirmEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Email confirmed', description: 'You can now sign in.' });
        setShowConfirmHelp(false);
        // Re-submit the form
        form.handleSubmit(onSubmit)();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network error', description: 'Please try again.' });
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="bg-primary/10 p-3 rounded-full mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your TaskForce account</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@company.com" {...field} className="font-mono text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full font-bold mt-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </form>
          </Form>

          {showConfirmHelp && (
            <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                Email not confirmed
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Your account exists but the email hasn't been confirmed yet. Click below to confirm it instantly.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                onClick={handleConfirmEmail}
                disabled={isConfirming}
              >
                {isConfirming ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                Confirm email and sign in
              </Button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground border-t pt-6">
            Don't have an account?{' '}
            <Link href="/sign-up" className="text-primary font-semibold hover:underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
