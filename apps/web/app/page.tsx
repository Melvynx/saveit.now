import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex justify-end w-full">
        <Link href="/auth/signin" className="text-sm hover:underline">
          Sign in
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center gap-8 max-w-2xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold">
          Stop searching your bookmark
        </h1>
        <h2 className="text-3xl md:text-4xl">Start Save It NOW smartly</h2>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-8">
          <input
            type="text"
            placeholder="Enter URL"
            className="flex-1 px-6 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button className="px-6 py-3 bg-green-200 hover:bg-green-300 transition-colors rounded-md font-medium">
            SaveIt.now
          </button>
        </div>
      </div>
    </div>
  );
}
