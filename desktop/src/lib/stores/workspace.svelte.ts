// src/lib/stores/workspace.svelte.ts
import { browser } from "$app/environment";
import { isTauri } from "$lib/utils/platform";

export interface LocalWorkspace {
  id: string;
  path: string;
  name: string;
  description?: string;
  addedAt: string;
}

interface CanopyWorkspaceScan {
  path: string;
  name: string;
  agents: any[];
  projects: any[];
  schedules: any[];
  scanned_at: string;
}

const STORAGE_KEY = "canopy-workspaces";
const ACTIVE_KEY = "canopy-active-workspace";

class WorkspaceStore {
  workspaces = $state<LocalWorkspace[]>([]);
  activeWorkspaceId = $state<string | null>(null);
  isLoading = $state(false);
  error = $state<string | null>(null);
  lastScan = $state<CanopyWorkspaceScan | null>(null);

  get activeWorkspace(): LocalWorkspace | null {
    return (
      this.workspaces.find((w) => w.id === this.activeWorkspaceId) ??
      this.workspaces[0] ??
      null
    );
  }

  /** Hydrate from localStorage */
  fetchWorkspaces(): void {
    if (!browser) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.workspaces = JSON.parse(raw) as LocalWorkspace[];
      const activeId = localStorage.getItem(ACTIVE_KEY);
      if (activeId && this.workspaces.some((w) => w.id === activeId)) {
        this.activeWorkspaceId = activeId;
      } else if (this.workspaces.length > 0) {
        this.activeWorkspaceId = this.workspaces[0].id;
      }
    } catch {
      // Corrupted storage — leave state empty
    }
  }

  /** Persist to localStorage */
  #persist(): void {
    if (!browser) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspaces));
    if (this.activeWorkspaceId) {
      localStorage.setItem(ACTIVE_KEY, this.activeWorkspaceId);
    }
  }

  /** Scan a directory via Tauri IPC — returns null if .canopy/ doesn't exist */
  async scanWorkspace(path: string): Promise<CanopyWorkspaceScan | null> {
    if (!isTauri()) return null;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const canopyPath = path.endsWith(".canopy") ? path : path + "/.canopy";
      const result = await invoke<CanopyWorkspaceScan>("scan_canopy_dir", {
        path: canopyPath,
      });
      this.lastScan = result;
      return result;
    } catch {
      return null;
    }
  }

  /** Add a workspace entry — no-ops on duplicate path */
  addWorkspace(ws: LocalWorkspace): void {
    if (this.workspaces.some((w) => w.path === ws.path)) return;
    this.workspaces = [...this.workspaces, ws];
    this.#persist();
  }

  /** Set active workspace and scan it */
  async setActiveWorkspace(id: string): Promise<void> {
    this.activeWorkspaceId = id;
    this.#persist();

    const ws = this.workspaces.find((w) => w.id === id);
    if (ws) {
      await this.scanAndLoadAgents(ws.path);
    }
  }

  /** Scan workspace and load agents into agents store */
  async scanAndLoadAgents(path: string): Promise<void> {
    const scan = await this.scanWorkspace(path);
    if (!scan || scan.agents.length === 0) return;

    // Dynamic import to avoid circular deps
    const { canopyDefToAgent } = await import("$lib/utils/agents");
    const { agentsStore } = await import("./agents.svelte");

    const agents = scan.agents.map(canopyDefToAgent);
    agentsStore.agents = agents;
  }

  /** Watch active workspace for file changes via Tauri IPC */
  async watchActive(): Promise<void> {
    const ws = this.activeWorkspace;
    if (!ws || !isTauri()) return;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { listen } = await import("@tauri-apps/api/event");

      const canopyPath = ws.path.endsWith(".canopy")
        ? ws.path
        : ws.path + "/.canopy";
      await invoke("watch_canopy_dir", { path: canopyPath });

      listen("canopy-fs-event", async () => {
        const active = this.activeWorkspace;
        if (active) {
          await this.scanAndLoadAgents(active.path);
        }
      });
    } catch (e) {
      console.warn("Failed to start file watcher:", e);
    }
  }

  /** Remove a workspace */
  removeWorkspace(id: string): void {
    this.workspaces = this.workspaces.filter((w) => w.id !== id);
    if (this.activeWorkspaceId === id) {
      this.activeWorkspaceId = this.workspaces[0]?.id ?? null;
    }
    this.#persist();
  }

  /** Create workspace (for API compatibility) */
  async createWorkspace(
    name: string,
    directory?: string,
  ): Promise<LocalWorkspace | null> {
    const ws: LocalWorkspace = {
      id: crypto.randomUUID(),
      path: directory ?? `~/.canopy/${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      addedAt: new Date().toISOString(),
    };
    this.addWorkspace(ws);
    this.activeWorkspaceId = ws.id;
    this.#persist();
    return ws;
  }
}

export const workspaceStore = new WorkspaceStore();
