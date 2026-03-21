<!-- src/routes/app/templates/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import { templatesStore } from '$lib/stores/templates.svelte';

  onMount(() => {
    void templatesStore.fetchTemplates();
  });
</script>

<PageShell
  title="Templates"
  badge={templatesStore.totalCount > 0 ? templatesStore.totalCount : undefined}
>
  {#snippet actions()}
    <input
      class="tpl-search"
      type="search"
      placeholder="Search templates…"
      value={templatesStore.searchQuery}
      oninput={(e) => templatesStore.setSearch((e.target as HTMLInputElement).value)}
      aria-label="Search templates"
    />
  {/snippet}

  {#if templatesStore.loading && templatesStore.templates.length === 0}
    <div class="tpl-loading" role="status" aria-live="polite">
      <div class="tpl-spinner" aria-hidden="true"></div>
      <span>Loading templates…</span>
    </div>
  {:else if templatesStore.error && templatesStore.templates.length === 0}
    <div class="tpl-error" role="alert">
      <p>Failed to load templates: {templatesStore.error}</p>
      <button onclick={() => void templatesStore.fetchTemplates()}>Retry</button>
    </div>
  {:else if templatesStore.filteredTemplates.length === 0}
    <div class="tpl-empty" role="status">
      <p>{templatesStore.searchQuery ? 'No templates match your search.' : 'No templates available.'}</p>
    </div>
  {:else}
    {#if templatesStore.categories.length > 1}
      <div class="tpl-categories" role="tablist" aria-label="Filter by category">
        <button
          class="tpl-cat-btn"
          class:tpl-cat-btn--active={templatesStore.filterCategory === 'all'}
          onclick={() => templatesStore.setCategoryFilter('all')}
          role="tab"
          aria-selected={templatesStore.filterCategory === 'all'}
        >
          All
        </button>
        {#each templatesStore.categories as cat}
          <button
            class="tpl-cat-btn"
            class:tpl-cat-btn--active={templatesStore.filterCategory === cat}
            onclick={() => templatesStore.setCategoryFilter(cat)}
            role="tab"
            aria-selected={templatesStore.filterCategory === cat}
          >
            {cat}
          </button>
        {/each}
      </div>
    {/if}

    <div class="tpl-grid" role="list" aria-label="Agent templates">
      {#each templatesStore.filteredTemplates as template (template.id)}
        <div
          class="tpl-card"
          class:tpl-card--selected={templatesStore.selected?.id === template.id}
          role="listitem"
        >
          <button
            class="tpl-card-btn"
            onclick={() => templatesStore.selectTemplate(template)}
            aria-pressed={templatesStore.selected?.id === template.id}
            aria-label="Select template {template.name}"
          >
            <div class="tpl-header">
              <span class="tpl-name">{template.name}</span>
              <span class="tpl-adapter">{template.adapter}</span>
            </div>
            <p class="tpl-desc">{template.description}</p>
            <div class="tpl-meta">
              <span class="tpl-model">{template.model}</span>
              <span class="tpl-downloads">{template.downloads.toLocaleString()} downloads</span>
            </div>
            {#if template.skills.length > 0}
              <div class="tpl-skills">
                {#each template.skills.slice(0, 3) as skill}
                  <span class="tpl-skill">{skill}</span>
                {/each}
                {#if template.skills.length > 3}
                  <span class="tpl-skill-more">+{template.skills.length - 3}</span>
                {/if}
              </div>
            {/if}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</PageShell>

<style>
  .tpl-search {
    height: 28px; padding: 0 10px; border-radius: 6px; font-size: 12px;
    background: var(--dbg2); border: 1px solid var(--dbd); color: var(--dt); min-width: 200px;
  }
  .tpl-search:focus { outline: none; border-color: #6366f1; }
  .tpl-loading, .tpl-empty, .tpl-error {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; height: 200px;
    color: var(--dt3); font-size: 13px;
  }
  .tpl-spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--dbd); border-top-color: var(--dt2);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .tpl-categories { display: flex; gap: 4px; padding: 16px 24px 0; flex-wrap: wrap; }
  .tpl-cat-btn {
    padding: 5px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
    border: 1px solid var(--dbd); background: transparent; color: var(--dt3);
    transition: all 120ms ease;
  }
  .tpl-cat-btn:hover { color: var(--dt2); background: var(--dbg3); }
  .tpl-cat-btn--active { background: color-mix(in srgb, #6366f1 15%, transparent); border-color: color-mix(in srgb, #6366f1 40%, transparent); color: #a5b4fc; }
  .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; padding: 16px 24px 24px; }
  .tpl-card {
    background: var(--dbg2); border: 1px solid var(--dbd); border-radius: 10px;
    transition: border-color 120ms ease;
  }
  .tpl-card:hover { border-color: var(--dbd2); }
  .tpl-card--selected { border-color: #6366f1; background: color-mix(in srgb, #6366f1 6%, var(--dbg2)); }
  .tpl-card-btn { width: 100%; padding: 16px; text-align: left; background: none; border: none; cursor: pointer; }
  .tpl-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .tpl-name { font-size: 14px; font-weight: 600; color: var(--dt); }
  .tpl-adapter { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--dbg3); color: var(--dt3); text-transform: uppercase; }
  .tpl-desc { font-size: 12px; color: var(--dt3); margin: 0 0 10px; line-height: 1.5; }
  .tpl-meta { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
  .tpl-model { font-size: 11px; color: var(--dt2); font-family: var(--font-mono); }
  .tpl-downloads { font-size: 11px; color: var(--dt4); }
  .tpl-skills { display: flex; gap: 4px; flex-wrap: wrap; }
  .tpl-skill { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--dbg3); color: var(--dt3); }
  .tpl-skill-more { font-size: 10px; color: var(--dt4); }
</style>
