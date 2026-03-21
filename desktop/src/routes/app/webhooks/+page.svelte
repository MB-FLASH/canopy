<!-- src/routes/app/webhooks/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import { webhooksStore } from '$lib/stores/webhooks.svelte';

  onMount(() => {
    void webhooksStore.fetchWebhooks();
  });
</script>

<PageShell title="Webhooks" badge={webhooksStore.totalCount > 0 ? webhooksStore.totalCount : undefined}>
  {#if webhooksStore.loading && webhooksStore.webhooks.length === 0}
    <div class="wh-loading" role="status" aria-live="polite">
      <div class="wh-spinner" aria-hidden="true"></div>
      <span>Loading webhooks…</span>
    </div>
  {:else if webhooksStore.error && webhooksStore.webhooks.length === 0}
    <div class="wh-error" role="alert">
      <p>Failed to load webhooks: {webhooksStore.error}</p>
      <button onclick={() => void webhooksStore.fetchWebhooks()}>Retry</button>
    </div>
  {:else if webhooksStore.webhooks.length === 0}
    <div class="wh-empty" role="status">
      <p>No webhooks configured yet.</p>
    </div>
  {:else}
    <div class="wh-list" role="list" aria-label="Webhooks">
      {#each webhooksStore.webhooks as webhook (webhook.id)}
        <div class="wh-item" role="listitem">
          <div class="wh-info">
            <div class="wh-name">{webhook.name}</div>
            <div class="wh-url">{webhook.url}</div>
            <div class="wh-events">
              {#each webhook.events as ev}
                <span class="wh-ev">{ev}</span>
              {/each}
            </div>
          </div>
          <div class="wh-status">
            <span class="wh-active" class:wh-active--on={webhook.enabled}>
              {webhook.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button
            class="wh-delete"
            onclick={() => void webhooksStore.deleteWebhook(webhook.id)}
            aria-label="Delete webhook {webhook.name}"
            type="button"
          >
            Delete
          </button>
        </div>
      {/each}
    </div>
  {/if}
</PageShell>

<style>
  .wh-loading, .wh-empty, .wh-error {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; height: 200px;
    color: var(--dt3); font-size: 13px;
  }
  .wh-spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--dbd); border-top-color: var(--dt2);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .wh-list { display: flex; flex-direction: column; gap: 8px; padding: 24px; }
  .wh-item {
    display: flex; align-items: center; gap: 16px;
    padding: 14px 16px; border-radius: 8px;
    background: var(--dbg2); border: 1px solid var(--dbd);
  }
  .wh-info { flex: 1; }
  .wh-name { font-size: 14px; font-weight: 500; color: var(--dt); margin-bottom: 2px; }
  .wh-url { font-size: 11px; color: var(--dt3); font-family: var(--font-mono); margin-bottom: 6px; }
  .wh-events { display: flex; gap: 4px; flex-wrap: wrap; }
  .wh-ev { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--dbg3); color: var(--dt3); }
  .wh-status { min-width: 70px; text-align: center; }
  .wh-active { font-size: 12px; padding: 3px 8px; border-radius: 4px; background: var(--dbg3); color: var(--dt3); }
  .wh-active--on { background: rgba(34, 197, 94, 0.12); color: rgba(134, 239, 172, 0.8); }
  .wh-delete {
    padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
    border: 1px solid var(--dbd); background: transparent; color: var(--dt3);
    transition: all 120ms ease;
  }
  .wh-delete:hover { border-color: rgba(239,68,68,0.4); color: #fca5a5; background: rgba(239,68,68,0.08); }
</style>
