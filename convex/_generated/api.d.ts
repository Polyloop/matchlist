/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity_mutations from "../activity/mutations.js";
import type * as activity_queries from "../activity/queries.js";
import type * as agent_actions from "../agent/actions.js";
import type * as agent_queries from "../agent/queries.js";
import type * as agent_triggers from "../agent/triggers.js";
import type * as analytics_queries from "../analytics/queries.js";
import type * as analytics_signals from "../analytics/signals.js";
import type * as campaigns_internalMutations from "../campaigns/internalMutations.js";
import type * as campaigns_mutations from "../campaigns/mutations.js";
import type * as campaigns_queries from "../campaigns/queries.js";
import type * as crm_mutations from "../crm/mutations.js";
import type * as crm_queries from "../crm/queries.js";
import type * as crm_salesforce from "../crm/salesforce.js";
import type * as enrichments_mutations from "../enrichments/mutations.js";
import type * as exports_queries from "../exports/queries.js";
import type * as http from "../http.js";
import type * as importBatches_queries from "../importBatches/queries.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lists_mutations from "../lists/mutations.js";
import type * as lists_queries from "../lists/queries.js";
import type * as onboarding_mutations from "../onboarding/mutations.js";
import type * as onboarding_queries from "../onboarding/queries.js";
import type * as outreach_mutations from "../outreach/mutations.js";
import type * as outreach_queries from "../outreach/queries.js";
import type * as pipeline_actions from "../pipeline/actions.js";
import type * as pipeline_ai_templates from "../pipeline/ai/templates.js";
import type * as pipeline_engine from "../pipeline/engine.js";
import type * as pipeline_helpers from "../pipeline/helpers.js";
import type * as pipeline_intentClassifier from "../pipeline/intentClassifier.js";
import type * as pipeline_intentRouter from "../pipeline/intentRouter.js";
import type * as pipeline_replyGenerator from "../pipeline/replyGenerator.js";
import type * as pipeline_runner from "../pipeline/runner.js";
import type * as pipeline_scheduler from "../pipeline/scheduler.js";
import type * as pipeline_sender from "../pipeline/sender.js";
import type * as prospects_duplicates from "../prospects/duplicates.js";
import type * as prospects_intelligence from "../prospects/intelligence.js";
import type * as prospects_intelligenceQueries from "../prospects/intelligenceQueries.js";
import type * as prospects_mutations from "../prospects/mutations.js";
import type * as prospects_queries from "../prospects/queries.js";
import type * as seed from "../seed.js";
import type * as settings_mutations from "../settings/mutations.js";
import type * as settings_queries from "../settings/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "activity/mutations": typeof activity_mutations;
  "activity/queries": typeof activity_queries;
  "agent/actions": typeof agent_actions;
  "agent/queries": typeof agent_queries;
  "agent/triggers": typeof agent_triggers;
  "analytics/queries": typeof analytics_queries;
  "analytics/signals": typeof analytics_signals;
  "campaigns/internalMutations": typeof campaigns_internalMutations;
  "campaigns/mutations": typeof campaigns_mutations;
  "campaigns/queries": typeof campaigns_queries;
  "crm/mutations": typeof crm_mutations;
  "crm/queries": typeof crm_queries;
  "crm/salesforce": typeof crm_salesforce;
  "enrichments/mutations": typeof enrichments_mutations;
  "exports/queries": typeof exports_queries;
  http: typeof http;
  "importBatches/queries": typeof importBatches_queries;
  "lib/auth": typeof lib_auth;
  "lists/mutations": typeof lists_mutations;
  "lists/queries": typeof lists_queries;
  "onboarding/mutations": typeof onboarding_mutations;
  "onboarding/queries": typeof onboarding_queries;
  "outreach/mutations": typeof outreach_mutations;
  "outreach/queries": typeof outreach_queries;
  "pipeline/actions": typeof pipeline_actions;
  "pipeline/ai/templates": typeof pipeline_ai_templates;
  "pipeline/engine": typeof pipeline_engine;
  "pipeline/helpers": typeof pipeline_helpers;
  "pipeline/intentClassifier": typeof pipeline_intentClassifier;
  "pipeline/intentRouter": typeof pipeline_intentRouter;
  "pipeline/replyGenerator": typeof pipeline_replyGenerator;
  "pipeline/runner": typeof pipeline_runner;
  "pipeline/scheduler": typeof pipeline_scheduler;
  "pipeline/sender": typeof pipeline_sender;
  "prospects/duplicates": typeof prospects_duplicates;
  "prospects/intelligence": typeof prospects_intelligence;
  "prospects/intelligenceQueries": typeof prospects_intelligenceQueries;
  "prospects/mutations": typeof prospects_mutations;
  "prospects/queries": typeof prospects_queries;
  seed: typeof seed;
  "settings/mutations": typeof settings_mutations;
  "settings/queries": typeof settings_queries;
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

export declare const components: {};
