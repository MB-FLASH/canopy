// src/lib/stores/integrations.svelte.ts
import type { Integration } from "$api/types";
import { integrations as integrationsApi } from "$api/client";
import { toastStore } from "./toasts.svelte";

class IntegrationsStore {
  integrations = $state<Integration[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);

  totalCount = $derived(this.integrations.length);
  connectedCount = $derived(
    this.integrations.filter((i) => i.status === "connected").length,
  );

  async fetchIntegrations(): Promise<void> {
    this.loading = true;
    try {
      this.integrations = await integrationsApi.list();
      this.error = null;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to load integrations", msg);
    } finally {
      this.loading = false;
    }
  }
}

export const integrationsStore = new IntegrationsStore();
