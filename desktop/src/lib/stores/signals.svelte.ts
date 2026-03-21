// src/lib/stores/signals.svelte.ts
import type { Signal } from "$api/types";
import { signals as signalsApi } from "$api/client";
import { toastStore } from "./toasts.svelte";

class SignalsStore {
  signals = $state<Signal[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);
  searchQuery = $state("");
  filterChannel = $state<string | "all">("all");
  filterMode = $state<string | "all">("all");

  // Derived
  filteredSignals = $derived.by(() => {
    let result = this.signals;
    if (this.filterChannel !== "all") {
      result = result.filter((s) => s.channel === this.filterChannel);
    }
    if (this.filterMode !== "all") {
      result = result.filter((s) => s.mode === this.filterMode);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.channel.toLowerCase().includes(q) ||
          s.agent_name.toLowerCase().includes(q) ||
          s.input_preview.toLowerCase().includes(q),
      );
    }
    return result;
  });

  totalCount = $derived(this.signals.length);

  async fetchSignals(limit = 100): Promise<void> {
    this.loading = true;
    try {
      this.signals = await signalsApi.list(limit);
      this.error = null;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to load signals", msg);
    } finally {
      this.loading = false;
    }
  }

  setSearch(q: string): void {
    this.searchQuery = q;
  }

  setChannelFilter(channel: string | "all"): void {
    this.filterChannel = channel;
  }

  setModeFilter(mode: string | "all"): void {
    this.filterMode = mode;
  }
}

export const signalsStore = new SignalsStore();
