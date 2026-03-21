<script lang="ts">
  import { goto } from '$app/navigation';
  import { onboardingStore } from '$lib/stores/onboarding.svelte';
  import type { AdapterType, TeamTemplate, AgentTemplateData } from '$lib/stores/onboarding.svelte';
  import { isTauri } from '$lib/utils/platform';

  // ─── Provider definitions ─────────────────────────────────────────────────

  interface Provider {
    slug: string;
    name: string;
    description: string;
    noKey?: boolean;
    recommended?: boolean;
  }

  const FEATURED_PROVIDERS: Provider[] = [
    { slug: 'anthropic',    name: 'Anthropic',      description: 'Claude models — most capable reasoning' },
    { slug: 'ollama-cloud', name: 'Ollama Cloud',   description: 'Managed Ollama — zero infra, instant start',    recommended: true },
    { slug: 'ollama-local', name: 'Ollama Local',   description: 'Run models locally — no API key required',      noKey: true },
    { slug: 'google',       name: 'Google',          description: 'Gemini models — multimodal, long context' },
    { slug: 'groq',         name: 'Groq',            description: 'Ultra-fast inference at low cost' },
    { slug: 'deepseek',     name: 'DeepSeek',        description: 'Strong reasoning, competitive pricing' },
  ];

  const MORE_PROVIDERS: Provider[] = [
    { slug: 'mistral',      name: 'Mistral',         description: 'European open-weight models' },
    { slug: 'cohere',       name: 'Cohere',          description: 'Enterprise NLP and embeddings' },
    { slug: 'together',     name: 'Together AI',     description: 'Open-source models at scale' },
    { slug: 'fireworks',    name: 'Fireworks AI',    description: 'Fast open-source model inference' },
    { slug: 'perplexity',   name: 'Perplexity',      description: 'Search-augmented language models' },
    { slug: 'cerebras',     name: 'Cerebras',        description: 'Wafer-scale AI chip inference' },
    { slug: 'sambanova',    name: 'SambaNova',       description: 'Reconfigurable dataflow architecture' },
    { slug: 'openrouter',   name: 'OpenRouter',      description: 'Unified API for 100+ models' },
    { slug: 'openai',       name: 'OpenAI',          description: 'GPT-4o and o-series models' },
    { slug: 'replicate',    name: 'Replicate',       description: 'Run open-source models via API' },
    { slug: 'xai',          name: 'xAI',             description: 'Grok models from xAI' },
    { slug: 'lambda',       name: 'Lambda',          description: 'GPU cloud for AI workloads' },
    { slug: 'lepton',       name: 'Lepton AI',       description: 'Serverless AI inference platform' },
  ];

  // ─── Adapter definitions ──────────────────────────────────────────────────

  interface AdapterDef {
    id: AdapterType;
    name: string;
    description: string;
    recommended?: boolean;
    useLogoImg?: boolean;
  }

  const ADAPTERS: AdapterDef[] = [
    { id: 'osa',         name: 'OSA',           description: 'Elixir/OTP agent runtime by MIOSA — full orchestration, tools, budgets', recommended: true, useLogoImg: true },
    { id: 'claude-code', name: 'Claude Code',   description: "Anthropic's CLI coding agent — terminal-based pair programming" },
    { id: 'codex',       name: 'Codex',         description: "OpenAI's autonomous coding agent" },
    { id: 'openclaw',    name: 'OpenClaw',      description: 'Open-source multi-agent coordination framework' },
    { id: 'jidoclaw',    name: 'JidoClaw',      description: 'Elixir-native agent framework — lightweight, composable workflows' },
    { id: 'hermes',      name: 'Hermes Agent',  description: 'Fast message-passing agent runtime for real-time systems' },
    { id: 'bash',        name: 'Bash',          description: 'Simple shell script executor — run commands directly' },
    { id: 'http',        name: 'HTTP',          description: 'Generic HTTP/REST adapter — connect any API endpoint' },
  ];

  // ─── Team template definitions ────────────────────────────────────────────

  const TEAM_TEMPLATES: { id: TeamTemplate; name: string; description: string; count: number }[] = [
    { id: 'solo',     name: 'Solo Developer',  description: '1 general-purpose agent',          count: 1 },
    { id: 'dev-team', name: 'Dev Team',         description: '4 specialised agents',             count: 4 },
    { id: 'research', name: 'Research Lab',     description: '3 research & writing agents',      count: 3 },
    { id: 'custom',   name: 'Custom',           description: 'Start with an empty roster',       count: 0 },
  ];

  const TEMPLATE_AGENTS: Record<TeamTemplate, AgentTemplateData[]> = {
    solo: [
      { id: 'main-agent', name: 'Main Agent', emoji: 'bot', role: 'engineer', adapter: 'osa', skills: ['code', 'debug', 'test'], system_prompt: 'You are a skilled software engineer...' },
    ],
    'dev-team': [
      { id: 'orchestrator',    name: 'Orchestrator',    emoji: 'brain',  role: 'orchestrator', adapter: 'osa', skills: ['delegate', 'plan'],              system_prompt: 'You coordinate a development team...' },
      { id: 'code-worker',     name: 'Code Worker',     emoji: 'code',   role: 'developer',    adapter: 'osa', skills: ['code', 'debug'],                 system_prompt: 'You are a focused code implementation specialist...' },
      { id: 'research-worker', name: 'Research Worker', emoji: 'search', role: 'researcher',   adapter: 'osa', skills: ['web_search', 'analyze'],         system_prompt: 'You research solutions, APIs, and best practices...' },
      { id: 'qa-agent',        name: 'QA Agent',        emoji: 'shield', role: 'engineer',     adapter: 'osa', skills: ['test', 'validate'],              system_prompt: 'You ensure code quality through testing...' },
    ],
    research: [
      { id: 'lead-researcher', name: 'Lead Researcher', emoji: 'search', role: 'researcher', adapter: 'osa', skills: ['web_search', 'analyze', 'summarize'], system_prompt: 'You lead research investigations...' },
      { id: 'data-analyst',    name: 'Data Analyst',    emoji: 'chart',  role: 'researcher', adapter: 'osa', skills: ['analyze', 'visualize'],              system_prompt: 'You analyze data and produce insights...' },
      { id: 'writer',          name: 'Writer',          emoji: 'pen',    role: 'writer',     adapter: 'osa', skills: ['write', 'edit', 'format'],            system_prompt: 'You produce clear, well-structured written content...' },
    ],
    custom: [],
  };

  // ─── Local state ──────────────────────────────────────────────────────────

  let step = $state(onboardingStore.currentStep);

  // Step 0
  let displayName = $state(onboardingStore.data.displayName);

  // Step 1
  let selectedProviderSlug = $state(onboardingStore.data.provider?.slug ?? '');
  let providerKeys = $state<Record<string, string>>({});
  let showMoreProviders = $state(false);

  // Initialize API key from stored provider
  $effect(() => {
    if (onboardingStore.data.provider) {
      providerKeys[onboardingStore.data.provider.slug] = onboardingStore.data.provider.apiKey;
    }
  });

  // Step 2
  let selectedAdapter = $state<AdapterType>(onboardingStore.data.adapter);

  // Step 3
  let workspacePath = $state(onboardingStore.data.workspace?.path ?? '~/.canopy');
  let workspaceName = $state(onboardingStore.data.workspace?.name ?? 'My Workspace');
  let workspaceDesc = $state(onboardingStore.data.workspace?.description ?? '');

  // Auto-fill workspace name from path (tracked to avoid infinite loop)
  let lastAutoPath = '';
  $effect(() => {
    const p = workspacePath;
    if (p === lastAutoPath) return;
    lastAutoPath = p;
    const parts = p.split('/');
    const last = parts[parts.length - 1];
    if (last && last !== '~' && last !== '.canopy') {
      workspaceName = last.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } else if (p.includes('.canopy') || p === '~/.canopy') {
      workspaceName = 'My Workspace';
    }
  });

  // Step 4
  let teamTemplate = $state<TeamTemplate>(onboardingStore.data.teamTemplate ?? 'dev-team');

  // Step 5
  let miosaCloud = $state(onboardingStore.data.miosaCloud);

  // ─── Derived state ────────────────────────────────────────────────────────

  const currentProvider = $derived(
    [...FEATURED_PROVIDERS, ...MORE_PROVIDERS].find(p => p.slug === selectedProviderSlug) ?? null
  );

  const teamAgents = $derived(TEMPLATE_AGENTS[teamTemplate]);

  const canContinue = $derived(() => {
    if (step === 1) {
      if (!selectedProviderSlug) return false;
      const prov = currentProvider;
      if (!prov) return false;
      if (prov.noKey) return true;
      return (providerKeys[selectedProviderSlug] ?? '').trim().length > 0;
    }
    if (step === 3) return workspacePath.trim().length > 0;
    return true;
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  function next() {
    if (!canContinue()) return;
    syncToStore();
    onboardingStore.nextStep();
    step = onboardingStore.currentStep;
  }

  function prev() {
    onboardingStore.prevStep();
    step = onboardingStore.currentStep;
  }

  function syncToStore() {
    onboardingStore.updateData({
      displayName,
      provider: selectedProviderSlug
        ? { slug: selectedProviderSlug, apiKey: providerKeys[selectedProviderSlug] ?? '', verified: false }
        : null,
      adapter: selectedAdapter,
      workspace: { path: workspacePath, name: workspaceName, description: workspaceDesc },
      teamTemplate,
      agents: TEMPLATE_AGENTS[teamTemplate],
      miosaCloud,
    });
  }

  let isLaunching = $state(false);

  async function launch() {
    if (isLaunching) return;
    isLaunching = true;
    syncToStore();

    try {
      // Scaffold .canopy/ directory via Tauri IPC
      if (isTauri() && workspacePath.trim()) {
        const { invoke } = await import('@tauri-apps/api/core');
        const agents = TEMPLATE_AGENTS[teamTemplate].map(a => ({
          id: a.id,
          name: a.name,
          emoji: a.emoji,
          role: a.role,
          adapter: a.adapter,
          model: a.model ?? null,
          skills: a.skills,
          system_prompt: a.system_prompt ?? null,
        }));

        try {
          await invoke('scaffold_canopy_dir', {
            path: workspacePath,
            name: workspaceName,
            description: workspaceDesc || null,
            agents,
          });
        } catch (e) {
          // Scaffold may fail if .canopy already exists — that's fine, we'll scan it
          console.warn('Scaffold warning:', e);
        }

        // Add workspace to store
        const { workspaceStore } = await import('$lib/stores/workspace.svelte');
        const wsEntry = {
          id: crypto.randomUUID(),
          path: workspacePath,
          name: workspaceName,
          description: workspaceDesc,
          addedAt: new Date().toISOString(),
        };
        workspaceStore.addWorkspace(wsEntry);
        await workspaceStore.setActiveWorkspace(wsEntry.id);
      }

      // Persist onboarding state + adapter + provider key
      onboardingStore.complete();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('canopy-onboarding-complete', 'true');
        localStorage.setItem('canopy-display-name', displayName);
        localStorage.setItem('canopy-default-adapter', selectedAdapter);
        if (selectedProviderSlug) {
          localStorage.setItem('canopy-provider-slug', selectedProviderSlug);
          const key = providerKeys[selectedProviderSlug];
          if (key) localStorage.setItem(`canopy-provider-${selectedProviderSlug}`, key);
        }
      }

      // Persist provider credentials to Tauri secure store
      if (isTauri() && selectedProviderSlug) {
        const { Store } = await import('@tauri-apps/plugin-store');
        const credStore = await Store.load('credentials.json');
        await credStore.set('provider', {
          slug: selectedProviderSlug,
          apiKey: providerKeys[selectedProviderSlug] ?? '',
        });
        await credStore.save();
      }

      // Persist adapter choice and miosaCloud toggle to Tauri settings store
      if (isTauri()) {
        const { Store } = await import('@tauri-apps/plugin-store');
        const settStore = await Store.load('settings.json');
        await settStore.set('default_adapter', selectedAdapter);
        await settStore.set('miosa_cloud', miosaCloud);
        await settStore.save();
      }

      goto('/app');
    } catch (e) {
      console.error('Launch failed:', e);
      isLaunching = false;
    }
  }

  function skip() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('canopy-onboarding-complete', 'true');
    }
    onboardingStore.complete();
    goto('/app');
  }

  /** Import an existing .canopy/ workspace — detect config and skip to ready */
  async function importWorkspace() {
    if (!isTauri()) {
      // Browser fallback — just jump to workspace step
      step = 3;
      onboardingStore.goToStep(3);
      return;
    }
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, multiple: false, title: 'Import Existing Workspace' });
      if (!selected || typeof selected !== 'string') return;

      // Check if this directory has a .canopy/ subdirectory
      const { invoke } = await import('@tauri-apps/api/core');
      try {
        const workspace = await invoke('scan_canopy_dir', { path: selected }) as {
          name?: string;
          agents?: { id: string; name: string; adapter: string; role: string }[];
        };

        // Populate from detected config
        workspacePath = selected;
        if (workspace.name) workspaceName = workspace.name;

        // Detect adapter from agents
        if (workspace.agents && workspace.agents.length > 0) {
          const detectedAdapter = workspace.agents[0].adapter?.replace(/_/g, '-') as AdapterType;
          if (detectedAdapter) selectedAdapter = detectedAdapter;

          // Build agent templates from detected agents
          const importedAgents: AgentTemplateData[] = workspace.agents.map(a => ({
            id: a.id,
            name: a.name,
            emoji: 'bot',
            role: a.role || 'engineer',
            adapter: a.adapter || 'osa',
            skills: [],
          }));
          onboardingStore.updateData({ agents: importedAgents });
          teamTemplate = 'custom';
        }

        // Jump to ready step
        onboardingStore.updateData({
          displayName,
          workspace: { path: selected, name: workspaceName, description: workspaceDesc },
          adapter: selectedAdapter,
          teamTemplate,
        });
        step = 6;
        onboardingStore.goToStep(6);
      } catch {
        // No .canopy found — use as workspace path and go to normal flow
        workspacePath = selected;
        step = 3;
        onboardingStore.goToStep(3);
      }
    } catch (e) {
      console.warn('Import dialog failed:', e);
    }
  }

  /** Open Tauri folder picker for workspace step */
  async function choosePath() {
    if (!isTauri()) return;
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, multiple: false, title: 'Choose Workspace Directory' });
      if (selected && typeof selected === 'string') {
        workspacePath = selected;
      }
    } catch (e) {
      console.warn('Dialog failed:', e);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function dirBaseName(path: string): string {
    const trimmed = path.replace(/\/$/, '');
    return trimmed.split('/').pop() ?? trimmed;
  }
</script>

<div class="ob-root">
  <!-- Progress dots -->
  <div class="ob-dots">
    {#each { length: 7 } as _, i}
      <button
        class="ob-dot"
        class:ob-dot--active={i === step}
        class:ob-dot--done={i < step}
        onclick={() => { if (i <= step) { step = i; onboardingStore.goToStep(i); } }}
        aria-label="Step {i + 1}"
      ></button>
    {/each}
  </div>

  <!-- Step content card -->
  <div class="ob-card">

    <!-- STEP 0: Welcome -->
    {#if step === 0}
      <div class="ob-step">
        <div class="ob-logo-wrap">
          <video
            class="ob-logo-video"
            src="/MergedAnimationOS.mp4"
            autoplay
            muted
            playsinline
            onended={(e) => { const v = e.currentTarget as HTMLVideoElement; v.src = '/OSLoopingActiveMode.mp4'; v.loop = true; v.play(); }}
          ></video>
        </div>
        <h1 class="ob-title">Welcome to Canopy</h1>
        <p class="ob-subtitle">Your AI agent command center</p>
        <div class="ob-field">
          <label class="ob-label" for="ob-name">YOUR NAME</label>
          <input
            id="ob-name"
            class="ob-input"
            type="text"
            placeholder="e.g. Roberto"
            bind:value={displayName}
          />
        </div>
        <div class="ob-import-section">
          <span class="ob-import-divider"><span class="ob-import-divider-line"></span><span class="ob-import-divider-text">or</span><span class="ob-import-divider-line"></span></span>
          <button class="ob-import-btn" onclick={importWorkspace}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 10v5a2 2 0 002 2h10a2 2 0 002-2v-5"/><path d="M10 3v10M6 7l4-4 4 4"/></svg>
            Import existing workspace
          </button>
          <p class="ob-import-hint">Have a .canopy/ workspace already? Import it and we'll detect your config.</p>
        </div>
      </div>

    <!-- STEP 1: Provider -->
    {:else if step === 1}
      <div class="ob-step">
        <div class="ob-step-icon">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <circle cx="10" cy="10" r="7.5"/>
            <path d="M10 6v4l2.5 2.5"/>
          </svg>
        </div>
        <h1 class="ob-title">Choose a Provider</h1>
        <p class="ob-subtitle">Select where your AI models run</p>

        <div class="ob-providers">
          {#each FEATURED_PROVIDERS as p}
            {@const isSelected = selectedProviderSlug === p.slug}
            <button
              class="ob-provider-card"
              class:ob-provider-card--selected={isSelected}
              onclick={() => selectedProviderSlug = p.slug}
            >
              <div class="ob-provider-header">
                <span class="ob-provider-icon">
                  {#if p.slug === 'anthropic'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M10 3L17 17H3L10 3z"/></svg>
                  {:else if p.slug === 'ollama-cloud' || p.slug === 'ollama-local'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="10" cy="8" r="4"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6"/></svg>
                  {:else if p.slug === 'google'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="10" cy="10" r="7.5"/><path d="M10 10h4.5M10 10a4.5 4.5 0 100-4.5H10v4.5z"/></svg>
                  {:else if p.slug === 'groq'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 10h6M10 7v6"/></svg>
                  {:else if p.slug === 'deepseek'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="10" cy="10" r="3"/><path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.636 5.636l1.414 1.414M12.95 12.95l1.414 1.414M5.636 14.364l1.414-1.414M12.95 7.05l1.414-1.414"/></svg>
                  {:else}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>
                  {/if}
                </span>
                <span class="ob-provider-name">{p.name}</span>
                {#if p.recommended}
                  <span class="ob-badge">Recommended</span>
                {/if}
                {#if p.noKey}
                  <span class="ob-badge ob-badge--accent">No key needed</span>
                {/if}
              </div>
              <p class="ob-provider-desc">{p.description}</p>
              {#if isSelected && !p.noKey}
                <div class="ob-key-wrap" onclick={(e) => e.stopPropagation()} role="none">
                  <input
                    class="ob-input ob-input--key"
                    type="password"
                    placeholder="sk-..."
                    value={providerKeys[p.slug] ?? ''}
                    oninput={(e) => { providerKeys[p.slug] = (e.currentTarget as HTMLInputElement).value; }}
                  />
                </div>
              {/if}
            </button>
          {/each}
        </div>

        <button class="ob-show-more" onclick={() => showMoreProviders = !showMoreProviders}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="transform: rotate({showMoreProviders ? 180 : 0}deg); transition: transform 200ms ease">
            <path d="M4 6l4 4 4-4"/>
          </svg>
          {showMoreProviders ? 'Show fewer' : 'Show more providers'}
        </button>

        {#if showMoreProviders}
          <div class="ob-providers ob-providers--more">
            {#each MORE_PROVIDERS as p}
              {@const isSelected = selectedProviderSlug === p.slug}
              <button
                class="ob-provider-card ob-provider-card--compact"
                class:ob-provider-card--selected={isSelected}
                onclick={() => selectedProviderSlug = p.slug}
              >
                <div class="ob-provider-header">
                  <span class="ob-provider-icon">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="3"/></svg>
                  </span>
                  <span class="ob-provider-name">{p.name}</span>
                </div>
                <p class="ob-provider-desc">{p.description}</p>
                {#if isSelected}
                  <div class="ob-key-wrap" onclick={(e) => e.stopPropagation()} role="none">
                    <input
                      class="ob-input ob-input--key"
                      type="password"
                      placeholder="API key..."
                      value={providerKeys[p.slug] ?? ''}
                      oninput={(e) => { providerKeys[p.slug] = (e.currentTarget as HTMLInputElement).value; }}
                    />
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

    <!-- STEP 2: Adapter -->
    {:else if step === 2}
      <div class="ob-step">
        <div class="ob-step-icon">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/>
            <rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>
          </svg>
        </div>
        <h1 class="ob-title">Execution Adapter</h1>
        <p class="ob-subtitle">How your agents run</p>
        <div class="ob-adapters">
          {#each ADAPTERS as a}
            <button
              class="ob-adapter-card"
              class:ob-adapter-card--selected={selectedAdapter === a.id}
              onclick={() => selectedAdapter = a.id}
            >
              <div class="ob-adapter-header">
                <span class="ob-adapter-icon">
                  {#if a.useLogoImg}
                    <img src="/OSAIconLogo.png" alt="OSA" width="18" height="18" style="border-radius:3px;object-fit:contain;" />
                  {:else if a.id === 'claude-code'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M6 7l-4 3 4 3M14 7l4 3-4 3M12 5l-4 10"/></svg>
                  {:else if a.id === 'codex'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="5" width="14" height="10" rx="2"/><path d="M7 9l2 2-2 2M11 13h2"/></svg>
                  {:else if a.id === 'openclaw'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M6 6l4-3 4 3M6 14l4 3 4-3M3 10h14M10 3v14"/><circle cx="10" cy="10" r="2"/></svg>
                  {:else if a.id === 'jidoclaw'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M10 3l7 4v6l-7 4-7-4V7z"/></svg>
                  {:else if a.id === 'hermes'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M3 10h3l2-4 2 8 2-6 2 2h3"/></svg>
                  {:else if a.id === 'bash'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M6 8l3 2-3 2M11 12h3"/></svg>
                  {:else if a.id === 'http'}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="10" cy="10" r="7.5"/><path d="M10 2.5c0 0-3.5 3.5-3.5 7.5s3.5 7.5 3.5 7.5M10 2.5c0 0 3.5 3.5 3.5 7.5S10 17.5 10 17.5M2.5 10h15"/></svg>
                  {:else}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="10" cy="10" r="7.5"/></svg>
                  {/if}
                </span>
                <span class="ob-adapter-name">{a.name}</span>
                {#if a.recommended}
                  <span class="ob-badge ob-badge--accent">Recommended</span>
                {/if}
              </div>
              <p class="ob-adapter-desc">{a.description}</p>
            </button>
        {/each}
      </div>
    </div>

  <!-- STEP 3: Workspace -->
  {:else if step === 3}
    <div class="ob-step">
      <div class="ob-step-icon">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
          <path d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.707 6.7A1 1 0 0011.414 7H15a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
        </svg>
      </div>
      <h1 class="ob-title">Workspace</h1>
      <p class="ob-subtitle">Where your agents live</p>

      <div class="ob-field">
        <label class="ob-label" for="ob-path">DIRECTORY PATH</label>
        <div class="ob-path-row">
          <input
            id="ob-path"
            class="ob-input ob-input--path"
            type="text"
            placeholder="~/.canopy"
            bind:value={workspacePath}
          />
          <button class="ob-btn ob-btn--secondary ob-btn--sm" onclick={choosePath}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M2 4a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/></svg>
            Choose
          </button>
        </div>
      </div>

      <div class="ob-field">
        <label class="ob-label" for="ob-ws-name">WORKSPACE NAME</label>
        <input
          id="ob-ws-name"
          class="ob-input"
          type="text"
          placeholder="My Workspace"
          bind:value={workspaceName}
        />
      </div>

      <div class="ob-field">
        <label class="ob-label" for="ob-ws-desc">DESCRIPTION (OPTIONAL)</label>
        <input
          id="ob-ws-desc"
          class="ob-input"
          type="text"
          placeholder="What this workspace is for..."
          bind:value={workspaceDesc}
        />
      </div>

      <div class="ob-tree-wrap">
        <p class="ob-label">WILL CREATE</p>
        <pre class="ob-tree">{dirBaseName(workspacePath) || '.canopy'}/
├── .canopy/
│   ├── workspace.json
│   ├── agents/
│   │   └── (agent configs)
│   ├── sessions/
│   └── logs/</pre>
      </div>
    </div>

  <!-- STEP 4: Team Template -->
  {:else if step === 4}
    <div class="ob-step">
      <div class="ob-step-icon">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
          <circle cx="7" cy="7" r="3"/>
          <circle cx="13" cy="7" r="3"/>
          <path d="M1 17c0-3.314 2.686-6 6-6M13 11c3.314 0 6 2.686 6 6"/>
          <path d="M7 11c3.314 0 6 2.686 6 6H1c0-3.314 2.686-6 6-6z"/>
        </svg>
      </div>
      <h1 class="ob-title">Team Template</h1>
      <p class="ob-subtitle">Bootstrap your agent roster</p>

      <div class="ob-templates">
        {#each TEAM_TEMPLATES as t}
          <button
            class="ob-template-card"
            class:ob-template-card--selected={teamTemplate === t.id}
            onclick={() => teamTemplate = t.id}
          >
            <div class="ob-template-header">
              <span class="ob-template-name">{t.name}</span>
              <span class="ob-template-count">
                {t.count === 0 ? 'Empty' : t.count === 1 ? '1 agent' : `${t.count} agents`}
              </span>
            </div>
            <p class="ob-template-desc">{t.description}</p>
          </button>
        {/each}
      </div>

      {#if teamAgents.length > 0}
        <div class="ob-agent-preview">
          <p class="ob-label">AGENTS IN THIS TEMPLATE</p>
          <ul class="ob-agent-list">
            {#each teamAgents as agent}
              <li class="ob-agent-item">
                <span class="ob-agent-dot"></span>
                <span class="ob-agent-name">{agent.name}</span>
                <span class="ob-agent-role">{agent.role}</span>
                <span class="ob-agent-skills">{agent.skills.join(', ')}</span>
              </li>
            {/each}
          </ul>
        </div>
      {:else}
        <div class="ob-agent-preview ob-agent-preview--empty">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M10 5v10M5 10h10"/></svg>
          <p>You'll add agents after launch</p>
        </div>
      {/if}
    </div>

  <!-- STEP 5: MIOSA Cloud -->
  {:else if step === 5}
    <div class="ob-step">
      <div class="ob-step-icon">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
          <path d="M5 10a5 5 0 0110 0"/>
          <path d="M3 14a7 7 0 0114 0"/>
          <circle cx="10" cy="17" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      </div>
      <h1 class="ob-title">MIOSA Cloud</h1>
      <p class="ob-subtitle">Sandboxed compute for your agents</p>

      <div class="ob-cloud-card">
        <div class="ob-cloud-body">
          <div class="ob-cloud-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
              <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/>
              <path d="M12 22V12M21 7l-9 5M3 7l9 5"/>
            </svg>
          </div>
          <div class="ob-cloud-text">
            <h3 class="ob-cloud-title">Firecracker microVM Sandboxing</h3>
            <p class="ob-cloud-desc">Each agent task runs in an isolated Firecracker microVM — sub-second startup, full Linux, zero host access. Safe computer use, file operations, and code execution without risk.</p>
            <ul class="ob-cloud-features">
              <li>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M3 8l3 3 7-7"/></svg>
                Isolated microVM per task
              </li>
              <li>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M3 8l3 3 7-7"/></svg>
                125ms cold start
              </li>
              <li>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M3 8l3 3 7-7"/></svg>
                Safe computer use &amp; file ops
              </li>
              <li>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M3 8l3 3 7-7"/></svg>
                Pay-per-second billing
              </li>
            </ul>
          </div>
        </div>

        <div class="ob-toggle-row">
          <div class="ob-toggle-info">
            <span class="ob-toggle-label">Enable MIOSA Cloud sandboxing</span>
            <span class="ob-toggle-hint">Can be changed later in Settings</span>
          </div>
          <button
            class="ob-toggle"
            class:ob-toggle--on={miosaCloud}
            onclick={() => miosaCloud = !miosaCloud}
            role="switch"
            aria-checked={miosaCloud}
            aria-label="Enable MIOSA Cloud sandboxing"
          >
            <span class="ob-toggle-thumb"></span>
          </button>
        </div>
      </div>
    </div>

  <!-- STEP 6: Ready -->
  {:else if step === 6}
    <div class="ob-step">
      <div class="ob-step-icon ob-step-icon--ready">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
          <path d="M4 10l4 4 8-8"/>
        </svg>
      </div>
      <h1 class="ob-title">Ready to Launch</h1>
      <p class="ob-subtitle">Here's your configuration</p>

      <div class="ob-summary">
        <div class="ob-summary-row">
          <span class="ob-summary-key">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="8" cy="6" r="3"/><path d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5"/></svg>
            Name
          </span>
          <span class="ob-summary-val">{displayName || 'Not set'}</span>
        </div>
        <div class="ob-summary-row">
          <span class="ob-summary-key">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M8 2l6 12H2L8 2z"/></svg>
            Provider
          </span>
          <span class="ob-summary-val">
            {#if currentProvider}
              {currentProvider.name}
              {#if currentProvider.noKey}<span class="ob-badge">No key</span>{/if}
            {:else}
              <span class="ob-summary-empty">None selected</span>
            {/if}
          </span>
        </div>
        <div class="ob-summary-row">
          <span class="ob-summary-key">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="2" y="2" width="5" height="5" rx="0.5"/><rect x="9" y="2" width="5" height="5" rx="0.5"/><rect x="2" y="9" width="5" height="5" rx="0.5"/><rect x="9" y="9" width="5" height="5" rx="0.5"/></svg>
            Adapter
          </span>
          <span class="ob-summary-val">{ADAPTERS.find(a => a.id === selectedAdapter)?.name ?? selectedAdapter}</span>
        </div>
        <div class="ob-summary-row">
          <span class="ob-summary-key">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M2 4a1 1 0 011-1h2.5L7 4.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/></svg>
            Workspace
          </span>
          <span class="ob-summary-val ob-summary-val--mono">{workspacePath}</span>
        </div>
        <div class="ob-summary-row">
          <span class="ob-summary-key">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="5" cy="5" r="2.5"/><circle cx="11" cy="5" r="2.5"/><path d="M1 13c0-2.209 1.791-4 4-4M11 9c2.209 0 4 1.791 4 4"/><path d="M5 9c2.209 0 4 1.791 4 4H1c0-2.209 1.791-4 4-4z"/></svg>
            Team
          </span>
          <span class="ob-summary-val">
            {TEAM_TEMPLATES.find(t => t.id === teamTemplate)?.name ?? teamTemplate}
            <span class="ob-summary-count">
              {teamAgents.length === 0 ? '(empty)' : teamAgents.length === 1 ? '(1 agent)' : `(${teamAgents.length} agents)`}
            </span>
          </span>
        </div>
        <div class="ob-summary-row">
          <span class="ob-summary-key">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M8 1l7 4v6l-7 4-7-4V5l7-4z"/></svg>
            MIOSA Cloud
          </span>
          <span class="ob-summary-val">
            {#if miosaCloud}
              <span class="ob-summary-on">Enabled</span>
            {:else}
              <span class="ob-summary-off">Disabled</span>
            {/if}
          </span>
        </div>
      </div>

      <button
        class="ob-btn ob-btn--launch"
        onclick={launch}
        disabled={isLaunching}
        aria-label="Launch Canopy"
      >
        {#if isLaunching}
          <svg class="ob-spinner" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><circle cx="10" cy="10" r="7" stroke-dasharray="22 22" stroke-dashoffset="0"/></svg>
          Launching...
        {:else}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M10 3l7 4v6l-7 4-7-4V7l7-4z"/><path d="M10 7v6M7 9l3-2 3 2"/></svg>
          Launch Canopy
        {/if}
      </button>

      <button class="ob-skip-link" onclick={skip}>
        Skip setup and launch with defaults
      </button>
    </div>
  {/if}

  </div>

  <!-- Navigation -->
  {#if step < 6}
    <div class="ob-nav" class:ob-nav--center={step === 0}>
      {#if step > 0}
        <button
          class="ob-btn ob-btn--secondary"
          onclick={prev}
          aria-label="Go back"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M10 4L6 8l4 4"/></svg>
          Back
        </button>
      {/if}
      <button
        class="ob-btn ob-btn--primary"
        onclick={next}
        disabled={!canContinue()}
        aria-label="Continue to next step"
      >
        {step === 0 ? 'Get Started' : 'Continue'}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 4l4 4-4 4"/></svg>
      </button>
    </div>
  {:else}
    <div class="ob-nav ob-nav--center">
      <button
        class="ob-btn ob-btn--secondary"
        onclick={prev}
        aria-label="Go back"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M10 4L6 8l4 4"/></svg>
        Back
      </button>
    </div>
  {/if}
</div>

<style>
  /* ─── Root & layout ─────────────────────────────────────────────────── */

  .ob-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background: #0a0a0a;
    color: #f0f0f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }

  /* ─── Progress dots ──────────────────────────────────────────────────── */

  .ob-dots {
    display: flex;
    gap: 6px;
    margin-bottom: 1.5rem;
  }

  .ob-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    padding: 0;
    cursor: pointer;
    transition: background 200ms ease, transform 200ms ease;
  }

  .ob-dot--active {
    background: #3b82f6;
    transform: scale(1.3);
  }

  .ob-dot--done {
    background: rgba(59, 130, 246, 0.45);
  }

  /* ─── Card ───────────────────────────────────────────────────────────── */

  .ob-card {
    width: 100%;
    max-width: 560px;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    padding: 2rem;
    min-height: 340px;
    display: flex;
    flex-direction: column;
  }

  /* ─── Step containers ────────────────────────────────────────────────── */

  .ob-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1;
    gap: 0;
  }

  .ob-step--scroll {
    max-height: 60vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.12) transparent;
    align-items: stretch;
    text-align: left;
  }

  .ob-step--scroll::-webkit-scrollbar {
    width: 4px;
  }

  .ob-step--scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .ob-step--scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.12);
    border-radius: 2px;
  }

  /* ─── Logo video (transparent background, no white flash) ───────────── */

  .ob-logo-wrap {
    width: 140px;
    height: 140px;
    margin: 0 auto 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 28px;
    overflow: hidden;
  }

  .ob-logo-video {
    width: 140px;
    height: 140px;
    object-fit: contain;
    mix-blend-mode: lighten;
  }

  /* ─── Import Workspace (Step 0) ──────────────────────────────────────── */

  .ob-import-section {
    width: 100%;
    max-width: 320px;
    margin-top: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .ob-import-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    margin-bottom: 0.25rem;
  }

  .ob-import-divider-line {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
  }

  .ob-import-divider-text {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ob-import-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .ob-import-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .ob-import-hint {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.25);
    text-align: center;
    margin: 0;
    line-height: 1.4;
  }

  /* ─── Typography ─────────────────────────────────────────────────────── */

  .ob-title {
    font-size: 1.625rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 0.375rem;
    letter-spacing: -0.02em;
  }

  .ob-subtitle {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.45);
    margin: 0 0 1.75rem;
  }

  .ob-label {
    display: block;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.35);
    margin-bottom: 0.375rem;
    text-align: left;
  }

  /* ─── Step icon ──────────────────────────────────────────────────────── */

  .ob-step-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 auto 1.25rem;
  }

  .ob-step-icon--ready {
    background: rgba(59, 130, 246, 0.12);
    border-color: rgba(59, 130, 246, 0.3);
    color: #3b82f6;
  }

  /* ─── Form fields ────────────────────────────────────────────────────── */

  .ob-field {
    width: 100%;
    text-align: left;
    margin-bottom: 1rem;
  }

  .ob-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.625rem 0.875rem;
    font-size: 0.9375rem;
    color: #f0f0f0;
    outline: none;
    transition: border-color 150ms ease;
    box-sizing: border-box;
  }

  .ob-input::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }

  .ob-input:focus {
    border-color: rgba(59, 130, 246, 0.5);
  }

  .ob-input--key {
    margin-top: 0.625rem;
    font-size: 0.875rem;
  }

  .ob-input--path {
    flex: 1;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.8125rem;
  }

  .ob-path-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .ob-key-wrap {
    width: 100%;
    padding-top: 0.25rem;
  }

  /* ─── Provider grid ──────────────────────────────────────────────────── */

  .ob-providers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    width: 100%;
    margin-bottom: 0.75rem;
  }

  .ob-providers--more {
    grid-template-columns: 1fr 1fr 1fr;
    margin-top: 0.5rem;
  }

  .ob-provider-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    padding: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .ob-provider-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .ob-provider-card--selected {
    background: rgba(59, 130, 246, 0.07);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .ob-provider-card--compact {
    padding: 0.5rem 0.625rem;
  }

  .ob-provider-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .ob-provider-icon {
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .ob-provider-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #e0e0e0;
    flex: 1;
  }

  .ob-provider-desc {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.35);
    margin: 0;
    line-height: 1.4;
  }

  /* ─── Show more button ───────────────────────────────────────────────── */

  .ob-show-more {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0.375rem 0;
    transition: color 150ms ease;
    align-self: flex-start;
  }

  .ob-show-more:hover {
    color: rgba(255, 255, 255, 0.7);
  }

  /* ─── Adapter grid ───────────────────────────────────────────────────── */

  .ob-adapters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    width: 100%;
  }

  .ob-adapter-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    padding: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .ob-adapter-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .ob-adapter-card--selected {
    background: rgba(59, 130, 246, 0.07);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .ob-adapter-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ob-adapter-icon {
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .ob-adapter-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #e0e0e0;
    flex: 1;
  }

  .ob-adapter-desc {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.35);
    margin: 0;
    line-height: 1.4;
  }

  /* ─── Badge ──────────────────────────────────────────────────────────── */

  .ob-badge {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 1px 6px;
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    white-space: nowrap;
  }

  .ob-badge--accent {
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.25);
  }

  /* ─── Workspace tree ─────────────────────────────────────────────────── */

  .ob-tree-wrap {
    width: 100%;
    margin-top: 0.25rem;
  }

  .ob-tree {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: 0.875rem 1rem;
    font-size: 0.75rem;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    color: rgba(255, 255, 255, 0.45);
    margin: 0.375rem 0 0;
    line-height: 1.7;
    white-space: pre;
    overflow-x: auto;
  }

  /* ─── Team templates ─────────────────────────────────────────────────── */

  .ob-templates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    width: 100%;
    margin-bottom: 1.25rem;
  }

  .ob-template-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    padding: 0.875rem 1rem;
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;
  }

  .ob-template-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .ob-template-card--selected {
    background: rgba(59, 130, 246, 0.07);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .ob-template-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .ob-template-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #e0e0e0;
  }

  .ob-template-count {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.35);
  }

  .ob-template-desc {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }

  /* ─── Agent preview ──────────────────────────────────────────────────── */

  .ob-agent-preview {
    width: 100%;
    text-align: left;
  }

  .ob-agent-preview--empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.25rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.8125rem;
    gap: 0.5rem;
  }

  .ob-agent-list {
    list-style: none;
    padding: 0;
    margin: 0.375rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .ob-agent-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 7px;
    padding: 0.5rem 0.75rem;
  }

  .ob-agent-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3b82f6;
    flex-shrink: 0;
  }

  .ob-agent-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #d0d0d0;
    min-width: 110px;
  }

  .ob-agent-role {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.35);
    min-width: 80px;
  }

  .ob-agent-skills {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.25);
    font-family: 'SF Mono', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ─── MIOSA Cloud card ───────────────────────────────────────────────── */

  .ob-cloud-card {
    width: 100%;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    overflow: hidden;
  }

  .ob-cloud-body {
    display: flex;
    gap: 1rem;
    padding: 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .ob-cloud-icon {
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 2px;
  }

  .ob-cloud-text {
    flex: 1;
    text-align: left;
  }

  .ob-cloud-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #e0e0e0;
    margin: 0 0 0.5rem;
  }

  .ob-cloud-desc {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.45);
    margin: 0 0 0.875rem;
    line-height: 1.6;
  }

  .ob-cloud-features {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .ob-cloud-features li {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .ob-cloud-features li svg {
    color: #3b82f6;
    flex-shrink: 0;
  }

  .ob-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
  }

  .ob-toggle-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ob-toggle-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #d0d0d0;
  }

  .ob-toggle-hint {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.3);
  }

  /* ─── Toggle switch ──────────────────────────────────────────────────── */

  .ob-toggle {
    position: relative;
    width: 44px;
    height: 24px;
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;
    transition: background 200ms ease, border-color 200ms ease;
    flex-shrink: 0;
  }

  .ob-toggle--on {
    background: #3b82f6;
    border-color: rgba(59, 130, 246, 0.6);
  }

  .ob-toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transition: transform 200ms ease, background 200ms ease;
    pointer-events: none;
  }

  .ob-toggle--on .ob-toggle-thumb {
    transform: translateX(20px);
    background: #ffffff;
  }

  /* ─── Summary (step 6) ───────────────────────────────────────────────── */

  .ob-summary {
    width: 100%;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .ob-summary-row {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .ob-summary-row:last-child {
    border-bottom: none;
  }

  .ob-summary-key {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.35);
    min-width: 100px;
    flex-shrink: 0;
  }

  .ob-summary-val {
    font-size: 0.8125rem;
    color: #d0d0d0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .ob-summary-val--mono {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.55);
  }

  .ob-summary-count {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .ob-summary-empty {
    color: rgba(255, 255, 255, 0.25);
    font-style: italic;
  }

  .ob-summary-on {
    color: #3b82f6;
    font-size: 0.75rem;
  }

  .ob-summary-off {
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.75rem;
  }

  /* ─── Navigation ─────────────────────────────────────────────────────── */

  .ob-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 560px;
    margin-top: 1rem;
  }

  .ob-nav--center {
    justify-content: center;
  }

  /* ─── Buttons ────────────────────────────────────────────────────────── */

  .ob-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    padding: 0.625rem 1.25rem;
    transition: background 150ms ease, opacity 150ms ease, transform 150ms ease, box-shadow 150ms ease;
  }

  .ob-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .ob-btn--primary {
    background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow:
      0 1px 0 0 rgba(255, 255, 255, 0.1) inset,
      0 4px 16px 0 rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
  }

  .ob-btn--primary::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%);
    border-radius: inherit;
    pointer-events: none;
  }

  .ob-btn--primary:not(:disabled):hover {
    transform: translateY(-1px);
    background: linear-gradient(180deg, #2a2a2a 0%, #0a0a0a 100%);
    box-shadow:
      0 1px 0 0 rgba(255, 255, 255, 0.15) inset,
      0 6px 24px 0 rgba(0, 0, 0, 0.4);
  }

  .ob-btn--secondary {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: #a1a1a6;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.04) inset;
  }

  .ob-btn--secondary:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .ob-btn--sm {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    flex-shrink: 0;
  }

  .ob-btn--launch {
    width: 100%;
    justify-content: center;
    padding: 0.875rem;
    font-size: 1rem;
    font-weight: 600;
    background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    letter-spacing: -0.01em;
    box-shadow:
      0 1px 0 0 rgba(255, 255, 255, 0.1) inset,
      0 4px 16px 0 rgba(0, 0, 0, 0.3),
      0 8px 24px 0 rgba(0, 0, 0, 0.15);
    position: relative;
    overflow: hidden;
  }

  .ob-btn--launch::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 100%);
    border-radius: inherit;
    pointer-events: none;
  }

  .ob-btn--launch:not(:disabled):hover {
    transform: translateY(-2px);
    background: linear-gradient(180deg, #2a2a2a 0%, #0a0a0a 100%);
    box-shadow:
      0 1px 0 0 rgba(255, 255, 255, 0.15) inset,
      0 6px 24px 0 rgba(0, 0, 0, 0.4),
      0 12px 32px 0 rgba(0, 0, 0, 0.2);
  }

  /* ─── Skip link ──────────────────────────────────────────────────────── */

  .ob-skip-link {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.5rem 0 0;
    transition: color 150ms ease;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .ob-skip-link:hover {
    color: rgba(255, 255, 255, 0.5);
  }

  /* ─── Launch spinner ─────────────────────────────────────────────────── */

  @keyframes ob-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .ob-spinner {
    animation: ob-spin 800ms linear infinite;
    opacity: 0.7;
  }
</style>
