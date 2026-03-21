<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  onMount(() => {
    if (browser && localStorage.getItem('canopy-onboarding-complete') !== 'true') {
      goto('/onboarding');
    } else {
      goto('/app');
    }
  });
</script>
