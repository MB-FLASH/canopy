<!-- src/routes/app/settings/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { themeStore, type ThemeMode } from '$lib/stores/theme.svelte';
  import { toastStore } from '$lib/stores/toasts.svelte';
  import { clearCache } from '$api/client';

  type TabId = 'general' | 'appearance' | 'agents' | 'budget' | 'notifications' | 'integrations' | 'advanced';

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general',       label: 'General' },
    { id: 'appearance',    label: 'Appearance' },
    { id: 'agents',        label: 'Agents' },
    { id: 'budget',        label: 'Budget' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'integrations',  label: 'Integrations' },
    { id: 'advanced',      label: 'Advanced' },
  ];

  let activeTab = $state<TabId>('general');

  const ADAPTER_OPTIONS: { value: string; label: string }[] = [
    { value: 'osa',         label: 'OSA (default)' },
    { value: 'claude_code', label: 'Claude Code' },
    { value: 'codex',       label: 'Codex' },
    { value: 'openclaw',    label: 'OpenClaw' },
    { value: 'jidoclaw',    label: 'JidoClaw' },
    { value: 'hermes',      label: 'Hermes' },
    { value: 'bash',        label: 'Bash' },
    { value: 'http',        label: 'HTTP' },
    { value: 'custom',      label: 'Custom' },
  ];

  const THEMES: { id: ThemeMode; label: string; bg: string; accent: string; surface: string }[] = [
    { id: 'dark',   label: 'Dark',   bg: '#0a0a0a',              accent: '#3b82f6', surface: '#1a1a1a' },
    { id: 'glass',  label: 'Glass',  bg: 'rgba(10,10,14,0.6)',   accent: '#8b5cf6', surface: 'rgba(255,255,255,0.06)' },
    { id: 'color',  label: 'Color',  bg: '#050510',              accent: '#3b82f6', surface: 'rgba(59,130,246,0.08)' },
    { id: 'light',  label: 'Light',  bg: '#fafafa',              accent: '#3b82f6', surface: '#ffffff' },
    { id: 'system', label: 'System', bg: 'linear-gradient(135deg,#0a0a0a 50%,#fafafa 50%)', accent: '#3b82f6', surface: '#888' },
  ];

  // Budget helpers — store values as dollars in the UI, convert to cents for the store
  let dailyLimitDollars = $state(50);
  let monthlyLimitDollars = $state(500);
  let warningThreshold = $state(80); // percent
  let hardStop = $state(true);

  // Notification type flags
  let notifyBudget = $state(true);
  let notifyAgentError = $state(true);
  let notifyHeartbeat = $state(false);
  let notifyInbox = $state(true);

  // Default system prompt (agents tab)
  let defaultSystemPrompt = $state('');

  onMount(() => {
    void settingsStore.fetch();
  });

  async function handleSave() {
    await settingsStore.save();
    if (!settingsStore.error) {
      toastStore.success('Settings saved');
    } else {
      toastStore.error('Failed to save settings', settingsStore.error);
    }
  }

  function handleThemeSelect(mode: ThemeMode) {
    themeStore.setMode(mode);
    settingsStore.update('theme', mode);
  }

  function handleClearCache() {
    clearCache();
    toastStore.success('Cache cleared');
  }

  function handleResetDefaults() {
    settingsStore.update('theme', 'dark');
    settingsStore.update('font_size', 14);
    settingsStore.update('sidebar_default_collapsed', false);
    settingsStore.update('notifications_enabled', true);
    settingsStore.update('auto_approve_budget_under_cents', 500);
    settingsStore.update('default_adapter', 'osa');
    settingsStore.update('default_model', 'claude-sonnet-4-6');
    settingsStore.update('working_directory', '');
    themeStore.setMode('dark');
    toastStore.info('Settings reset to defaults');
  }

  function handleExportConfig() {
    const blob = new Blob([JSON.stringify(settingsStore.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canopy-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    toastStore.success('Settings exported');
  }

  function handleImportConfig(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        // Apply each known key
        const keys = Object.keys(settingsStore.data) as (keyof typeof settingsStore.data)[];
        for (const key of keys) {
          if (key in parsed) {
            settingsStore.update(key, (parsed as typeof settingsStore.data)[key]);
          }
        }
        toastStore.success('Settings imported');
      } catch {
        toastStore.error('Import failed', 'Invalid settings file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
</script>

<PageShell title="Settings" subtitle={settingsStore.dirty ? 'Unsaved changes' : undefined}>
  <div class="stg-layout">

    <!-- Left tab nav -->
    <nav class="stg-tabs" aria-label="Settings sections">
      {#each tabs as tab (tab.id)}
        <button
          class="stg-tab"
          class:stg-tab--active={activeTab === tab.id}
          onclick={() => { activeTab = tab.id; }}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          {tab.label}
        </button>
      {/each}
    </nav>

    <!-- Right content panel -->
    <div class="stg-panel">

      <!-- ── GENERAL ───────────────────────────────────────────────────────── -->
      {#if activeTab === 'general'}
        <section class="stg-section">
          <h2 class="stg-section-title">General</h2>

          <div class="stg-card">
            <div class="stg-field">
              <label class="stg-label" for="working-dir">Working Directory</label>
              <p class="stg-desc">Default workspace path for agent file operations.</p>
              <input
                id="working-dir"
                class="stg-input"
                type="text"
                placeholder="/Users/you/projects"
                value={settingsStore.data.working_directory}
                oninput={(e) => settingsStore.update('working_directory', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <label class="stg-label" for="default-adapter">Default Adapter</label>
              <p class="stg-desc">The execution adapter used when spawning new agents.</p>
              <select
                id="default-adapter"
                class="stg-select"
                value={settingsStore.data.default_adapter}
                onchange={(e) => settingsStore.update('default_adapter', (e.target as HTMLSelectElement).value as typeof settingsStore.data.default_adapter)}
              >
                {#each ADAPTER_OPTIONS as opt (opt.value)}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <label class="stg-label" for="default-model">Default Model</label>
              <p class="stg-desc">Model identifier used for new sessions (e.g. claude-sonnet-4-6).</p>
              <input
                id="default-model"
                class="stg-input"
                type="text"
                placeholder="claude-sonnet-4-6"
                value={settingsStore.data.default_model}
                oninput={(e) => settingsStore.update('default_model', (e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
        </section>

      <!-- ── APPEARANCE ────────────────────────────────────────────────────── -->
      {:else if activeTab === 'appearance'}
        <section class="stg-section">
          <h2 class="stg-section-title">Appearance</h2>

          <div class="stg-card">
            <div class="stg-field">
              <span class="stg-label">Theme</span>
              <p class="stg-desc">Choose your interface theme.</p>
              <div class="stg-theme-grid" role="radiogroup" aria-label="Theme selection">
                {#each THEMES as theme (theme.id)}
                  {@const isActive = themeStore.mode === theme.id}
                  <button
                    class="stg-theme-card"
                    class:stg-theme-card--active={isActive}
                    onclick={() => handleThemeSelect(theme.id)}
                    role="radio"
                    aria-checked={isActive}
                    aria-label="{theme.label} theme"
                  >
                    <div
                      class="stg-theme-swatch"
                      style="background: {theme.bg};"
                    >
                      <div class="stg-theme-swatch-inner" style="background: {theme.surface}; border-color: {theme.accent}33;"></div>
                      <div class="stg-theme-dot" style="background: {theme.accent};"></div>
                    </div>
                    <span class="stg-theme-name">{theme.label}</span>
                  </button>
                {/each}
              </div>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <label class="stg-label" for="font-size">
                Font Size
                <span class="stg-value-badge">{settingsStore.data.font_size}px</span>
              </label>
              <p class="stg-desc">Base font size for the interface (12–20px).</p>
              <input
                id="font-size"
                class="stg-slider"
                type="range"
                min="12"
                max="20"
                step="1"
                value={settingsStore.data.font_size}
                oninput={(e) => settingsStore.update('font_size', Number((e.target as HTMLInputElement).value))}
              />
              <div class="stg-slider-labels">
                <span>12px</span>
                <span>20px</span>
              </div>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field stg-field--row">
              <div class="stg-field-text">
                <label class="stg-label" for="sidebar-collapsed">Sidebar Collapsed by Default</label>
                <p class="stg-desc">Start with the sidebar in collapsed state on launch.</p>
              </div>
              <label class="stg-toggle" aria-label="Sidebar collapsed by default">
                <input
                  id="sidebar-collapsed"
                  type="checkbox"
                  checked={settingsStore.data.sidebar_default_collapsed}
                  onchange={(e) => settingsStore.update('sidebar_default_collapsed', (e.target as HTMLInputElement).checked)}
                />
                <span class="stg-toggle-track">
                  <span class="stg-toggle-thumb"></span>
                </span>
              </label>
            </div>
          </div>
        </section>

      <!-- ── AGENTS ────────────────────────────────────────────────────────── -->
      {:else if activeTab === 'agents'}
        <section class="stg-section">
          <h2 class="stg-section-title">Agents</h2>

          <div class="stg-card">
            <div class="stg-field">
              <label class="stg-label" for="auto-approve">Auto-Approve Budget Threshold</label>
              <p class="stg-desc">Automatically approve agent actions that cost less than this amount (in cents).</p>
              <div class="stg-input-group">
                <span class="stg-input-prefix">¢</span>
                <input
                  id="auto-approve"
                  class="stg-input stg-input--prefixed"
                  type="number"
                  min="0"
                  max="10000"
                  step="50"
                  value={settingsStore.data.auto_approve_budget_under_cents}
                  oninput={(e) => settingsStore.update('auto_approve_budget_under_cents', Number((e.target as HTMLInputElement).value))}
                />
              </div>
              <p class="stg-hint">Currently set to {(settingsStore.data.auto_approve_budget_under_cents / 100).toFixed(2)} USD per action.</p>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <label class="stg-label" for="default-system-prompt">Default System Prompt</label>
              <p class="stg-desc">Injected into every new agent session unless overridden by the agent's own prompt.</p>
              <textarea
                id="default-system-prompt"
                class="stg-textarea"
                rows="6"
                placeholder="You are a helpful OSA agent..."
                bind:value={defaultSystemPrompt}
              ></textarea>
            </div>
          </div>
        </section>

      <!-- ── BUDGET ────────────────────────────────────────────────────────── -->
      {:else if activeTab === 'budget'}
        <section class="stg-section">
          <h2 class="stg-section-title">Budget</h2>

          <div class="stg-card">
            <div class="stg-field">
              <label class="stg-label" for="daily-limit">Daily Limit (USD)</label>
              <p class="stg-desc">Hard ceiling on spend per calendar day across all agents.</p>
              <div class="stg-input-group">
                <span class="stg-input-prefix">$</span>
                <input
                  id="daily-limit"
                  class="stg-input stg-input--prefixed"
                  type="number"
                  min="0"
                  step="1"
                  bind:value={dailyLimitDollars}
                />
              </div>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <label class="stg-label" for="monthly-limit">Monthly Limit (USD)</label>
              <p class="stg-desc">Hard ceiling on spend per calendar month across all agents.</p>
              <div class="stg-input-group">
                <span class="stg-input-prefix">$</span>
                <input
                  id="monthly-limit"
                  class="stg-input stg-input--prefixed"
                  type="number"
                  min="0"
                  step="10"
                  bind:value={monthlyLimitDollars}
                />
              </div>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <label class="stg-label" for="warning-threshold">
                Warning Threshold
                <span class="stg-value-badge">{warningThreshold}%</span>
              </label>
              <p class="stg-desc">Trigger a budget warning when this percentage of the daily limit is consumed.</p>
              <input
                id="warning-threshold"
                class="stg-slider"
                type="range"
                min="10"
                max="95"
                step="5"
                bind:value={warningThreshold}
              />
              <div class="stg-slider-labels">
                <span>10%</span>
                <span>95%</span>
              </div>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field stg-field--row">
              <div class="stg-field-text">
                <label class="stg-label" for="hard-stop">Hard Stop on Limit</label>
                <p class="stg-desc">Immediately terminate agent runs when the daily limit is hit. Disable to allow overruns with warnings only.</p>
              </div>
              <label class="stg-toggle" aria-label="Hard stop on budget limit">
                <input
                  id="hard-stop"
                  type="checkbox"
                  bind:checked={hardStop}
                />
                <span class="stg-toggle-track">
                  <span class="stg-toggle-thumb"></span>
                </span>
              </label>
            </div>
          </div>
        </section>

      <!-- ── NOTIFICATIONS ─────────────────────────────────────────────────── -->
      {:else if activeTab === 'notifications'}
        <section class="stg-section">
          <h2 class="stg-section-title">Notifications</h2>

          <div class="stg-card">
            <div class="stg-field stg-field--row">
              <div class="stg-field-text">
                <label class="stg-label" for="notifications-enabled">Enable Notifications</label>
                <p class="stg-desc">Show desktop notifications for agent events and system alerts.</p>
              </div>
              <label class="stg-toggle" aria-label="Enable notifications">
                <input
                  id="notifications-enabled"
                  type="checkbox"
                  checked={settingsStore.data.notifications_enabled}
                  onchange={(e) => settingsStore.update('notifications_enabled', (e.target as HTMLInputElement).checked)}
                />
                <span class="stg-toggle-track">
                  <span class="stg-toggle-thumb"></span>
                </span>
              </label>
            </div>
          </div>

          {#if settingsStore.data.notifications_enabled}
            <div class="stg-card stg-card--mt">
              <p class="stg-card-header">Notification Types</p>

              <div class="stg-check-list">
                <label class="stg-check-row">
                  <input type="checkbox" class="stg-checkbox" bind:checked={notifyBudget} />
                  <div class="stg-check-text">
                    <span class="stg-check-label">Budget warnings</span>
                    <span class="stg-check-desc">Alert when nearing or exceeding spend limits.</span>
                  </div>
                </label>

                <label class="stg-check-row">
                  <input type="checkbox" class="stg-checkbox" bind:checked={notifyAgentError} />
                  <div class="stg-check-text">
                    <span class="stg-check-label">Agent errors</span>
                    <span class="stg-check-desc">Notify when an agent fails or enters error state.</span>
                  </div>
                </label>

                <label class="stg-check-row">
                  <input type="checkbox" class="stg-checkbox" bind:checked={notifyHeartbeat} />
                  <div class="stg-check-text">
                    <span class="stg-check-label">Heartbeat completions</span>
                    <span class="stg-check-desc">Notify on each scheduled heartbeat run completion.</span>
                  </div>
                </label>

                <label class="stg-check-row">
                  <input type="checkbox" class="stg-checkbox" bind:checked={notifyInbox} />
                  <div class="stg-check-text">
                    <span class="stg-check-label">Inbox approvals</span>
                    <span class="stg-check-desc">Notify when an agent requests human approval.</span>
                  </div>
                </label>
              </div>
            </div>
          {/if}
        </section>

      <!-- ── INTEGRATIONS ──────────────────────────────────────────────────── -->
      {:else if activeTab === 'integrations'}
        <section class="stg-section">
          <h2 class="stg-section-title">Integrations</h2>
          <p class="stg-section-desc">Connect external services to extend agent capabilities.</p>

          <div class="stg-integration-list">
            {#each [
              { name: 'GitHub', desc: 'Push commits, open PRs, manage issues.', status: 'disconnected', icon: '⬡' },
              { name: 'Linear', desc: 'Sync issues and projects bidirectionally.', status: 'disconnected', icon: '◈' },
              { name: 'Slack', desc: 'Send notifications and receive commands.', status: 'disconnected', icon: '◎' },
              { name: 'Notion', desc: 'Read and write documents and databases.', status: 'disconnected', icon: '⬢' },
              { name: 'Jira', desc: 'Sync issues from Atlassian Jira projects.', status: 'disconnected', icon: '◇' },
              { name: 'Datadog', desc: 'Ingest metrics and alert events.', status: 'disconnected', icon: '⬡' },
            ] as int (int.name)}
              <div class="stg-int-card">
                <div class="stg-int-icon" aria-hidden="true">{int.icon}</div>
                <div class="stg-int-body">
                  <span class="stg-int-name">{int.name}</span>
                  <span class="stg-int-desc">{int.desc}</span>
                </div>
                <div class="stg-int-status">
                  <span class="stg-int-dot stg-int-dot--{int.status}"></span>
                  <span class="stg-int-label">{int.status}</span>
                </div>
                <button class="stg-int-btn" aria-label="Connect {int.name}">Connect</button>
              </div>
            {/each}
          </div>
        </section>

      <!-- ── ADVANCED ──────────────────────────────────────────────────────── -->
      {:else if activeTab === 'advanced'}
        <section class="stg-section">
          <h2 class="stg-section-title">Advanced</h2>

          <div class="stg-card">
            <div class="stg-field">
              <span class="stg-label">API Response Cache</span>
              <p class="stg-desc">Clear the in-memory response cache. Data will be re-fetched from the backend on next load.</p>
              <button class="stg-btn stg-btn--ghost" onclick={handleClearCache}>
                Clear Cache
              </button>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <span class="stg-label">Reset to Defaults</span>
              <p class="stg-desc">Restore all settings to their factory defaults. This does not affect agent configurations.</p>
              <button class="stg-btn stg-btn--danger" onclick={handleResetDefaults}>
                Reset to Defaults
              </button>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <span class="stg-label">Export Configuration</span>
              <p class="stg-desc">Download current settings as a JSON file for backup or migration.</p>
              <button class="stg-btn stg-btn--ghost" onclick={handleExportConfig}>
                Export Config
              </button>
            </div>

            <div class="stg-sep"></div>

            <div class="stg-field">
              <span class="stg-label">Import Configuration</span>
              <p class="stg-desc">Upload a previously exported settings JSON file to restore a configuration.</p>
              <label class="stg-btn stg-btn--ghost stg-file-label" aria-label="Import configuration file">
                Import Config
                <input type="file" accept=".json" class="stg-file-input" onchange={handleImportConfig} />
              </label>
            </div>
          </div>
        </section>
      {/if}

    </div><!-- /stg-panel -->
  </div><!-- /stg-layout -->

  <!-- Fixed save bar -->
  {#snippet actions()}
    <button
      class="stg-save-btn"
      class:stg-save-btn--active={settingsStore.dirty}
      disabled={settingsStore.loading || !settingsStore.dirty}
      onclick={handleSave}
      aria-label="Save settings"
    >
      {settingsStore.loading ? 'Saving…' : settingsStore.dirty ? 'Save Changes' : 'Saved'}
    </button>
  {/snippet}
</PageShell>

<style>
  /* ── Layout ──────────────────────────────────────────────────────────── */

  .stg-layout {
    display: flex;
    height: 100%;
    overflow: hidden;
  }

  /* ── Tab Sidebar ─────────────────────────────────────────────────────── */

  .stg-tabs {
    display: flex;
    flex-direction: column;
    width: 160px;
    min-width: 160px;
    padding: 8px 8px 8px 0;
    border-right: 1px solid var(--border-default);
    overflow-y: auto;
    flex-shrink: 0;
    gap: 2px;
  }

  .stg-tab {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
    white-space: nowrap;
  }

  .stg-tab:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .stg-tab--active {
    background: var(--bg-elevated);
    color: var(--text-primary);
    position: relative;
  }

  .stg-tab--active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: var(--accent-primary);
    border-radius: 0 2px 2px 0;
  }

  /* ── Content Panel ───────────────────────────────────────────────────── */

  .stg-panel {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px 80px;
    min-width: 0;
  }

  .stg-panel::-webkit-scrollbar { width: 6px; }
  .stg-panel::-webkit-scrollbar-track { background: transparent; }
  .stg-panel::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 3px; }
  .stg-panel::-webkit-scrollbar-thumb:hover { background: var(--border-hover); }

  /* ── Section ─────────────────────────────────────────────────────────── */

  .stg-section {
    max-width: 640px;
  }

  .stg-section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px;
  }

  .stg-section-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 16px;
  }

  /* ── Card ────────────────────────────────────────────────────────────── */

  .stg-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 4px 0;
    margin-top: 16px;
  }

  .stg-card--mt {
    margin-top: 12px;
  }

  .stg-card-header {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 12px 16px 4px;
  }

  /* ── Separator ───────────────────────────────────────────────────────── */

  .stg-sep {
    height: 1px;
    background: var(--border-default);
    margin: 0;
  }

  /* ── Field ───────────────────────────────────────────────────────────── */

  .stg-field {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .stg-field--row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .stg-field-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .stg-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stg-desc {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.5;
  }

  .stg-hint {
    font-size: 11px;
    color: var(--text-muted);
  }

  .stg-value-badge {
    font-size: 11px;
    font-weight: 500;
    color: var(--accent-primary);
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: var(--radius-full);
    padding: 1px 7px;
  }

  /* ── Inputs ──────────────────────────────────────────────────────────── */

  .stg-input {
    width: 100%;
    padding: 7px 10px;
    font-size: 13px;
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .stg-input:focus {
    border-color: var(--border-focus);
  }

  .stg-input::placeholder {
    color: var(--text-muted);
  }

  .stg-input-group {
    display: flex;
    align-items: stretch;
  }

  .stg-input-prefix {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    font-size: 13px;
    color: var(--text-tertiary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-right: none;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    flex-shrink: 0;
  }

  .stg-input--prefixed {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .stg-select {
    width: 100%;
    padding: 7px 10px;
    font-size: 13px;
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    outline: none;
    cursor: pointer;
    transition: border-color var(--transition-fast);
    appearance: auto;
  }

  .stg-select:focus {
    border-color: var(--border-focus);
  }

  .stg-textarea {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    font-family: var(--font-mono);
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    outline: none;
    resize: vertical;
    transition: border-color var(--transition-fast);
    line-height: 1.6;
  }

  .stg-textarea:focus {
    border-color: var(--border-focus);
  }

  .stg-textarea::placeholder {
    color: var(--text-muted);
  }

  /* ── Slider ──────────────────────────────────────────────────────────── */

  .stg-slider {
    width: 100%;
    height: 4px;
    appearance: none;
    background: var(--border-default);
    border-radius: var(--radius-full);
    outline: none;
    cursor: pointer;
    accent-color: var(--accent-primary);
  }

  .stg-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent-primary);
    cursor: pointer;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    transition: box-shadow var(--transition-fast);
  }

  .stg-slider::-webkit-slider-thumb:hover {
    box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.25);
  }

  .stg-slider-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* ── Toggle ──────────────────────────────────────────────────────────── */

  .stg-toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .stg-toggle input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .stg-toggle-track {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }

  .stg-toggle input:checked ~ .stg-toggle-track {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
  }

  .stg-toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: var(--text-tertiary);
    border-radius: 50%;
    transition: transform var(--transition-fast), background var(--transition-fast);
  }

  .stg-toggle input:checked ~ .stg-toggle-track .stg-toggle-thumb {
    transform: translateX(16px);
    background: #fff;
  }

  /* ── Theme Picker ────────────────────────────────────────────────────── */

  .stg-theme-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .stg-theme-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0;
    background: transparent;
    border: 2px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color var(--transition-fast), transform var(--transition-fast);
    overflow: hidden;
    width: 96px;
  }

  .stg-theme-card:hover {
    border-color: var(--border-hover);
    transform: translateY(-1px);
  }

  .stg-theme-card--active {
    border-color: var(--accent-primary);
  }

  .stg-theme-swatch {
    position: relative;
    width: 100%;
    height: 52px;
    overflow: hidden;
  }

  .stg-theme-swatch-inner {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    bottom: 0;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    border: 1px solid;
  }

  .stg-theme-dot {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .stg-theme-name {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    padding: 0 8px 8px;
  }

  .stg-theme-card--active .stg-theme-name {
    color: var(--accent-primary);
  }

  /* ── Checkbox List ───────────────────────────────────────────────────── */

  .stg-check-list {
    display: flex;
    flex-direction: column;
    padding: 4px 0;
  }

  .stg-check-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .stg-check-row:hover {
    background: var(--bg-elevated);
  }

  .stg-checkbox {
    width: 15px;
    height: 15px;
    margin-top: 2px;
    flex-shrink: 0;
    accent-color: var(--accent-primary);
    cursor: pointer;
  }

  .stg-check-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stg-check-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .stg-check-desc {
    font-size: 12px;
    color: var(--text-tertiary);
  }

  /* ── Integration List ────────────────────────────────────────────────── */

  .stg-integration-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }

  .stg-int-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast);
  }

  .stg-int-card:hover {
    border-color: var(--border-hover);
  }

  .stg-int-icon {
    font-size: 18px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .stg-int-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stg-int-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .stg-int-desc {
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .stg-int-status {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .stg-int-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .stg-int-dot--connected { background: var(--accent-success); }
  .stg-int-dot--disconnected { background: var(--text-muted); }
  .stg-int-dot--error { background: var(--accent-error); }

  .stg-int-label {
    font-size: 12px;
    color: var(--text-tertiary);
    text-transform: capitalize;
  }

  .stg-int-btn {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--accent-primary);
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    flex-shrink: 0;
    transition: background var(--transition-fast);
  }

  .stg-int-btn:hover {
    background: rgba(59, 130, 246, 0.15);
  }

  /* ── Action Buttons ──────────────────────────────────────────────────── */

  .stg-btn {
    display: inline-flex;
    align-items: center;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--transition-fast), border-color var(--transition-fast);
    border: 1px solid;
    align-self: flex-start;
  }

  .stg-btn--ghost {
    color: var(--text-primary);
    background: var(--bg-elevated);
    border-color: var(--border-default);
  }

  .stg-btn--ghost:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-hover);
  }

  .stg-btn--danger {
    color: var(--accent-error);
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
  }

  .stg-btn--danger:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.35);
  }

  .stg-file-label {
    position: relative;
    cursor: pointer;
  }

  .stg-file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }

  /* ── Save Button (PageShell actions slot) ────────────────────────────── */

  .stg-save-btn {
    padding: 6px 16px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-tertiary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    cursor: default;
    transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
  }

  .stg-save-btn--active {
    color: #fff;
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    cursor: pointer;
  }

  .stg-save-btn--active:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .stg-save-btn:disabled:not(.stg-save-btn--active) {
    opacity: 0.5;
    cursor: default;
  }
</style>
