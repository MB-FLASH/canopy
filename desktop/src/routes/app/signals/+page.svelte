<!-- src/routes/app/signals/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import { signalsStore } from '$lib/stores/signals.svelte';

  onMount(() => {
    void signalsStore.fetchSignals(100);
  });
</script>

<PageShell title="Signals" badge={signalsStore.totalCount > 0 ? signalsStore.totalCount : undefined}>
  {#snippet actions()}
    <input
      class="sig-search"
      type="search"
      placeholder="Search signals…"
      value={signalsStore.searchQuery}
      oninput={(e) => signalsStore.setSearch((e.target as HTMLInputElement).value)}
      aria-label="Search signals"
    />
  {/snippet}

  {#if signalsStore.loading && signalsStore.signals.length === 0}
    <div class="sig-loading" role="status" aria-live="polite">
      <div class="sig-spinner" aria-hidden="true"></div>
      <span>Loading signals…</span>
    </div>
  {:else if signalsStore.error && signalsStore.signals.length === 0}
    <div class="sig-error" role="alert">
      <p>Failed to load signals: {signalsStore.error}</p>
      <button onclick={() => void signalsStore.fetchSignals(100)}>Retry</button>
    </div>
  {:else if signalsStore.filteredSignals.length === 0}
    <div class="sig-empty" role="status">
      <p>{signalsStore.searchQuery ? 'No signals match your search.' : 'No signals recorded yet.'}</p>
    </div>
  {:else}
    <div class="sig-list" role="list" aria-label="Signal events">
      {#each signalsStore.filteredSignals as signal (signal.id)}
        <div class="sig-row" role="listitem">
          <div class="sig-meta">
            <span class="sig-channel">{signal.channel}</span>
            <span class="sig-mode">{signal.mode}</span>
            <span class="sig-tier sig-tier--{signal.tier}">{signal.tier}</span>
          </div>
          <div class="sig-preview">{signal.input_preview}</div>
          <div class="sig-footer">
            <span class="sig-agent">{signal.agent_name}</span>
            <span class="sig-weight">weight: {signal.weight.toFixed(2)}</span>
            {#if signal.failure_mode}
              <span class="sig-fail">{signal.failure_mode}</span>
            {/if}
            <span class="sig-time">{new Date(signal.created_at).toLocaleString()}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</PageShell>

<style>
  .sig-search {
    height: 28px; padding: 0 10px; border-radius: 6px; font-size: 12px;
    background: var(--dbg2); border: 1px solid var(--dbd); color: var(--dt); min-width: 200px;
  }
  .sig-search:focus { outline: none; border-color: #6366f1; }
  .sig-loading, .sig-empty, .sig-error {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; height: 200px;
    color: var(--dt3); font-size: 13px;
  }
  .sig-spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--dbd); border-top-color: var(--dt2);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .sig-list { display: flex; flex-direction: column; gap: 8px; padding: 24px; }
  .sig-row {
    padding: 12px 16px; border-radius: 8px;
    background: var(--dbg2); border: 1px solid var(--dbd);
  }
  .sig-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .sig-channel { font-size: 12px; font-weight: 500; color: var(--dt2); }
  .sig-mode { font-size: 11px; color: var(--dt3); }
  .sig-tier {
    font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .sig-tier--high { background: color-mix(in srgb, #ef4444 15%, transparent); color: #fca5a5; }
  .sig-tier--medium { background: color-mix(in srgb, #f59e0b 15%, transparent); color: #fde047; }
  .sig-tier--low { background: var(--dbg3); color: var(--dt3); }
  .sig-preview { font-size: 12px; color: var(--dt); margin-bottom: 8px; line-height: 1.5; }
  .sig-footer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .sig-agent { font-size: 11px; color: var(--dt3); }
  .sig-weight { font-size: 11px; color: var(--dt4); font-family: var(--font-mono); }
  .sig-fail { font-size: 11px; color: #fca5a5; }
  .sig-time { font-size: 11px; color: var(--dt4); margin-left: auto; }
</style>
