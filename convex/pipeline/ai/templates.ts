interface PromptContext {
  campaignType: string;
  orgName: string;
  prospectName: string;
  prospectEmail: string;
  enrichmentData: Record<string, unknown>;
  sequenceStep: number;
  previousMessages?: string[];
  senderName: string;
  senderTitle: string;
  senderSignature: string;
  // Relationship context
  outreachIntent?: string;
  membershipStatus?: string;
  lastEngagement?: string;
  engagementTypes?: string[];
  donationHistory?: string;
  notes?: string;
  role?: string;
  memberSince?: string;
}

interface PromptPair {
  system: string;
  user: string;
}

export function getMessagePrompt(ctx: PromptContext): PromptPair {
  const templates: Record<string, (ctx: PromptContext) => PromptPair> = {
    donation_matching: donationMatchingPrompt,
    grant_research: grantLoiPrompt,
    corporate_sponsorship: sponsorshipProposalPrompt,
    volunteer_matching: volunteerPitchPrompt,
    in_kind_donation: donationRequestPrompt,
  };

  const template = templates[ctx.campaignType] || genericPrompt;
  return template(ctx);
}

function formatEnrichmentData(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([key, value]) => `- ${key.replace(/_/g, " ")}: ${JSON.stringify(value)}`)
    .join("\n");
}

function formatRelationshipContext(ctx: PromptContext): string {
  const lines: string[] = [];
  if (ctx.membershipStatus) lines.push(`Membership: ${ctx.membershipStatus}${ctx.memberSince ? ` since ${ctx.memberSince}` : ""}`);
  if (ctx.role) lines.push(`Role: ${ctx.role}`);
  if (ctx.lastEngagement) lines.push(`Last engagement: ${ctx.lastEngagement}`);
  if (ctx.engagementTypes?.length) lines.push(`History: ${ctx.engagementTypes.join(", ")}`);
  if (ctx.donationHistory) lines.push(`Donations: ${ctx.donationHistory}`);
  if (ctx.notes) lines.push(`Notes: ${ctx.notes}`);
  if (lines.length === 0) return "";
  return `\n\nRelationship context:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

function intentInstructions(intent?: string): string {
  switch (intent) {
    case "reconnect":
      return "\n\nOUTREACH INTENT: RECONNECT — This is a warm reconnection. Do NOT ask for money. Reference past involvement. Express genuine interest in how they're doing. Share what the org has been up to. The goal is to re-establish the relationship.";
    case "invite":
      return "\n\nOUTREACH INTENT: INVITE — Invite them to a specific event, programme, or opportunity. Reference their past involvement as context for why they'd enjoy it. Keep it light and low-pressure.";
    case "share":
      return "\n\nOUTREACH INTENT: SHARE — Share news, a peer update, or sector insight. Create value without asking for anything. Position this as keeping them in the loop because they matter to the community.";
    case "renew":
      return "\n\nOUTREACH INTENT: RENEW — Their membership has lapsed. Acknowledge the lapse warmly, remind them what they valued, share what's new, and invite them back. Don't guilt-trip.";
    case "ask":
    default:
      return "";
  }
}

function followUpContext(ctx: PromptContext): string {
  if (ctx.sequenceStep === 0) return "";
  return `\n\nThis is follow-up #${ctx.sequenceStep}. No response to previous message(s).
- Don't repeat the same pitch
- Add new value: a stat, a deadline, or a question
- Shorter than the initial email
- Make it easy to reply with a yes/no`;
}

const GLOBAL_RULES = `
STRICT RULES:
- First line MUST be "Subject: [subject line]" then a blank line then the body
- Max 80 words in the body (not counting signature)
- NO "I hope this finds you well" or any filler opener
- Open with the value proposition or a specific reference
- Reference the prospect's employer by name
- One clear call to action — a question, not a demand
- End with the sender's signature exactly as provided
- Be direct, warm, specific. Sound human, not templated.
`;

// --- Campaign-specific templates ---

function donationMatchingPrompt(ctx: PromptContext): PromptPair {
  return {
    system: `You write concise outreach emails for ${ctx.orgName} about employer matching gift programmes. You are ${ctx.senderName}, ${ctx.senderTitle}.
${GLOBAL_RULES}
${intentInstructions(ctx.outreachIntent)}
Signature to use:
${ctx.senderSignature}`,

    user: `Write an email to ${ctx.prospectName} (${ctx.prospectEmail}).

Enrichment data:
${formatEnrichmentData(ctx.enrichmentData)}
${formatRelationshipContext(ctx)}

Goal: ${ctx.outreachIntent === "reconnect" ? "Reconnect warmly — reference past involvement, don't ask for money" : ctx.outreachIntent === "renew" ? "Invite them to renew their membership" : "Inform them their employer may match charitable donations and offer to help"}${followUpContext(ctx)}`,
  };
}

function grantLoiPrompt(ctx: PromptContext): PromptPair {
  return {
    system: `You write concise letters of inquiry for ${ctx.orgName}. You are ${ctx.senderName}, ${ctx.senderTitle}.
${GLOBAL_RULES}
- For grant LOIs, you may use up to 200 words (exception to 80-word rule)
- Follow LOI structure: who we are, what we need, why this foundation, ask for next steps

Signature to use:
${ctx.senderSignature}`,

    user: `Write a letter of inquiry to ${ctx.prospectName} (${ctx.prospectEmail}).

Data:
${formatEnrichmentData(ctx.enrichmentData)}

Goal: Introduce ${ctx.orgName} and express interest in their grant programme.${followUpContext(ctx)}`,
  };
}

function sponsorshipProposalPrompt(ctx: PromptContext): PromptPair {
  return {
    system: `You write concise sponsorship outreach for ${ctx.orgName}. You are ${ctx.senderName}, ${ctx.senderTitle}.
${GLOBAL_RULES}
- Lead with what the company gets (visibility, impact, engagement)
- Reference their CSR activity if available

Signature to use:
${ctx.senderSignature}`,

    user: `Write a sponsorship outreach email to ${ctx.prospectName} (${ctx.prospectEmail}).

Data:
${formatEnrichmentData(ctx.enrichmentData)}

Goal: Propose a corporate sponsorship partnership.${followUpContext(ctx)}`,
  };
}

function volunteerPitchPrompt(ctx: PromptContext): PromptPair {
  return {
    system: `You write concise volunteer partnership emails for ${ctx.orgName}. You are ${ctx.senderName}, ${ctx.senderTitle}.
${GLOBAL_RULES}
- Reference their volunteer programme if detected
- Propose a specific opportunity (build day, skills session)

Signature to use:
${ctx.senderSignature}`,

    user: `Write a volunteer partnership email to ${ctx.prospectName} (${ctx.prospectEmail}).

Data:
${formatEnrichmentData(ctx.enrichmentData)}

Goal: Propose a volunteer partnership.${followUpContext(ctx)}`,
  };
}

function donationRequestPrompt(ctx: PromptContext): PromptPair {
  return {
    system: `You write concise in-kind donation requests for ${ctx.orgName}. You are ${ctx.senderName}, ${ctx.senderTitle}.
${GLOBAL_RULES}
- Be specific about what you need
- Reference the company's products or services

Signature to use:
${ctx.senderSignature}`,

    user: `Write an in-kind donation request to ${ctx.prospectName} (${ctx.prospectEmail}).

Data:
${formatEnrichmentData(ctx.enrichmentData)}

Goal: Request a donation of products or services.${followUpContext(ctx)}`,
  };
}

function genericPrompt(ctx: PromptContext): PromptPair {
  return {
    system: `You write concise outreach emails for ${ctx.orgName}. You are ${ctx.senderName}, ${ctx.senderTitle}.
${GLOBAL_RULES}
Signature to use:
${ctx.senderSignature}`,

    user: `Write an outreach email to ${ctx.prospectName} (${ctx.prospectEmail}).

Data:
${formatEnrichmentData(ctx.enrichmentData)}${followUpContext(ctx)}`,
  };
}
