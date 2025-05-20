import Link from "next/link";

export default function Home() {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] items-center justify-items-center gap-8 p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20">
      <div className="flex w-full justify-end">
        <Link href="/auth/signin" className="text-sm hover:underline">
          Sign in
        </Link>
      </div>
      <div className="flex max-w-2xl flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">
          Stop searching your bookmark
        </h1>
        <h2 className="text-3xl md:text-4xl">Start Save It NOW smartly</h2>

        <div className="mt-8 flex w-full max-w-md flex-col gap-4 sm:flex-row">
          <input
            type="text"
            placeholder="Enter URL"
            className="flex-1 rounded-md border border-gray-300 px-6 py-3 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button className="rounded-md bg-green-200 px-6 py-3 font-medium transition-colors hover:bg-green-300">
            SaveIt.now
          </button>
        </div>
      </div>
    </div>
  );
}
