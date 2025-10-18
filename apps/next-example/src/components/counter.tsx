'use client';

import { useState, useTransition, useCallback } from 'react';
import { incrementCounter, decrementCounter, resetCounter } from '@/app/actions';

interface CounterProps {
  initialCount: number;
}

export function Counter({ initialCount }: CounterProps) {
  const [count, setCount] = useState(initialCount);
  const [latency, setLatency] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleIncrement = useCallback(() => {
    startTransition(async () => {
      const result = await incrementCounter();
      setCount(result.value);
      setLatency(result.latency);
    });
  }, []);

  const handleDecrement = useCallback(() => {
    startTransition(async () => {
      const result = await decrementCounter();
      setCount(result.value);
      setLatency(result.latency);
    });
  }, []);

  const handleReset = useCallback(() => {
    startTransition(async () => {
      const result = await resetCounter();
      setCount(result.value);
      setLatency(result.latency);
    });
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-black/[.05] dark:bg-white/[.06] rounded-lg">
      <h2 className="text-2xl font-bold">Cloudflare KV Counter</h2>
      <div className="text-6xl font-mono font-bold tabular-nums">
        {count}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={isPending}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded font-medium transition-colors"
        >
          -
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded font-medium transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={isPending}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded font-medium transition-colors"
        >
          +
        </button>
      </div>
      <div className="h-6 flex items-center justify-center">
        {isPending ? (
          <p className="text-sm text-gray-500">Updating...</p>
        ) : latency !== null ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Last operation:</span>
            <span className="font-mono font-bold text-green-600 dark:text-green-400">
              {latency}ms
            </span>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-center text-gray-600 dark:text-gray-400 max-w-md">
        This counter is stored in Cloudflare KV and persists across page reloads.
        It uses Next.js Server Actions to communicate with the KV API.
      </p>
    </div>
  );
}
