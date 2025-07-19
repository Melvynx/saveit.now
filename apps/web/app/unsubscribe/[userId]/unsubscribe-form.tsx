"use client";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UnsubscribeForm({ userId }: { userId: string }) {
  const router = useRouter();

  const handleUnsubscribe = () => {
    router.push(`/unsubscribe/${userId}?confirmed=true`);
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleUnsubscribe}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        Yes, Unsubscribe Me
      </Button>
      
      <Link href="/" className="block">
        <Button variant="outline" className="w-full">
          No, Keep Me Subscribed
        </Button>
      </Link>
    </div>
  );
}