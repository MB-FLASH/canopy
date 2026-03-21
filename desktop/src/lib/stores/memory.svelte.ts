// src/lib/stores/memory.svelte.ts
import type {
  MemoryEntry,
  MemoryNamespace,
  MemoryCreateRequest,
} from "$api/types";
import { memory as memoryApi } from "$api/client";
import { toastStore } from "./toasts.svelte";

const PAGE_SIZE = 20;

class MemoryStore {
  // ── Raw data ────────────────────────────────────────────────────────────────
  entries = $state<MemoryEntry[]>([]);
  namespaces = $state<MemoryNamespace[]>([]);

  // ── Selection / navigation ──────────────────────────────────────────────────
  selected = $state<MemoryEntry | null>(null);
  activeNamespace = $state<string>("all");

  // ── Search ──────────────────────────────────────────────────────────────────
  searchQuery = $state("");
  isSearching = $state(false);

  // ── Loading / error ─────────────────────────────────────────────────────────
  loading = $state(false);
  error = $state<string | null>(null);

  // ── Pagination ──────────────────────────────────────────────────────────────
  page = $state(1);
  pageSize = $state(PAGE_SIZE);

  // ── Derived ──────────────────────────────────────────────────────────────────
  filteredEntries = $derived.by(() => {
    let result = this.entries;

    if (this.activeNamespace !== "all") {
      result = result.filter((e) => e.namespace === this.activeNamespace);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.key.toLowerCase().includes(q) ||
          e.value.toLowerCase().includes(q) ||
          e.namespace.toLowerCase().includes(q) ||
          (e.metadata?.agent ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  });

  totalCount = $derived(this.filteredEntries.length);

  paginatedEntries = $derived.by(() => {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  });

  totalPages = $derived(
    Math.max(1, Math.ceil(this.totalCount / this.pageSize)),
  );

  hasNextPage = $derived(this.page < this.totalPages);
  hasPrevPage = $derived(this.page > 1);

  namespaceSummary = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const e of this.entries) {
      counts.set(e.namespace, (counts.get(e.namespace) ?? 0) + 1);
    }
    return counts;
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  async fetch(): Promise<void> {
    this.loading = true;
    try {
      const [entries, namespaces] = await Promise.all([
        memoryApi.list(),
        memoryApi.namespaces(),
      ]);
      this.entries = entries;
      this.namespaces = namespaces;
      this.error = null;
      if (this.selected) {
        const refreshed = entries.find((e) => e.id === this.selected!.id);
        this.selected = refreshed ?? null;
      }
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to load memory", msg);
    } finally {
      this.loading = false;
    }
  }

  async search(q: string): Promise<void> {
    this.searchQuery = q;
    this.page = 1;

    if (!q.trim()) {
      this.isSearching = false;
      // Reload full list when query is cleared
      await this.fetch();
      return;
    }

    this.isSearching = true;
    try {
      const results = await memoryApi.search(q);
      this.entries = results;
      this.error = null;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Search failed", msg);
    } finally {
      this.isSearching = false;
    }
  }

  async getByNamespace(ns: string): Promise<void> {
    this.activeNamespace = ns;
    this.page = 1;
    this.loading = true;
    try {
      const entries = await memoryApi.list(ns === "all" ? undefined : ns);
      this.entries = entries;
      this.error = null;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to load namespace", msg);
    } finally {
      this.loading = false;
    }
  }

  async create(entryData: MemoryCreateRequest): Promise<MemoryEntry | null> {
    this.loading = true;
    try {
      const created = await memoryApi.create(entryData);
      this.entries = [created, ...this.entries];
      const ns = this.namespaces.find((n) => n.name === created.namespace);
      if (ns) {
        this.namespaces = this.namespaces.map((n) =>
          n.name === created.namespace ? { ...n, count: n.count + 1 } : n,
        );
      } else {
        this.namespaces = [
          ...this.namespaces,
          { name: created.namespace, count: 1 },
        ];
      }
      this.error = null;
      toastStore.success(
        "Entry created",
        `"${created.key}" saved to ${created.namespace}`,
      );
      return created;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to create entry", msg);
      return null;
    } finally {
      this.loading = false;
    }
  }

  async update(
    id: string,
    patch: Partial<MemoryCreateRequest>,
  ): Promise<MemoryEntry | null> {
    const previous = this.entries;
    const prevSelected = this.selected;
    // Optimistic
    this.entries = this.entries.map((e) =>
      e.id === id
        ? {
            ...e,
            ...(patch.key !== undefined ? { key: patch.key } : {}),
            ...(patch.value !== undefined ? { value: patch.value } : {}),
            ...(patch.value_type !== undefined
              ? { value_type: patch.value_type }
              : {}),
            metadata: { ...e.metadata, updated_at: new Date().toISOString() },
          }
        : e,
    );
    if (this.selected?.id === id) {
      const updated = this.entries.find((e) => e.id === id);
      if (updated) this.selected = updated;
    }

    try {
      const updated = await memoryApi.update(id, patch);
      this.entries = this.entries.map((e) => (e.id === id ? updated : e));
      if (this.selected?.id === id) this.selected = updated;
      this.error = null;
      toastStore.success("Entry updated");
      return updated;
    } catch (e) {
      this.entries = previous;
      this.selected = prevSelected;
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to update entry", msg);
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    const previous = this.entries;
    const prevSelected = this.selected;
    const entry = this.entries.find((e) => e.id === id);

    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.selected?.id === id) this.selected = null;
    if (entry) {
      this.namespaces = this.namespaces.map((n) =>
        n.name === entry.namespace
          ? { ...n, count: Math.max(0, n.count - 1) }
          : n,
      );
    }

    try {
      await memoryApi.delete(id);
      this.error = null;
      toastStore.success("Entry deleted");
    } catch (e) {
      this.entries = previous;
      this.selected = prevSelected;
      if (entry) {
        this.namespaces = this.namespaces.map((n) =>
          n.name === entry.namespace ? { ...n, count: n.count + 1 } : n,
        );
      }
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to delete entry", msg);
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  selectEntry(entry: MemoryEntry | null): void {
    this.selected = entry;
  }

  setActiveNamespace(ns: string): void {
    this.activeNamespace = ns;
    this.page = 1;
    this.selected = null;
    if (this.searchQuery) this.searchQuery = "";
  }

  setSearch(q: string): void {
    this.searchQuery = q;
    this.page = 1;
  }

  nextPage(): void {
    if (this.hasNextPage) this.page++;
  }

  prevPage(): void {
    if (this.hasPrevPage) this.page--;
  }

  reset(): void {
    this.entries = [];
    this.namespaces = [];
    this.selected = null;
    this.activeNamespace = "all";
    this.searchQuery = "";
    this.page = 1;
    this.error = null;
  }

  // Legacy compat (filterAgentId / fetchEntries used by older code)
  filterAgentId = $state<string | null>(null);

  async fetchEntries(agentId?: string): Promise<void> {
    this.filterAgentId = agentId ?? null;
    await this.fetch();
  }

  setAgentFilter(agentId: string | null): void {
    this.filterAgentId = agentId;
  }
}

export const memoryStore = new MemoryStore();
