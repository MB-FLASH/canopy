// src/lib/stores/gateways.svelte.ts
import type { Gateway } from "$api/types";
import { gateways as gatewaysApi } from "$api/client";
import { toastStore } from "./toasts.svelte";

class GatewaysStore {
  gateways = $state<Gateway[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);

  totalCount = $derived(this.gateways.length);
  healthyCount = $derived(
    this.gateways.filter((g) => g.status === "healthy").length,
  );
  primaryGateway = $derived(this.gateways.find((g) => g.is_primary) ?? null);

  async fetchGateways(): Promise<void> {
    this.loading = true;
    try {
      this.gateways = await gatewaysApi.list();
      this.error = null;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to load gateways", msg);
    } finally {
      this.loading = false;
    }
  }

  async createGateway(data: Partial<Gateway>): Promise<Gateway | null> {
    this.loading = true;
    try {
      // The gateways API only has list() right now — extend when backend supports it.
      // For now, re-fetch after creation attempt to keep the list fresh.
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://127.0.0.1:9089"}/api/v1/gateways`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const created = (await response.json()) as Gateway;
      this.gateways = [created, ...this.gateways];
      this.error = null;
      toastStore.success("Gateway created", data.name ?? "");
      return created;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to create gateway", msg);
      return null;
    } finally {
      this.loading = false;
    }
  }

  async deleteGateway(id: string): Promise<void> {
    const previous = this.gateways;
    this.gateways = this.gateways.filter((g) => g.id !== id);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://127.0.0.1:9089"}/api/v1/gateways/${id}`,
        { method: "DELETE", headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.error = null;
      toastStore.success("Gateway deleted");
    } catch (e) {
      this.gateways = previous;
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to delete gateway", msg);
    }
  }

  async probeGateway(id: string): Promise<Gateway | null> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://127.0.0.1:9089"}/api/v1/gateways/${id}/probe`,
        { method: "POST", headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const probed = (await response.json()) as Gateway;
      this.gateways = this.gateways.map((g) => (g.id === id ? probed : g));
      this.error = null;
      toastStore.success(
        "Gateway probed",
        `Latency: ${probed.latency_ms ?? "—"}ms`,
      );
      return probed;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Probe failed", msg);
      return null;
    }
  }

  getById(id: string): Gateway | null {
    return this.gateways.find((g) => g.id === id) ?? null;
  }
}

export const gatewaysStore = new GatewaysStore();
