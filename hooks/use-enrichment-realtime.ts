"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { EnrichmentResult } from "@/lib/supabase/types";

export function useEnrichmentRealtime(
  campaignId: string | null,
  onUpdate: (result: EnrichmentResult) => void,
) {
  useEffect(() => {
    if (!campaignId) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`enrichment-results-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrichment_results",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
            onUpdate(payload.new as EnrichmentResult);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, onUpdate]);
}
