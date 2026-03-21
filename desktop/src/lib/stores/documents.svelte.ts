// src/lib/stores/documents.svelte.ts
// Documents store — fetches from /api/v1/documents when available,
// falls back to empty state gracefully (endpoint is optional on the backend).

import type { Document, DocumentTreeNode } from "$api/types";

const BASE_URL =
  typeof window !== "undefined"
    ? (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:9089")
    : "";

class DocumentsStore {
  documents = $state<Document[]>([]);
  tree = $state<DocumentTreeNode[]>([]);
  selected = $state<Document | null>(null);
  loading = $state(false);
  error = $state<string | null>(null);

  async fetchDocuments(): Promise<void> {
    this.loading = true;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/documents`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          documents?: Document[];
          tree?: DocumentTreeNode[];
        };
        this.documents = data.documents ?? [];
        this.tree = data.tree ?? [];
      } else {
        // Non-fatal: endpoint not yet available on the backend
        this.documents = [];
        this.tree = [];
      }
      this.error = null;
    } catch {
      // Network unavailable — stay empty silently
      this.documents = [];
      this.tree = [];
      this.error = null;
    } finally {
      this.loading = false;
    }
  }

  selectDocument(doc: Document | null): void {
    this.selected = doc;
  }

  getByPath(path: string): Document | null {
    return this.documents.find((d) => d.path === path) ?? null;
  }
}

export const documentsStore = new DocumentsStore();
