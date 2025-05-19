import { Realtime } from "@inngest/realtime";
import type { createStepTools } from "inngest/components/InngestStepTools";
import type { inngest } from "./client";

export const maxDuration = 500;

export type InngestStep = ReturnType<typeof createStepTools<typeof inngest>>;

export type InngestPublish = Realtime.PublishFn;
