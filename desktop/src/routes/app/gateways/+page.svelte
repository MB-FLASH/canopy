<!-- src/routes/app/gateways/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import { gatewaysStore } from '$lib/stores/gateways.svelte';

  onMount(() => {
    void gatewaysStore.fetchGateways();
  });
</script>

<PageShell
  title="Gateways"
  subtitle="{gatewaysStore.healthyCount} healthy"
  badge={gatewaysStore.totalCount > 0 ? gatewaysStore.totalCount : undefined}
>
  {#if gatewaysStore.loading && gatewaysStore.gateways.length === 0}
    <div class="gw-loading" role="status" aria-live="polite">
      <div class="gw-spinner" aria-hidden="true"></div>
      <span>Loading gateways…</span>
    </div>
  {:else if gatewaysStore.error && gatewaysStore.gateways.length === 0}
    <div class="gw-error" role="alert">
      <p>Failed to load gateways: {gatewaysStore.error}</p>
      <button onclick={() => void gatewaysStore.fetchGateways()}>Retry</button>
    </div>
  {:else if gatewaysStore.gateways.length === 0}
    <div class="gw-empty" role="status">
      <p>No gateways configured.</p>
    </div>
  {:else}
    <div class="gw-list" role="list" aria-label="Gateways">
      {#each gatewaysStore.gateways as gw (gw.id)}
        <div class="gw-card" role="listitem">
          <div class="gw-header">
            <div class="gw-name">
              {gw.name}
              {#if gw.is_primary}
                <span class="gw-primary">Primary</span>
              {/if}
            </div>
            <span class="gw-status gw-status--{gw.status}">{gw.status}</span>
          </div>
          <div class="gw-meta">
            <span class="gw-provider">{gw.provider}</span>
            <span class="gw-endpoint">{gw.endpoint}</span>
          </div>
          {#if gw.latency_ms !== null}
            <div class="gw-latency">{gw.latency_ms}ms latency</div>
          {/if}
          {#if gw.models.length > 0}
            <div class="gw-models">
              {#each gw.models.slice(0, 4) as model}
                <span class="gw-model">{model}</span>
              {/each}
              {#if gw.models.length > 4}
                <span class="gw-model-more">+{gw.models.length - 4} more</span>
              {/if}
            </div>
          {/if}
          <div class="gw-actions">
            <button
              class="gw-probe-btn"
              onclick={() => void gatewaysStore.probeGateway(gw.id)}
              aria-label="Probe gateway {gw.name}"
              type="button"
            >
              Probe
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</PageShell>

<style>
  .gw-loading, .gw-empty, .gw-error {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; height: 200px;
    color: var(--dt3); font-size: 13px;
  }
  .gw-spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--dbd); border-top-color: var(--dt2);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .gw-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; padding: 24px; }
  .gw-card { background: var(--dbg2); border: 1px solid var(--dbd); border-radius: 10px; padding: 16px; }
  .gw-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .gw-name { font-size: 15px; font-weight: 600; color: var(--dt); display: flex; align-items: center; gap: 8px; }
  .gw-primary { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(99, 102, 241, 0.15); color: #a5b4fc; font-weight: 500; }
  .gw-status { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
  .gw-status--healthy { background: rgba(34, 197, 94, 0.12); color: rgba(134, 239, 172, 0.8); }
  .gw-status--degraded { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
  .gw-status--down { background: rgba(239, 68, 68, 0.12); color: #fca5a5; }
  .gw-meta { display: flex; gap: 12px; margin-bottom: 8px; }
  .gw-provider { font-size: 12px; color: var(--dt3); font-weight: 500; }
  .gw-endpoint { font-size: 11px; color: var(--dt4); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gw-latency { font-size: 11px; color: var(--dt3); margin-bottom: 8px; font-variant-numeric: tabular-nums; }
  .gw-models { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; }
  .gw-model { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--dbg3); color: var(--dt3); }
  .gw-model-more { font-size: 10px; color: var(--dt4); }
  .gw-actions { display: flex; justify-content: flex-end; }
  .gw-probe-btn {
    padding: 5px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
    border: 1px solid var(--dbd); background: transparent; color: var(--dt2);
    transition: all 120ms ease;
  }
  .gw-probe-btn:hover { background: var(--dbg3); border-color: var(--dbd2); }
</style>
