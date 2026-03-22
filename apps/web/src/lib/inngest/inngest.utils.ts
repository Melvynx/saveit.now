import { Realtime } from "@inngest/realtime";
import type { BaseContext } from "inngest/types";
import type { inngest } from "./client";

export const maxDuration = 500;

export type InngestStep = BaseContext<typeof inngest>["step"];

export type InngestPublish = Realtime.PublishFn;
