<!-- src/routes/app/config/+page.svelte -->
<script lang="ts">
  import PageShell from '$lib/components/layout/PageShell.svelte';
</script>

<PageShell title="Configuration" subtitle="Instance settings">
  <div class="cfg-placeholder" role="status">
    <div class="cfg-icon" aria-hidden="true">⚙</div>
    <h2 class="cfg-title">Configuration</h2>
    <p class="cfg-desc">Manage instance settings, feature flags, and configuration revisions.</p>
    <div class="cfg-notice">
      <span class="cfg-notice-label">Backend required</span>
      Connect the Canopy backend to enable configuration management.
    </div>
    <ul class="cfg-features" aria-label="Planned features">
      <li>Instance-wide settings editor</li>
      <li>Configuration revision history</li>
      <li>Feature flag toggles</li>
      <li>Environment variable management</li>
    </ul>
  </div>
</PageShell>

<style>
  .cfg-placeholder {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 16px; min-height: 320px; text-align: center;
    padding: 40px;
  }
  .cfg-icon { font-size: 40px; opacity: 0.3; line-height: 1; }
  .cfg-title { font-size: 18px; font-weight: 600; color: var(--dt); margin: 0; }
  .cfg-desc { font-size: 13px; color: var(--dt3); max-width: 400px; margin: 0; line-height: 1.6; }
  .cfg-notice {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px; border-radius: 8px; font-size: 12px;
    background: color-mix(in srgb, #f59e0b 10%, transparent);
    border: 1px solid color-mix(in srgb, #f59e0b 25%, transparent);
    color: var(--dt2);
  }
  .cfg-notice-label {
    font-weight: 600; color: #fbbf24; white-space: nowrap;
  }
  .cfg-features {
    list-style: none; padding: 0; margin: 0;
    display: flex; flex-direction: column; gap: 6px; align-items: center;
  }
  .cfg-features li {
    font-size: 12px; color: var(--dt4);
    display: flex; align-items: center; gap: 6px;
  }
  .cfg-features li::before { content: '—'; opacity: 0.4; }
</style>
