"use server";

import { auth } from "@/lib/auth";
import { serverToast } from "@/lib/server-toast";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createApiKey(formData: FormData) {
  const name = formData.get("name") as string;
  
  if (!name || name.trim() === "") {
    await serverToast("Please provide a name for your API key");
    return;
  }

  try {
    await auth.api.createApiKey({
      headers: await headers(),
      body: {
        name: name.trim(),
        expiresIn: 60 * 60 * 24 * 365, // 1 year
      },
    });

    await serverToast("API key created successfully! Make sure to copy it now - you won't be able to see it again.");
    revalidatePath("/account/keys");
  } catch (error) {
    console.error("Failed to create API key:", error);
    await serverToast("Failed to create API key. Please try again.");
  }
}

export async function deleteApiKey(keyId: string) {
  try {
    await auth.api.deleteApiKey({
      headers: await headers(),
      body: { keyId },
    });

    await serverToast("API key deleted successfully");
    revalidatePath("/account/keys");
  } catch (error) {
    console.error("Failed to delete API key:", error);
    await serverToast("Failed to delete API key. Please try again.");
  }
}