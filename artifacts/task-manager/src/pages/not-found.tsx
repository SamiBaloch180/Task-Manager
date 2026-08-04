import React from "react";
import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="flex flex-col items-center max-w-md text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="p-4 bg-destructive/10 rounded-full">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <Link href="/">
          <Button size="lg" className="font-bold">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
