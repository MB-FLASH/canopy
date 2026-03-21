<!-- src/routes/app/alerts/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import { alertsStore } from '$lib/stores/alerts.svelte';

  onMount(() => {
    void alertsStore.fetchRules();
  });
</script>

<PageShell
  title="Alerts"
  subtitle="{alertsStore.enabledCount} of {alertsStore.totalCount} enabled"
>
  {#if alertsStore.loading && alertsStore.rules.length === 0}
    <div class="al-loading" role="status" aria-live="polite">
      <div class="al-spinner" aria-hidden="true"></div>
      <span>Loading alert rules…</span>
    </div>
  {:else if alertsStore.error && alertsStore.rules.length === 0}
    <div class="al-error" role="alert">
      <p>Failed to load alerts: {alertsStore.error}</p>
      <button onclick={() => void alertsStore.fetchRules()}>Retry</button>
    </div>
  {:else if alertsStore.rules.length === 0}
    <div class="al-empty" role="status">
      <p>No alert rules configured.</p>
    </div>
  {:else}
    <div class="al-list" role="list" aria-label="Alert rules">
      {#each alertsStore.rules as rule (rule.id)}
        <div class="al-item" role="listitem">
          <div class="al-info">
            <div class="al-name">{rule.name}</div>
            <div class="al-meta">
              <span class="al-entity">{rule.entity_type}</span>
              <span class="al-op">{rule.field} {rule.operator} {rule.value}</span>
              <span class="al-action">→ {rule.action}</span>
            </div>
          </div>
          <span class="al-status" class:al-status--on={rule.enabled}>
            {rule.enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</PageShell>

<style>
  .al-loading, .al-empty, .al-error {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; height: 200px;
    color: var(--dt3); font-size: 13px;
  }
  .al-spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--dbd); border-top-color: var(--dt2);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .al-list { display: flex; flex-direction: column; gap: 8px; padding: 24px; }
  .al-item {
    display: flex; align-items: center; gap: 16px;
    padding: 14px 16px; border-radius: 8px;
    background: var(--dbg2); border: 1px solid var(--dbd);
  }
  .al-info { flex: 1; }
  .al-name { font-size: 14px; font-weight: 500; color: var(--dt); margin-bottom: 4px; }
  .al-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--dt3); flex-wrap: wrap; }
  .al-entity { background: var(--dbg3); padding: 1px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase; }
  .al-op { font-family: var(--font-mono); }
  .al-action { color: var(--dt2); }
  .al-status { font-size: 12px; padding: 3px 8px; border-radius: 4px; background: var(--dbg3); color: var(--dt3); }
  .al-status--on { background: rgba(34, 197, 94, 0.12); color: rgba(134, 239, 172, 0.8); }
</style>
