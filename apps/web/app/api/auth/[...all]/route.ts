import { auth } from "@/lib/auth"; // path to your auth file
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

export const { POST, GET } = toNextJsHandler(auth);
