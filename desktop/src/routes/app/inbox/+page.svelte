<!-- src/routes/app/inbox/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  import PageShell from '$lib/components/layout/PageShell.svelte';
  import InboxFilters from '$lib/components/inbox/InboxFilters.svelte';
  import InboxFeed from '$lib/components/inbox/InboxFeed.svelte';
  import { inboxStore } from '$lib/stores/inbox.svelte';

  onMount(async () => {
    await inboxStore.fetchItems();
  });
</script>

<PageShell
  title="Inbox"
  badge={inboxStore.unreadCount > 0 ? inboxStore.unreadCount : undefined}
>
  <div class="inp-content">
    <InboxFilters />
    <InboxFeed />
  </div>
</PageShell>

<style>
  .inp-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
</style>
