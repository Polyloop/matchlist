import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "ai_message",
  label: "AI Message",
  description: "Generate a personalised outreach message using Claude",
  displayKey: "message_preview",
  formatValue: (value) => {
    const str = String(value || "");
    return str.length > 60 ? str.slice(0, 60) + "..." : str;
  },
});
