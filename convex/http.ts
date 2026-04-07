import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Cronlet callback endpoint.
 * Cronlet POSTs here when a scheduled send task completes.
 */
http.route({
  path: "/cronlet/callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const event = request.headers.get("x-cronlet-event") || body.event;

      // Extract task and run info
      const taskId = body.task?.id;
      const runId = body.run?.id;
      const status = body.run?.status;
      const metadata = body.task?.metadata;

      if (!taskId || !metadata) {
        return new Response(JSON.stringify({ error: "Missing task data" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Process based on event type
      if (event === "run.completed" || status === "completed") {
        const action = metadata.action;

        if (action === "send_email") {
          // Cronlet triggered a send — execute the actual email delivery
          await ctx.runAction(internal.pipeline.sender.sendEmail, {
            messageId: metadata.messageId,
            orgId: metadata.orgId,
            campaignId: metadata.campaignId,
            prospectId: metadata.prospectId,
          });
        }

        if (action === "follow_up") {
          // Cronlet triggered a follow-up check
          await ctx.runAction(internal.pipeline.runner.generateMessage, {
            campaignId: metadata.campaignId,
            orgId: metadata.orgId,
            prospectId: metadata.prospectId,
          });
        }
      }

      if (event === "run.failed" || status === "failed") {
        // Log the failure
        if (metadata.orgId && metadata.campaignId) {
          await ctx.runMutation(internal.activity.mutations.log, {
            orgId: metadata.orgId,
            campaignId: metadata.campaignId,
            prospectId: metadata.prospectId,
            type: "send_failed",
            message: `Scheduled task failed: ${body.run?.errorMessage || "Unknown error"}`,
            metadata: { taskId, runId },
          });
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

/**
 * Resend webhook endpoint.
 * Handles email delivery events (delivered, opened, bounced, complained).
 * Configure in Resend dashboard: https://acoustic-seal-577.convex.site/resend/webhook
 */
http.route({
  path: "/resend/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const eventType = body.type;
      const data = body.data;

      if (!eventType || !data) {
        return new Response("Missing event data", { status: 400 });
      }

      // Find the outreach message by the email recipient
      // Resend includes the "to" address in webhook payloads
      const toEmail = data.to?.[0];
      if (!toEmail) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      switch (eventType) {
        case "email.delivered":
          await ctx.runMutation(internal.pipeline.helpers.logEmailEvent, {
            email: toEmail,
            event: "delivered",
          });
          break;

        case "email.opened":
          await ctx.runMutation(internal.pipeline.helpers.logEmailEvent, {
            email: toEmail,
            event: "opened",
          });
          break;

        case "email.bounced":
          await ctx.runMutation(internal.pipeline.helpers.logEmailEvent, {
            email: toEmail,
            event: "bounced",
          });
          break;

        case "email.complained":
          await ctx.runMutation(internal.pipeline.helpers.logEmailEvent, {
            email: toEmail,
            event: "complained",
          });
          break;
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response("OK", { status: 200 });
    }
  }),
});

export default http;
