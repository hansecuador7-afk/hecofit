import { useEffect, useState } from 'react';
import { formatTimer } from '@/lib/utils';

export function ElapsedTime({ startedAt, className }: { startedAt: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return <span className={className}>{formatTimer(elapsed)}</span>;
}
