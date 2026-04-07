import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "coordinator_lookup",
  label: "Coordinator",
  description: "Find volunteer programme coordinators",
  displayKey: "coordinator_name",
});
