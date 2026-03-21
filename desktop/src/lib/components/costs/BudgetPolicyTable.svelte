<!-- src/lib/components/costs/BudgetPolicyTable.svelte -->
<script lang="ts">
  import BudgetBar from '$lib/components/shared/BudgetBar.svelte';
  import { costsStore } from '$lib/stores/costs.svelte';
  import type { BudgetPolicy } from '$api/types';

  function fmtCents(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  function policyScope(policy: BudgetPolicy): string {
    if (policy.agent_ids.length === 0) return 'All agents';
    if (policy.agent_ids.length === 1) return '1 agent';
    return `${policy.agent_ids.length} agents`;
  }

  // Determine policy status by looking at incidents
  function policyStatus(policy: BudgetPolicy): 'healthy' | 'warning' | 'exceeded' {
    const incident = costsStore.incidents.find(
      (i) => i.policy_id === policy.id && !i.resolved
    );
    if (!incident) return 'healthy';
    if (incident.type === 'hard_stop') return 'exceeded';
    return 'warning';
  }

  // Simulate current usage from incidents (real data would come from API)
  function currentUsageCents(policy: BudgetPolicy): number {
    const incident = costsStore.incidents.find((i) => i.policy_id === policy.id);
    return incident ? incident.amount_cents : 0;
  }
</script>

<article class="bpt-panel" aria-label="Budget policies">
  <header class="bpt-header">
    <span class="bpt-title">Budget Policies</span>
    <button class="bpt-add-btn" aria-label="Add new budget policy">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add Policy
    </button>
  </header>

  {#if costsStore.policies.length === 0}
    <div class="bpt-empty">No budget policies configured</div>
  {:else}
    <div class="bpt-table-wrap" role="region" aria-label="Budget policies table">
      <table class="bpt-table">
        <thead>
          <tr>
            <th class="bpt-th">Name</th>
            <th class="bpt-th">Scope</th>
            <th class="bpt-th bpt-th--num">Daily Limit</th>
            <th class="bpt-th bpt-th--num">Monthly Limit</th>
            <th class="bpt-th bpt-th--wide">Daily Usage</th>
            <th class="bpt-th bpt-th--num">Warning</th>
            <th class="bpt-th">Hard Stop</th>
            <th class="bpt-th">Status</th>
            <th class="bpt-th bpt-th--actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each costsStore.policies as policy (policy.id)}
            {@const status = policyStatus(policy)}
            {@const usageCents = currentUsageCents(policy)}
            <tr class="bpt-row bpt-row--{status}">
              <td class="bpt-td">
                <span class="bpt-name">{policy.name}</span>
              </td>
              <td class="bpt-td">
                <span class="bpt-scope">{policyScope(policy)}</span>
              </td>
              <td class="bpt-td bpt-td--num">{fmtCents(policy.daily_limit_cents)}</td>
              <td class="bpt-td bpt-td--num">{fmtCents(policy.monthly_limit_cents)}</td>
              <td class="bpt-td bpt-td--wide">
                <BudgetBar
                  spent={usageCents / 100}
                  limit={policy.daily_limit_cents / 100}
                  currency="$"
                  warningPct={Math.round(policy.warning_threshold * 100)}
                />
              </td>
              <td class="bpt-td bpt-td--num">{Math.round(policy.warning_threshold * 100)}%</td>
              <td class="bpt-td">
                <span class="bpt-badge bpt-badge--{policy.hard_stop ? 'on' : 'off'}">
                  {policy.hard_stop ? 'Yes' : 'No'}
                </span>
              </td>
              <td class="bpt-td">
                <span class="bpt-status bpt-status--{status}" aria-label="Status: {status}">
                  {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Exceeded'}
                </span>
              </td>
              <td class="bpt-td bpt-td--actions">
                <button
                  class="bpt-action-btn"
                  aria-label="Edit policy {policy.name}"
                  title="Edit"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  class="bpt-action-btn bpt-action-btn--danger"
                  aria-label="Delete policy {policy.name}"
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</article>

<style>
  .bpt-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .bpt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .bpt-title {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .bpt-add-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    background: var(--accent-primary);
    border: none;
    border-radius: var(--radius-sm);
    color: #fff;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    padding: var(--space-1) var(--space-3);
    cursor: pointer;
    transition: opacity 120ms ease;
  }

  .bpt-add-btn:hover {
    opacity: 0.85;
  }

  .bpt-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    font-size: 13px;
    color: var(--text-tertiary);
  }

  .bpt-table-wrap {
    overflow-x: auto;
  }

  .bpt-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-sans);
    font-size: 12px;
  }

  .bpt-th {
    padding: var(--space-2);
    text-align: left;
    color: var(--text-tertiary);
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 0.3px;
    border-bottom: 1px solid var(--border-default);
    white-space: nowrap;
  }

  .bpt-th--num { text-align: right; }
  .bpt-th--wide { min-width: 140px; }
  .bpt-th--actions { width: 64px; }

  .bpt-row {
    border-bottom: 1px solid var(--border-default);
    transition: background 120ms ease;
  }

  .bpt-row:last-child { border-bottom: none; }
  .bpt-row:hover { background: var(--bg-elevated); }

  .bpt-row--warning { background: rgba(245, 158, 11, 0.03); }
  .bpt-row--exceeded { background: rgba(239, 68, 68, 0.04); }

  .bpt-td {
    padding: var(--space-2);
    color: var(--text-secondary);
    vertical-align: middle;
  }

  .bpt-td--num { text-align: right; font-variant-numeric: tabular-nums; }
  .bpt-td--wide { min-width: 140px; }
  .bpt-td--actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .bpt-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .bpt-scope {
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .bpt-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: var(--radius-xs);
    font-size: 11px;
    font-weight: 500;
  }

  .bpt-badge--on  { color: #ef4444; background: rgba(239,68,68,0.1); }
  .bpt-badge--off { color: var(--text-tertiary); background: rgba(255,255,255,0.05); }

  .bpt-status {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: var(--radius-xs);
    font-size: 11px;
    font-weight: 500;
  }

  .bpt-status--healthy  { color: rgba(34, 197, 94, 0.7); background: rgba(34,197,94,0.08); }
  .bpt-status--warning  { color: #f59e0b; background: rgba(245,158,11,0.1); }
  .bpt-status--exceeded { color: #ef4444; background: rgba(239,68,68,0.1); }

  .bpt-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    background: none;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xs);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: border-color 120ms ease, color 120ms ease;
  }

  .bpt-action-btn:hover {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .bpt-action-btn--danger:hover {
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
  }
</style>
