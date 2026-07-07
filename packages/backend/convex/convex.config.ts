import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";
import resend from "@convex-dev/resend/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";

const app = defineApp();
// LOCAL betterAuth component so we can extend the `user` table with SaveIt
// custom fields (see betterAuth/schema.ts). This keeps userId === BA user id.
app.use(betterAuth);
app.use(resend);
// Durable workflows for the bookmark-processing pipeline (processing/workflow.ts).
app.use(workflow);

export default app;
