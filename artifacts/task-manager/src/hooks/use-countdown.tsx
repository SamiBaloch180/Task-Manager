import { useState, useEffect } from 'react';

export function useCountdown(deadline: string | null | undefined) {
  const [remaining, setRemaining] = useState<number>(() => {
    if (!deadline) return 0;
    return new Date(deadline).getTime() - Date.now();
  });

  useEffect(() => {
    if (!deadline) return;
    
    // Initial check
    setRemaining(new Date(deadline).getTime() - Date.now());
    
    const id = setInterval(() => {
      setRemaining(new Date(deadline).getTime() - Date.now());
    }, 1000);
    
    return () => clearInterval(id);
  }, [deadline]);
  
  if (!deadline) {
    return { label: 'No deadline', color: 'text-muted-foreground', bgColor: 'bg-muted/50', pct: 0, isOverdue: false };
  }
  
  if (remaining <= 0) return { label: 'Overdue', color: 'text-destructive', bgColor: 'bg-destructive/10', pct: 0, isOverdue: true };
  
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  
  let label = '';
  if (d > 0) label = `${d}d ${h}h ${m}m`;
  else if (h > 0) label = `${h}h ${m}m ${s}s`;
  else label = `${m}m ${s}s`;

  // Estimate total duration context to calculate percentage (assuming typically tasks are 1-14 days)
  // For UI sake, if > 3 days it's green, < 1 day red, in between yellow.
  const threeDays = 3 * 86400000;
  const oneDay = 86400000;
  
  let color = 'text-primary';
  let bgColor = 'bg-primary/10';
  
  if (remaining < oneDay) {
    color = 'text-destructive';
    bgColor = 'bg-destructive/10';
  } else if (remaining < threeDays) {
    color = 'text-amber-500 dark:text-amber-400';
    bgColor = 'bg-amber-500/10 dark:bg-amber-400/10';
  }

  return { label, color, bgColor, pct: 100, isOverdue: false }; // pct can be fleshed out if we have total duration
}
