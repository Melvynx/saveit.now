import { prisma } from "@workspace/database";
import { notFound } from "next/navigation";
import { UnsubscribeForm } from "./unsubscribe-form";

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams: { confirmed?: string };
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, unsubscribed: true },
  });

  if (!user) {
    notFound();
  }

  if (searchParams.confirmed === "true") {
    if (!user.unsubscribed) {
      await prisma.user.update({
        where: { id: user.id },
        data: { unsubscribed: true },
      });
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unsubscribed Successfully</h1>
          <p className="text-gray-600 mb-6">
            You have been unsubscribed from all marketing emails from SaveIt.now.
          </p>
          <p className="text-sm text-gray-500">
            You may still receive important account-related emails for security and billing purposes.
          </p>
        </div>
      </div>
    );
  }

  if (user.unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Unsubscribed</h1>
          <p className="text-gray-600">
            You are already unsubscribed from marketing emails.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Unsubscribe</h1>
        <p className="text-gray-600 mb-6 text-center">
          Are you sure you want to unsubscribe from marketing emails?
        </p>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Email: <span className="font-medium">{user.email}</span>
        </p>
        <UnsubscribeForm userId={user.id} />
      </div>
    </div>
  );
}