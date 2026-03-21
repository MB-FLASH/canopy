<script lang="ts">
  import { onMount } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import KpiGrid from '$lib/components/dashboard/KpiGrid.svelte';
  import LiveRunsWidget from '$lib/components/dashboard/LiveRunsWidget.svelte';
  import RecentActivityFeed from '$lib/components/dashboard/RecentActivityFeed.svelte';
  import FinanceSummary from '$lib/components/dashboard/FinanceSummary.svelte';
  import QuickActions from '$lib/components/dashboard/QuickActions.svelte';
  import SystemHealthBar from '$lib/components/dashboard/SystemHealthBar.svelte';
  import { dashboardStore } from '$lib/stores/dashboard.svelte';

  onMount(() => dashboardStore.startAutoRefresh(30_000));
</script>

<PageShell title="Dashboard">
  <div class="dashboard-grid">
    <div class="dashboard-top"><KpiGrid /></div>
    <div class="dashboard-quick"><QuickActions /></div>
    <div class="dashboard-runs"><LiveRunsWidget /></div>
    <div class="dashboard-activity"><RecentActivityFeed /></div>
    <div class="dashboard-finance"><FinanceSummary /></div>
    <div class="dashboard-health"><SystemHealthBar /></div>
  </div>
</PageShell>

<style>
  .dashboard-grid {
    display: grid; gap: 16px; padding: 20px 24px;
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "top top"
      "quick quick"
      "runs activity"
      "finance finance"
      "health health";
  }
  .dashboard-top { grid-area: top; }
  .dashboard-quick { grid-area: quick; }
  .dashboard-runs { grid-area: runs; }
  .dashboard-activity { grid-area: activity; }
  .dashboard-finance { grid-area: finance; }
  .dashboard-health { grid-area: health; }
</style>
