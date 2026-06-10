/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_actions from "../admin/actions.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as api_extensions from "../api/extensions.js";
import type * as api_helpers from "../api/helpers.js";
import type * as api_v1 from "../api/v1.js";
import type * as apiKeys_actions from "../apiKeys/actions.js";
import type * as apiKeys_helpers from "../apiKeys/helpers.js";
import type * as apiKeys_mutations from "../apiKeys/mutations.js";
import type * as auth_config from "../auth/config.js";
import type * as auth_hooks from "../auth/hooks.js";
import type * as auth_mutations from "../auth/mutations.js";
import type * as auth_queries from "../auth/queries.js";
import type * as billing_limits from "../billing/limits.js";
import type * as billing_plans from "../billing/plans.js";
import type * as bookmarks_dto from "../bookmarks/dto.js";
import type * as bookmarks_mutations from "../bookmarks/mutations.js";
import type * as bookmarks_queries from "../bookmarks/queries.js";
import type * as changelog_mutations from "../changelog/mutations.js";
import type * as changelog_queries from "../changelog/queries.js";
import type * as chat_actions from "../chat/actions.js";
import type * as chat_mutations from "../chat/mutations.js";
import type * as chat_queries from "../chat/queries.js";
import type * as chat_stream from "../chat/stream.js";
import type * as chat_usage from "../chat/usage.js";
import type * as crons from "../crons.js";
import type * as email_actions from "../email/actions.js";
import type * as email_mutations from "../email/mutations.js";
import type * as email_queries from "../email/queries.js";
import type * as email_templates from "../email/templates.js";
import type * as files_actions from "../files/actions.js";
import type * as functions from "../functions.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as marketing_drips from "../marketing/drips.js";
import type * as marketing_dripsQueries from "../marketing/dripsQueries.js";
import type * as marketing_emailTemplates from "../marketing/emailTemplates.js";
import type * as marketing_limitReached from "../marketing/limitReached.js";
import type * as marketing_maintenance from "../marketing/maintenance.js";
import type * as marketing_maintenanceQueries from "../marketing/maintenanceQueries.js";
import type * as marketing_newSubscriber from "../marketing/newSubscriber.js";
import type * as marketing_subscription from "../marketing/subscription.js";
import type * as migration_import from "../migration/import.js";
import type * as migration_reembed from "../migration/reembed.js";
import type * as migration_reembed_helpers from "../migration/reembed_helpers.js";
import type * as processing_detect from "../processing/detect.js";
import type * as processing_embeddings from "../processing/embeddings.js";
import type * as processing_gemini from "../processing/gemini.js";
import type * as processing_handlers from "../processing/handlers.js";
import type * as processing_runs from "../processing/runs.js";
import type * as processing_screenshot from "../processing/screenshot.js";
import type * as processing_steps from "../processing/steps.js";
import type * as processing_storage from "../processing/storage.js";
import type * as processing_types_article from "../processing/types/article.js";
import type * as processing_types_image from "../processing/types/image.js";
import type * as processing_types_page from "../processing/types/page.js";
import type * as processing_types_pdf from "../processing/types/pdf.js";
import type * as processing_types_product from "../processing/types/product.js";
import type * as processing_types_tweet from "../processing/types/tweet.js";
import type * as processing_types_youtube from "../processing/types/youtube.js";
import type * as processing_workflow from "../processing/workflow.js";
import type * as processing_youtube from "../processing/youtube.js";
import type * as search_actions from "../search/actions.js";
import type * as search_helpers from "../search/helpers.js";
import type * as search_queries from "../search/queries.js";
import type * as stripe_actions from "../stripe/actions.js";
import type * as subscriptions_mutations from "../subscriptions/mutations.js";
import type * as subscriptions_queries from "../subscriptions/queries.js";
import type * as tags_actions from "../tags/actions.js";
import type * as tags_mutations from "../tags/mutations.js";
import type * as tags_queries from "../tags/queries.js";
import type * as tools_actions from "../tools/actions.js";
import type * as users_actions from "../users/actions.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as utils_errors from "../utils/errors.js";
import type * as utils_url from "../utils/url.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/actions": typeof admin_actions;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "api/extensions": typeof api_extensions;
  "api/helpers": typeof api_helpers;
  "api/v1": typeof api_v1;
  "apiKeys/actions": typeof apiKeys_actions;
  "apiKeys/helpers": typeof apiKeys_helpers;
  "apiKeys/mutations": typeof apiKeys_mutations;
  "auth/config": typeof auth_config;
  "auth/hooks": typeof auth_hooks;
  "auth/mutations": typeof auth_mutations;
  "auth/queries": typeof auth_queries;
  "billing/limits": typeof billing_limits;
  "billing/plans": typeof billing_plans;
  "bookmarks/dto": typeof bookmarks_dto;
  "bookmarks/mutations": typeof bookmarks_mutations;
  "bookmarks/queries": typeof bookmarks_queries;
  "changelog/mutations": typeof changelog_mutations;
  "changelog/queries": typeof changelog_queries;
  "chat/actions": typeof chat_actions;
  "chat/mutations": typeof chat_mutations;
  "chat/queries": typeof chat_queries;
  "chat/stream": typeof chat_stream;
  "chat/usage": typeof chat_usage;
  crons: typeof crons;
  "email/actions": typeof email_actions;
  "email/mutations": typeof email_mutations;
  "email/queries": typeof email_queries;
  "email/templates": typeof email_templates;
  "files/actions": typeof files_actions;
  functions: typeof functions;
  health: typeof health;
  http: typeof http;
  "marketing/drips": typeof marketing_drips;
  "marketing/dripsQueries": typeof marketing_dripsQueries;
  "marketing/emailTemplates": typeof marketing_emailTemplates;
  "marketing/limitReached": typeof marketing_limitReached;
  "marketing/maintenance": typeof marketing_maintenance;
  "marketing/maintenanceQueries": typeof marketing_maintenanceQueries;
  "marketing/newSubscriber": typeof marketing_newSubscriber;
  "marketing/subscription": typeof marketing_subscription;
  "migration/import": typeof migration_import;
  "migration/reembed": typeof migration_reembed;
  "migration/reembed_helpers": typeof migration_reembed_helpers;
  "processing/detect": typeof processing_detect;
  "processing/embeddings": typeof processing_embeddings;
  "processing/gemini": typeof processing_gemini;
  "processing/handlers": typeof processing_handlers;
  "processing/runs": typeof processing_runs;
  "processing/screenshot": typeof processing_screenshot;
  "processing/steps": typeof processing_steps;
  "processing/storage": typeof processing_storage;
  "processing/types/article": typeof processing_types_article;
  "processing/types/image": typeof processing_types_image;
  "processing/types/page": typeof processing_types_page;
  "processing/types/pdf": typeof processing_types_pdf;
  "processing/types/product": typeof processing_types_product;
  "processing/types/tweet": typeof processing_types_tweet;
  "processing/types/youtube": typeof processing_types_youtube;
  "processing/workflow": typeof processing_workflow;
  "processing/youtube": typeof processing_youtube;
  "search/actions": typeof search_actions;
  "search/helpers": typeof search_helpers;
  "search/queries": typeof search_queries;
  "stripe/actions": typeof stripe_actions;
  "subscriptions/mutations": typeof subscriptions_mutations;
  "subscriptions/queries": typeof subscriptions_queries;
  "tags/actions": typeof tags_actions;
  "tags/mutations": typeof tags_mutations;
  "tags/queries": typeof tags_queries;
  "tools/actions": typeof tools_actions;
  "users/actions": typeof users_actions;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  "utils/errors": typeof utils_errors;
  "utils/url": typeof utils_url;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};
