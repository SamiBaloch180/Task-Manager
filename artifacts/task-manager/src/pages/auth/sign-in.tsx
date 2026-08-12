import React, { useState } from 'react';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Target, Loader2, User, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const signInSchema = z.object({
  userId: z.string().min(1, 'User ID or Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function SignIn() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { userId: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setIsLoading(true);

    let internalEmail = values.userId.trim().toLowerCase();
    if (!internalEmail.includes('@')) {
      internalEmail = `${internalEmail}@taskforce.local`;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: values.password,
    });

    setIsLoading(false);

    if (error) {
      const msg = error.message.toLowerCase().includes('invalid login credentials')
        ? 'Invalid User ID/Email or Password. Please try again.'
        : error.message;
      toast({ variant: 'destructive', title: 'Sign In Failed', description: msg });
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden font-sans">
      {/* Background Glow Elements */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-card/90 border border-border/80 rounded-2xl shadow-xl shadow-black/5 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="bg-primary/10 p-3.5 rounded-2xl mb-4 text-primary shadow-xs">
              <Target className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-xs text-muted-foreground mt-1">Enter your credentials to access TaskForce</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground">User ID or Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="e.g. EMP-101 or john@gmail.com" 
                          {...field} 
                          className="pl-9 font-mono text-xs rounded-lg bg-background/50 border-border/80 focus-visible:ring-primary" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          className="pl-9 font-mono text-xs rounded-lg bg-background/50 border-border/80 focus-visible:ring-primary" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full font-bold mt-6 h-10 rounded-xl shadow-md shadow-primary/20" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-xs text-muted-foreground border-t border-border/60 pt-6">
            Don't have an account?{' '}
            <Link href="/sign-up" className="text-primary font-bold hover:underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

