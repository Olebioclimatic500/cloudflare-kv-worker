import Image from "next/image";
import { Counter } from "@/components/counter";
import { getCounter } from "./actions";

// Force dynamic rendering to prevent build-time errors when KV API isn't accessible
export const dynamic = 'force-dynamic';

export default async function Home() {
  const initialCount = await getCounter();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <h1 className="text-3xl font-bold text-center">
          Cloudflare KV + Next.js Demo
        </h1>

        <Counter initialCount={initialCount} />

        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="bg-black/[.05] dark:bg-white/[.06] p-6 rounded-lg">
            <h2 className="font-bold text-lg mb-2">How it works</h2>
            <ul className="font-mono list-inside list-decimal text-sm/6 space-y-2">
              <li className="tracking-[-.01em]">
                Counter data is stored in Cloudflare KV
              </li>
              <li className="tracking-[-.01em]">
                Server Actions handle all KV operations
              </li>
              <li className="tracking-[-.01em]">
                Client component provides interactive UI
              </li>
              <li className="tracking-[-.01em]">
                Data persists across page reloads
              </li>
            </ul>
          </div>

          <div className="bg-black/[.05] dark:bg-white/[.06] p-6 rounded-lg">
            <h2 className="font-bold text-lg mb-2">Setup</h2>
            <ol className="font-mono list-inside list-decimal text-sm/6 space-y-2">
              <li className="tracking-[-.01em]">
                Configure{" "}
                <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
                  .env.local
                </code>{" "}
                with KV_API_URL and KV_API_TOKEN
              </li>
              <li className="tracking-[-.01em]">
                Run your Cloudflare KV Worker locally or in production
              </li>
              <li className="tracking-[-.01em]">
                Start Next.js with{" "}
                <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
                  bun dev
                </code>
              </li>
            </ol>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/kulterryan/cloudflare-kv-worker"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Documentation
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://developers.cloudflare.com/kv/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Cloudflare KV Docs
        </a>
      </footer>
    </div>
  );
}
