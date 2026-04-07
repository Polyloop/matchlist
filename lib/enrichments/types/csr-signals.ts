import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "csr_signals",
  label: "CSR Signals",
  description: "Detect CSR budget signals from company reports and websites",
  displayKey: "csr_budget_estimate",
  formatValue: (value) => {
    const str = String(value || "");
    return str || "—";
  },
});
