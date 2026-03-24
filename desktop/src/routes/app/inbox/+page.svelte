<!-- src/routes/app/inbox/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import InboxFilters from '$lib/components/inbox/InboxFilters.svelte';
  import InboxFeed from '$lib/components/inbox/InboxFeed.svelte';
  import { inboxStore } from '$lib/stores/inbox.svelte';
  import { approvalsStore } from '$lib/stores/approvals.svelte';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import type { ApprovalStatus } from '$api/types';

  // ── Tab state — driven by ?tab= query param ──────────────────────────────
  type InboxTab = 'all' | 'messages' | 'approvals';

  let activeTab = $derived.by<InboxTab>(() => {
    const t = $page.url.searchParams.get('tab');
    if (t === 'messages' || t === 'approvals') return t;
    return 'all';
  });

  function setTab(tab: InboxTab) {
    const url = new URL($page.url);
    if (tab === 'all') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    void goto(url.toString(), { replaceState: true, keepFocus: true });
  }

  // ── Fetch both stores on mount / workspace change ────────────────────────
  $effect(() => {
    void workspaceStore.activeWorkspaceId;
    void inboxStore.fetchItems();
    void approvalsStore.fetchApprovals();
  });

  // ── Combined badge ───────────────────────────────────────────────────────
  let totalBadge = $derived(
    inboxStore.unreadCount + approvalsStore.pendingCount > 0
      ? inboxStore.unreadCount + approvalsStore.pendingCount
      : undefined,
  );

  // ── Approval interaction state ───────────────────────────────────────────
  let commentMap = $state<Record<string, string>>({});
  let actionPending = $state<Record<string, boolean>>({});

  function getComment(id: string): string {
    return commentMap[id] ?? '';
  }

  function setComment(id: string, value: string) {
    commentMap = { ...commentMap, [id]: value };
  }

  async function handleApprove(id: string) {
    actionPending = { ...actionPending, [id]: true };
    await approvalsStore.approve(id, getComment(id) || undefined);
    actionPending = { ...actionPending, [id]: false };
  }

  async function handleReject(id: string) {
    actionPending = { ...actionPending, [id]: true };
    await approvalsStore.reject(id, getComment(id) || undefined);
    actionPending = { ...actionPending, [id]: false };
  }

  const STATUS_LABELS: Record<ApprovalStatus, string> = {
    pending:  'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    expired:  'Expired',
  };

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  // ── Tab definitions ──────────────────────────────────────────────────────
  const TABS: { id: InboxTab; label: string }[] = [
    { id: 'all',       label: 'All' },
    { id: 'messages',  label: 'Messages' },
    { id: 'approvals', label: 'Approvals' },
  ];
</script>

<PageShell title="Inbox" badge={totalBadge}>
  {#snippet actions()}
    <nav class="ib-tab-bar" aria-label="Inbox sections">
      {#each TABS as tab (tab.id)}
        <button
          class="ib-tab"
          class:ib-tab--active={activeTab === tab.id}
          onclick={() => setTab(tab.id)}
          type="button"
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          {tab.label}
          {#if tab.id === 'messages' && inboxStore.unreadCount > 0}
            <span class="ib-tab-badge" aria-label="{inboxStore.unreadCount} unread">
              {inboxStore.unreadCount}
            </span>
          {:else if tab.id === 'approvals' && approvalsStore.pendingCount > 0}
            <span class="ib-tab-badge ib-tab-badge--approval" aria-label="{approvalsStore.pendingCount} pending">
              {approvalsStore.pendingCount}
            </span>
          {/if}
        </button>
      {/each}
    </nav>
  {/snippet}

  <div class="ib-content">
    <!-- ── Messages view ───────────────────────────────────────────────── -->
    {#if activeTab === 'messages'}
      <InboxFilters />
      <InboxFeed />

    <!-- ── Approvals view ─────────────────────────────────────────────── -->
    {:else if activeTab === 'approvals'}
      {#if approvalsStore.loading && approvalsStore.approvals.length === 0}
        <div class="ib-approval-state" role="status" aria-live="polite">
          <div class="ib-approval-spinner" aria-hidden="true"></div>
          <span>Loading approvals…</span>
        </div>
      {:else if approvalsStore.error && approvalsStore.approvals.length === 0}
        <div class="ib-approval-state ib-approval-state--error" role="alert">
          <p>Failed to load approvals: {approvalsStore.error}</p>
          <button
            class="ib-approval-retry"
            onclick={() => void approvalsStore.fetchApprovals()}
          >
            Retry
          </button>
        </div>
      {:else if approvalsStore.filteredApprovals.length === 0}
        <div class="ib-approval-state" role="status">
          <p class="ib-approval-empty">No approval requests.</p>
        </div>
      {:else}
        <ul class="ib-approval-list" aria-label="Approval requests">
          {#each approvalsStore.filteredApprovals as approval (approval.id)}
            {@const isPending = approval.status === 'pending'}
            {@const busy = actionPending[approval.id] ?? false}
            <li class="ib-approval-item">
              <div class="ib-approval-header">
                <div class="ib-approval-meta">
                  <span
                    class="ib-approval-badge"
                    class:ib-approval-badge--pending={approval.status === 'pending'}
                    class:ib-approval-badge--approved={approval.status === 'approved'}
                    class:ib-approval-badge--rejected={approval.status === 'rejected'}
                    class:ib-approval-badge--expired={approval.status === 'expired'}
                  >
                    {STATUS_LABELS[approval.status]}
                  </span>
                  {#if approval.entity_type}
                    <span class="ib-approval-entity">{approval.entity_type}</span>
                  {/if}
                </div>
                <time class="ib-approval-date" datetime={approval.created_at}>
                  {formatDate(approval.created_at)}
                </time>
              </div>

              <h3 class="ib-approval-title">{approval.title}</h3>
              {#if approval.description}
                <p class="ib-approval-desc">{approval.description}</p>
              {/if}

              <div class="ib-approval-requester">
                Requested by <span class="ib-approval-requester-name">{approval.requester_name}</span>
                {#if approval.expires_at}
                  <span class="ib-approval-expires">· expires {formatDate(approval.expires_at)}</span>
                {/if}
              </div>

              {#if approval.comment && !isPending}
                <p class="ib-approval-reviewer-comment">"{approval.comment}"</p>
              {/if}

              {#if isPending}
                <div class="ib-approval-actions">
                  <input
                    class="ib-approval-comment"
                    type="text"
                    placeholder="Optional comment…"
                    value={getComment(approval.id)}
                    oninput={(e) => setComment(approval.id, (e.target as HTMLInputElement).value)}
                    aria-label="Comment for approval decision"
                    disabled={busy}
                  />
                  <div class="ib-approval-btns">
                    <button
                      class="ib-approval-btn ib-approval-btn--approve"
                      onclick={() => handleApprove(approval.id)}
                      disabled={busy}
                      aria-label="Approve {approval.title}"
                      type="button"
                    >
                      {busy ? 'Working…' : 'Approve'}
                    </button>
                    <button
                      class="ib-approval-btn ib-approval-btn--reject"
                      onclick={() => handleReject(approval.id)}
                      disabled={busy}
                      aria-label="Reject {approval.title}"
                      type="button"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

    <!-- ── All view — messages + approvals interleaved ────────────────── -->
    {:else}
      <!-- Approvals summary row (only when pending items exist) -->
      {#if approvalsStore.pendingCount > 0}
        <div class="ib-all-approvals-banner">
          <span class="ib-all-approvals-label">
            <span class="ib-all-approvals-dot" aria-hidden="true"></span>
            {approvalsStore.pendingCount} pending approval{approvalsStore.pendingCount === 1 ? '' : 's'}
          </span>
          <button
            class="ib-all-approvals-link"
            type="button"
            onclick={() => setTab('approvals')}
          >
            Review
          </button>
        </div>
      {/if}
      <InboxFilters />
      <InboxFeed />
    {/if}
  </div>
</PageShell>

<style>
  /* ── Tab bar ─────────────────────────────────────────────────────────────── */
  .ib-tab-bar {
    display: flex;
    gap: 2px;
  }

  .ib-tab {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 10px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 500;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 100ms ease, color 100ms ease, border-color 100ms ease;
  }

  .ib-tab:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .ib-tab--active {
    background: var(--bg-elevated);
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .ib-tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .ib-tab-badge--approval {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }

  /* ── Page content container ─────────────────────────────────────────────── */
  .ib-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* ── All-tab approvals banner ───────────────────────────────────────────── */
  .ib-all-approvals-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin-bottom: 8px;
    border-radius: 6px;
    background: rgba(245, 158, 11, 0.07);
    border: 1px solid rgba(245, 158, 11, 0.2);
    flex-shrink: 0;
  }

  .ib-all-approvals-label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    color: #fbbf24;
    font-weight: 500;
  }

  .ib-all-approvals-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fbbf24;
    flex-shrink: 0;
  }

  .ib-all-approvals-link {
    font-size: 11px;
    font-weight: 500;
    color: #fbbf24;
    background: transparent;
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 4px;
    padding: 2px 8px;
    cursor: pointer;
    transition: background 100ms ease;
  }

  .ib-all-approvals-link:hover {
    background: rgba(245, 158, 11, 0.12);
  }

  /* ── Approval states ────────────────────────────────────────────────────── */
  .ib-approval-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 220px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .ib-approval-state--error { color: var(--accent-error, #f87171); }

  .ib-approval-spinner {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid var(--border-default);
    border-top-color: var(--text-secondary);
    animation: ib-spin 0.75s linear infinite;
  }

  @keyframes ib-spin { to { transform: rotate(360deg); } }

  .ib-approval-empty { margin: 0; }

  .ib-approval-retry {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .ib-approval-retry:hover {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  /* ── Approval list ──────────────────────────────────────────────────────── */
  .ib-approval-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-height: 0;
  }

  /* ── Approval item card ─────────────────────────────────────────────────── */
  .ib-approval-item {
    padding: 16px;
    border-radius: 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 120ms ease;
  }

  .ib-approval-item:hover { border-color: var(--border-hover); }

  .ib-approval-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .ib-approval-meta {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ── Status badge ───────────────────────────────────────────────────────── */
  .ib-approval-badge {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border-default);
  }

  .ib-approval-badge--pending {
    background: rgba(245, 158, 11, 0.1);
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.25);
  }

  .ib-approval-badge--approved {
    background: rgba(34, 197, 94, 0.1);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.25);
  }

  .ib-approval-badge--rejected {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.25);
  }

  .ib-approval-badge--expired {
    background: var(--bg-elevated);
    color: var(--text-tertiary);
    border-color: var(--border-default);
  }

  .ib-approval-entity {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--bg-elevated);
    color: var(--text-tertiary);
  }

  .ib-approval-date {
    font-size: 11px;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  /* ── Item content ───────────────────────────────────────────────────────── */
  .ib-approval-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .ib-approval-desc {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .ib-approval-requester {
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .ib-approval-requester-name {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .ib-approval-expires { color: var(--accent-warning, #fbbf24); }

  .ib-approval-reviewer-comment {
    margin: 0;
    font-size: 12px;
    font-style: italic;
    color: var(--text-secondary);
    padding: 8px 10px;
    background: var(--bg-elevated);
    border-left: 2px solid var(--border-hover);
    border-radius: 0 4px 4px 0;
  }

  /* ── Action area ────────────────────────────────────────────────────────── */
  .ib-approval-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 4px;
    flex-wrap: wrap;
  }

  .ib-approval-comment {
    flex: 1;
    min-width: 160px;
    height: 30px;
    padding: 0 10px;
    border-radius: 6px;
    font-size: 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-default);
    color: var(--text-primary);
    transition: border-color 100ms ease;
  }

  .ib-approval-comment::placeholder { color: var(--text-muted); }

  .ib-approval-comment:focus {
    outline: none;
    border-color: var(--border-focus);
  }

  .ib-approval-comment:disabled { opacity: 0.5; cursor: not-allowed; }

  .ib-approval-btns {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .ib-approval-btn {
    height: 30px;
    padding: 0 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 100ms ease, opacity 100ms ease;
  }

  .ib-approval-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .ib-approval-btn--approve {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .ib-approval-btn--approve:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.25);
  }

  .ib-approval-btn--reject {
    background: rgba(239, 68, 68, 0.12);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
  }

  .ib-approval-btn--reject:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.22);
  }
</style>
