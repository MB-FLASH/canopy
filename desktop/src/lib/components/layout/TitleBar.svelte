<!-- src/lib/components/layout/TitleBar.svelte -->
<script lang="ts">
  import { isTauri, isMacOS } from '$lib/utils/platform';

  const inTauri = isTauri();
  const macOS = isMacOS();
  const height = inTauri && macOS ? 28 : 0;
</script>

{#if inTauri && height > 0}
  <div
    class="tb-bar"
    style="height: {height}px;"
    data-tauri-drag-region
    aria-hidden="true"
  ></div>
{/if}

<style>
  .tb-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    pointer-events: none;
    background: transparent;
    -webkit-app-region: drag;
    app-region: drag;
  }
</style>
