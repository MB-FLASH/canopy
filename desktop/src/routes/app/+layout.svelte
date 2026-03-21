<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import ConnectionStatusBar from '$lib/components/layout/ConnectionStatusBar.svelte';
  import ToastContainer from '$lib/components/layout/ToastContainer.svelte';
  import { connectionStore } from '$lib/stores/connection.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { paletteStore } from '$lib/stores/palette.svelte';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import { agentsStore } from '$lib/stores/agents.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import CommandPalette from '$lib/components/layout/CommandPalette.svelte';
  import ActivityWidget from '$lib/components/activity/ActivityWidget.svelte';
  import { activityStore } from '$lib/stores/activity.svelte';

  let { children } = $props();

  // ─── Onboarding guard ────────────────────────────────────────────────────
  onMount(() => {
    const raw = localStorage.getItem('canopy-onboarding');
    const completed = raw ? (JSON.parse(raw) as { completed?: boolean }).completed : false;
    if (!completed) {
      // Fall back to legacy key
      const legacy = localStorage.getItem('canopy-onboarding-complete');
      if (legacy !== 'true') {
        goto('/onboarding');
        return;
      }
    }
    const savedName = localStorage.getItem('canopy-display-name');
    if (savedName) {
      // Available for use by child components if needed
      void savedName;
    }
  });

  // Initialize theme
  $effect(() => { void themeStore.resolved; });

  // Sidebar collapsed state — persisted to localStorage
  let sidebarCollapsed = $state(false);
  $effect(() => {
    if (!browser) return;
    const stored = localStorage.getItem('canopy-sidebar-collapsed');
    if (stored !== null) sidebarCollapsed = stored === 'true';
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    if (browser) localStorage.setItem('canopy-sidebar-collapsed', String(sidebarCollapsed));
  }

  // Nav routes for ⌘1–⌘3 (Core section)
  const NAV_ROUTES = ['/app', '/app/inbox', '/app/office'];

  onMount(() => {
    // Load workspaces from localStorage, then scan active + start watcher
    workspaceStore.fetchWorkspaces();

    // If we have an active workspace, scan it for agents; otherwise fall back to API
    const ws = workspaceStore.activeWorkspace;
    if (ws) {
      workspaceStore.scanAndLoadAgents(ws.path).then(() => {
        workspaceStore.watchActive();
      });
    } else {
      void agentsStore.fetchAgents();
    }

    // Load adapter choice and miosaCloud setting from Tauri secure store
    // (written during onboarding; no-op in browser dev mode)
    void settingsStore.loadFromTauriStore();

    const stopPolling = connectionStore.startPolling(30_000);
    activityStore.subscribe();
    paletteStore.registerBuiltins(goto, {});
    return () => {
      stopPolling();
      activityStore.unsubscribe();
    };
  });

  // Keyboard shortcuts
  onMount(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); paletteStore.toggle(); return; }
      if (!meta) return;
      if (e.key === '\\') { e.preventDefault(); toggleSidebar(); return; }
      if (e.key === ',') { e.preventDefault(); goto('/app/settings'); return; }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); goto('/app/terminal'); return; }
      const idx = ['1', '2', '3'].indexOf(e.key);
      if (idx !== -1) { e.preventDefault(); goto(NAV_ROUTES[idx]); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Wire user display name from onboarding
  let userName = $state<string | null>(null);
  $effect(() => {
    if (!browser) return;
    const name = localStorage.getItem('canopy-display-name');
    if (name) userName = name;
  });
  const user = $derived(userName ? { name: userName, email: '' } : null);
</script>

<!-- App shell with sidebar + main content -->
<div class="app-shell">
  <Sidebar bind:isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} {user} />
  <main class="main-content" id="main-content">
    {@render children()}
    <ConnectionStatusBar />
  </main>
</div>

<!-- Global overlays -->
<CommandPalette />
<ToastContainer />
<ActivityWidget />

<style>
  .app-shell {
    height: 100dvh; width: 100vw; display: flex; overflow: hidden;
    background: var(--bg-primary); position: relative;
    background-image: radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.015) 0%, transparent 60%);
  }
  .main-content {
    flex: 1; height: 100%; display: flex; flex-direction: column;
    min-width: 0; overflow: hidden; background: var(--bg-secondary);
    box-shadow: inset 1px 0 0 rgba(255,255,255,0.04); position: relative;
  }
</style>
