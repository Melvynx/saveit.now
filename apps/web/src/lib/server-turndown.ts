import { createRequire } from "node:module";
import type TurndownServiceType from "turndown";

const require = createRequire(import.meta.url);

const TurndownService = require("turndown") as typeof TurndownServiceType;

export default TurndownService;
