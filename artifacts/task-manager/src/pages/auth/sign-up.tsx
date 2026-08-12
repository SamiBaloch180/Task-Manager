import React, { useState } from 'react';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Target, Loader2, ShieldX, User, IdCard, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  userId: z
    .string()
    .min(3, 'User ID must be at least 3 characters')
    .max(50, 'User ID must be 50 characters or less')
    .refine(
      (val) => !val.includes('@'),
      { message: 'Email addresses are not allowed. Please use a unique User ID (e.g. EMP-101).' }
    ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function SignUp() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', userId: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);

    // Always map userId to internal email — no real email is ever used
    const cleanId = values.userId.toLowerCase().trim();
    const internalEmail = `${cleanId}@taskforce.local`;

    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password: values.password,
      options: {
        data: { full_name: values.fullName, user_id: values.userId.trim(), role: 'employee' },
      },
    });

    setIsLoading(false);

    if (error) {
      const msg = error.message.toLowerCase().includes('already registered')
        ? `"${values.userId}" is already taken. Please sign in or choose a different User ID.`
        : error.message;
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: msg });
      return;
    }

    if (data.session) {
      toast({ title: 'Account created!', description: 'Your account is pending admin approval.' });
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden font-sans">
      {/* Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-card/90 border border-border/80 rounded-2xl shadow-xl shadow-black/5 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="bg-primary/10 p-3.5 rounded-2xl mb-4 text-primary shadow-xs">
              <Target className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Create an account</h1>
            <p className="text-xs text-muted-foreground mt-1">Join TaskForce using a unique User ID</p>
          </div>

          {/* Notice banner — email not allowed */}
          <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-3.5 py-2.5 mb-5 text-xs font-medium">
            <ShieldX className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Email addresses are <strong>not accepted</strong>. Use a unique User ID assigned by your admin (e.g. <code className="font-mono bg-destructive/20 px-1 py-0.5 rounded">EMP-101</code>).</span>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground">Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="John Doe" 
                          {...field} 
                          className="pl-9 text-xs rounded-lg bg-background/50 border-border/80 focus-visible:ring-primary" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground">User ID</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g. EMP-101"
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
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-xs text-muted-foreground border-t border-border/60 pt-6">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

