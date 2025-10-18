import type { Metadata } from 'next';
import Image from 'next/image';
import { Counter } from '@/components/counter';
import { getCounter } from './actions';

// Force dynamic rendering to prevent build-time errors when KV API isn't accessible
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cloudflare KV + Next.js Demo',
  description: 'Interactive counter demo showcasing Cloudflare KV integration with Next.js, featuring server actions and real-time data persistence.',
  openGraph: {
    title: 'Cloudflare KV + Next.js Demo',
    description: 'Interactive counter demo showcasing Cloudflare KV integration with Next.js, featuring server actions and real-time data persistence.',
    type: 'website',
  },
};

export default async function Home() {
  const initialCount = await getCounter();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <div className="flex items-center gap-8 flex-wrap justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80" className="dark:invert w-[180px] h-[38px]" aria-label="Next.js logo">
            <title>Next.js logo</title>
            <path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z" />
            <path
              fill="#000"
              d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"
            />
          </svg>

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 101.4 33.5" className="w-[152px] h-[50px]" aria-label="Cloudflare logo">
            <defs>
              <style>{`.cf-a { fill: #fff; } .cf-b { fill: #f48120; } .cf-c { fill: #faad3f; } .cf-d { fill: #404041; } @media (prefers-color-scheme: dark) { .cf-d { fill: #fff; } }`}</style>
            </defs>
            <title>Cloudflare logo</title>
            <path className="cf-a" d="M94.7,10.6,89.1,9.3l-1-.4-25.7.2V21.5l32.3.1Z" />
            <path className="cf-b" d="M84.2,20.4a2.85546,2.85546,0,0,0-.3-2.6,3.09428,3.09428,0,0,0-2.1-1.1l-17.4-.2c-.1,0-.2-.1-.3-.1a.1875.1875,0,0,1,0-.3c.1-.2.2-.3.4-.3L82,15.6a6.29223,6.29223,0,0,0,5.1-3.8l1-2.6c0-.1.1-.2,0-.3A11.39646,11.39646,0,0,0,66.2,7.7a5.45941,5.45941,0,0,0-3.6-1A5.20936,5.20936,0,0,0,58,11.3a5.46262,5.46262,0,0,0,.1,1.8A7.30177,7.30177,0,0,0,51,20.4a4.102,4.102,0,0,0,.1,1.1.3193.3193,0,0,0,.3.3H83.5c.2,0,.4-.1.4-.3Z" />
            <path className="cf-c" d="M89.7,9.2h-.5c-.1,0-.2.1-.3.2l-.7,2.4a2.85546,2.85546,0,0,0,.3,2.6,3.09428,3.09428,0,0,0,2.1,1.1l3.7.2c.1,0,.2.1.3.1a.1875.1875,0,0,1,0,.3c-.1.2-.2.3-.4.3l-3.8.2a6.29223,6.29223,0,0,0-5.1,3.8l-.2.9c-.1.1,0,.3.2.3H98.5a.26517.26517,0,0,0,.3-.3,10.87184,10.87184,0,0,0,.4-2.6,9.56045,9.56045,0,0,0-9.5-9.5" />
            <path
              className="cf-d"
              d="M100.5,27.2a.9.9,0,1,1,.9-.9.89626.89626,0,0,1-.9.9m0-1.6a.7.7,0,1,0,.7.7.68354.68354,0,0,0-.7-.7m.4,1.2h-.2l-.2-.3h-.2v.3h-.2v-.9h.5a.26517.26517,0,0,1,.3.3c0,.1-.1.2-.2.3l.2.3Zm-.3-.5c.1,0,.1,0,.1-.1a.09794.09794,0,0,0-.1-.1h-.3v.3h.3Zm-89.7-.9h2.2v6h3.8v1.9h-6Zm8.3,3.9a4.10491,4.10491,0,0,1,4.3-4.1,4.02,4.02,0,0,1,4.2,4.1,4.10491,4.10491,0,0,1-4.3,4.1,4.07888,4.07888,0,0,1-4.2-4.1m6.3,0a2.05565,2.05565,0,0,0-2-2.2,2.1025,2.1025,0,0,0,0,4.2c1.2.2,2-.8,2-2m4.9.5V25.4h2.2v4.4c0,1.1.6,1.7,1.5,1.7a1.39926,1.39926,0,0,0,1.5-1.6V25.4h2.2v4.4c0,2.6-1.5,3.7-3.7,3.7-2.3-.1-3.7-1.2-3.7-3.7m10.7-4.4h3.1c2.8,0,4.5,1.6,4.5,3.9s-1.7,4-4.5,4h-3V25.4Zm3.1,5.9a2.00909,2.00909,0,1,0,0-4h-.9v4Zm7.6-5.9h6.3v1.9H54v1.3h3.7v1.8H54v2.9H51.8Zm9.4,0h2.2v6h3.8v1.9h-6Zm11.7-.1h2.2l3.4,8H76.1l-.6-1.4H72.4l-.6,1.4H69.5Zm2,4.9L74,28l-.9,2.2Zm6.4-4.8H85a3.41818,3.41818,0,0,1,2.6.9,2.62373,2.62373,0,0,1-.9,4.2l1.9,2.8H86.1l-1.6-2.4h-1v2.4H81.3Zm3.6,3.8c.7,0,1.2-.4,1.2-.9,0-.6-.5-.9-1.2-.9H83.5v1.9h1.4Zm6.5-3.8h6.4v1.8H93.6v1.2h3.8v1.8H93.6v1.2h4.3v1.9H91.4ZM6.1,30.3a1.97548,1.97548,0,0,1-1.8,1.2,2.1025,2.1025,0,0,1,0-4.2,2.0977,2.0977,0,0,1,1.9,1.3H8.5a4.13459,4.13459,0,0,0-4.2-3.3A4.1651,4.1651,0,0,0,0,29.4a4.07888,4.07888,0,0,0,4.2,4.1,4.31812,4.31812,0,0,0,4.2-3.2Z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-center">Cloudflare KV + Next.js Demo</h1>

        <Counter initialCount={initialCount} />

        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="bg-black/[.05] dark:bg-white/[.06] p-6 rounded-lg">
            <h2 className="font-bold text-lg mb-2">How it works</h2>
            <ul className="font-mono list-inside list-decimal text-sm/6 space-y-2">
              <li className="tracking-[-.01em]">Counter data is stored in Cloudflare KV</li>
              <li className="tracking-[-.01em]">Server Actions handle all KV operations</li>
              <li className="tracking-[-.01em]">Client component provides interactive UI</li>
              <li className="tracking-[-.01em]">Data persists across page reloads</li>
            </ul>
          </div>

          <div className="bg-black/[.05] dark:bg-white/[.06] p-6 rounded-lg">
            <h2 className="font-bold text-lg mb-2">Setup</h2>
            <ol className="font-mono list-inside list-decimal text-sm/6 space-y-2">
              <li className="tracking-[-.01em]">
                Configure <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">.env.local</code> with KV_API_URL and KV_API_TOKEN
              </li>
              <li className="tracking-[-.01em]">Run your Cloudflare KV Worker locally or in production</li>
              <li className="tracking-[-.01em]">
                Start Next.js with <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">bun dev</code>
              </li>
            </ol>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a className="flex items-center gap-2 hover:underline hover:underline-offset-4" href="https://github.com/kulterryan/cloudflare-kv-worker" target="_blank" rel="noopener noreferrer">
          <Image aria-hidden src="/file.svg" alt="File icon" width={16} height={16} />
          Documentation
        </a>
        <a className="flex items-center gap-2 hover:underline hover:underline-offset-4" href="https://developers.cloudflare.com/kv/" target="_blank" rel="noopener noreferrer">
          <Image aria-hidden src="/globe.svg" alt="Globe icon" width={16} height={16} />
          Cloudflare KV Docs
        </a>
      </footer>
    </div>
  );
}
