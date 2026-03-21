<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import LogFilters from '$lib/components/logs/LogFilters.svelte';
  import LogViewer from '$lib/components/logs/LogViewer.svelte';
  import { logsStore } from '$lib/stores/logs.svelte';

  const LEVEL_COLORS: Record<string, string> = {
    debug: '#9ca3af',
    info:  '#93c5fd',
    warn:  '#fde047',
    error: '#fca5a5',
    fatal: '#ff6b6b',
  };

  onMount(() => {
    void logsStore.fetch({ limit: 200 });
    logsStore.startStreaming();
  });

  onDestroy(() => {
    logsStore.stopStreaming();
  });
</script>

<PageShell title="Logs" badge={logsStore.stats.total || undefined}>
  {#snippet actions()}
    <!-- Level summary pills in header -->
    <div class="lp-summary" role="status" aria-label="Log level summary">
      {#each Object.entries(logsStore.stats) as [level, count]}
        {#if level !== 'total' && level !== 'warning' && count > 0}
          <span
            class="lp-stat"
            style:color={LEVEL_COLORS[level] ?? 'var(--text-tertiary)'}
            title="{count} {level} entries"
            aria-label="{count} {level} log entries"
          >
            <span class="lp-stat-dot" style:background={LEVEL_COLORS[level] ?? 'currentColor'} aria-hidden="true"></span>
            {count.toLocaleString()}
          </span>
        {/if}
      {/each}
    </div>

    <button
      class="lp-clear-btn"
      onclick={() => logsStore.clear()}
      aria-label="Clear log buffer"
      title="Clear log buffer"
    >
      Clear
    </button>
  {/snippet}

  <div class="lp-body">
    <LogFilters />
    <LogViewer />
  </div>
</PageShell>

<style>
  /* Override PageShell's content padding — log viewer needs full bleed */
  :global(.ps-content) {
    padding: 0 !important;
    overflow: hidden !important;
  }

  .lp-body {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  /* ── Header summary pills ─────────────────────────────────────────── */
  .lp-summary {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .lp-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .lp-stat-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── Clear button ─────────────────────────────────────────────────── */
  .lp-clear-btn {
    height: 26px;
    padding: 0 10px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-default);
    background: transparent;
    color: var(--text-tertiary);
    font-size: 12px;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: all 100ms ease;
    flex-shrink: 0;
  }

  .lp-clear-btn:hover {
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.08);
  }
</style>
