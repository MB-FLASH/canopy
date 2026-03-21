<!-- src/lib/components/agents/HireAgentDialog.svelte -->
<script lang="ts">
  import { agentsStore } from '$lib/stores/agents.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import type { AgentCreateRequest, AdapterType } from '$api/types';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  // Form state
  let name = $state('');
  let displayName = $state('');
  let emoji = $state('🤖');
  let role = $state('');
  let adapter = $state<AdapterType>(settingsStore.data.default_adapter ?? 'osa');
  let model = $state('claude-sonnet-4-6');
  let systemPrompt = $state('');
  let selectedSkills = $state<string[]>([]);
  let dailyLimitDollars = $state('10.00');
  let monthlyLimitDollars = $state('100.00');
  let warningThreshold = $state(80);
  let hardStop = $state(true);
  let cronExpr = $state('');
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});

  const EMOJIS = ['🤖','🔍','📝','🏗️','🔮','🛡️','📬','⚒️','🎨','🌐','🧠','⚡','🔬','📊','🎯','🚀','🌿','🦅','🔧','💡'];

  const ADAPTERS: { value: AdapterType; label: string; description: string }[] = [
    { value: 'osa',         label: 'OSA',         description: 'Native OSA agent runtime' },
    { value: 'claude_code', label: 'Claude Code',  description: 'Anthropic Claude Code CLI' },
    { value: 'codex',       label: 'Codex',        description: 'OpenAI Codex adapter' },
    { value: 'openclaw',    label: 'OpenClaw',      description: 'OpenClaw coding agent' },
    { value: 'jidoclaw',    label: 'JidoClaw',      description: 'Elixir-native agent framework' },
    { value: 'hermes',      label: 'Hermes',        description: 'Fast message-passing runtime' },
    { value: 'bash',        label: 'Bash',          description: 'Shell command executor' },
    { value: 'http',        label: 'HTTP',          description: 'HTTP webhook adapter' },
    { value: 'custom',      label: 'Custom',        description: 'Custom adapter config' },
  ];

  const MODEL_PRESETS = [
    'claude-sonnet-4-6',
    'claude-opus-4-6',
    'claude-haiku-4-5-20251001',
    'gpt-4o',
    'gpt-4o-mini',
    'gemini-2.0-flash',
  ];

  const SKILL_OPTIONS = [
    'code-review', 'security-scan', 'dependency-audit', 'doc-writer',
    'markdown-formatter', 'changelog-generator', 'refactoring',
    'architecture-analysis', 'research', 'summarization', 'knowledge-graph',
    'security-monitor', 'alert-triage', 'incident-response', 'notification-dispatch',
    'ci-cd', 'build-optimization', 'test-runner', 'ui-design', 'accessibility-audit',
  ];

  const CRON_PRESETS = [
    { label: 'Every hour',     cron: '0 * * * *' },
    { label: 'Every 6 hours',  cron: '0 */6 * * *' },
    { label: 'Daily 9am',      cron: '0 9 * * *' },
    { label: 'Weekdays 9am',   cron: '0 9 * * 1-5' },
    { label: 'Weekly Monday',  cron: '0 9 * * 1' },
  ];

  function toggleSkill(skill: string) {
    if (selectedSkills.includes(skill)) {
      selectedSkills = selectedSkills.filter((s) => s !== skill);
    } else {
      selectedSkills = [...selectedSkills, skill];
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    else if (!/^[a-z0-9-_]+$/.test(name.trim())) e.name = 'Use lowercase letters, numbers, hyphens, underscores';
    if (!displayName.trim()) e.displayName = 'Display name is required';
    if (!role.trim()) e.role = 'Role is required';
    if (!model.trim()) e.model = 'Model is required';
    errors = e;
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validate()) return;

    isSubmitting = true;
    const req: AgentCreateRequest = {
      name: name.trim(),
      display_name: displayName.trim(),
      avatar_emoji: emoji,
      role: role.trim(),
      adapter,
      model: model.trim(),
      system_prompt: systemPrompt.trim() || undefined,
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      budget_policy: {
        daily_limit_cents: Math.round(parseFloat(dailyLimitDollars) * 100),
        monthly_limit_cents: Math.round(parseFloat(monthlyLimitDollars) * 100),
        warning_threshold: warningThreshold / 100,
        hard_stop: hardStop,
      },
      schedule: cronExpr.trim() ? { cron: cronExpr.trim(), enabled: true } : undefined,
    };

    const created = await agentsStore.createAgent(req);
    isSubmitting = false;
    if (created) {
      resetForm();
      onClose();
    }
  }

  function resetForm() {
    name = '';
    displayName = '';
    emoji = '🤖';
    role = '';
    adapter = settingsStore.data.default_adapter ?? 'osa';
    model = 'claude-sonnet-4-6';
    systemPrompt = '';
    selectedSkills = [];
    dailyLimitDollars = '10.00';
    monthlyLimitDollars = '100.00';
    warningThreshold = 80;
    hardStop = true;
    cronExpr = '';
    errors = {};
  }

  function handleBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('had-overlay')) onClose();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="had-overlay"
    onclick={handleBackdrop}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-label="Hire a new agent"
    tabindex="-1"
  >
    <div class="had-modal">
      <header class="had-header">
        <h2 class="had-title">Hire Agent</h2>
        <button class="had-close" onclick={onClose} aria-label="Close dialog">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <form class="had-form" onsubmit={handleSubmit} novalidate>
        <div class="had-body">

          <!-- 1. Identity -->
          <section class="had-section">
            <h3 class="had-section-title">Identity</h3>

            <!-- Emoji picker -->
            <div class="had-field">
              <label class="had-label" for="had-emoji-display">Avatar</label>
              <div class="had-emoji-grid" role="group" aria-label="Choose avatar emoji">
                {#each EMOJIS as em}
                  <button
                    type="button"
                    class="had-emoji-btn"
                    class:had-emoji-btn--selected={emoji === em}
                    onclick={() => emoji = em}
                    aria-label="Use {em} as avatar"
                    aria-pressed={emoji === em}
                  >{em}</button>
                {/each}
              </div>
              <span id="had-emoji-display" class="had-emoji-preview" aria-live="polite">
                Selected: {emoji}
              </span>
            </div>

            <div class="had-row">
              <div class="had-field">
                <label class="had-label" for="had-name">Name <span class="had-required">*</span></label>
                <input
                  id="had-name"
                  class="had-input"
                  class:had-input--error={errors.name}
                  type="text"
                  bind:value={name}
                  placeholder="scout"
                  autocomplete="off"
                  aria-describedby={errors.name ? 'had-name-error' : undefined}
                  aria-required="true"
                />
                {#if errors.name}
                  <span id="had-name-error" class="had-error" role="alert">{errors.name}</span>
                {/if}
              </div>

              <div class="had-field">
                <label class="had-label" for="had-display-name">Display Name <span class="had-required">*</span></label>
                <input
                  id="had-display-name"
                  class="had-input"
                  class:had-input--error={errors.displayName}
                  type="text"
                  bind:value={displayName}
                  placeholder="Scout"
                  autocomplete="off"
                  aria-describedby={errors.displayName ? 'had-display-name-error' : undefined}
                  aria-required="true"
                />
                {#if errors.displayName}
                  <span id="had-display-name-error" class="had-error" role="alert">{errors.displayName}</span>
                {/if}
              </div>
            </div>

            <div class="had-field">
              <label class="had-label" for="had-role">Role <span class="had-required">*</span></label>
              <input
                id="had-role"
                class="had-input"
                class:had-input--error={errors.role}
                type="text"
                bind:value={role}
                placeholder="Security Analyst"
                autocomplete="off"
                aria-describedby={errors.role ? 'had-role-error' : undefined}
                aria-required="true"
              />
              {#if errors.role}
                <span id="had-role-error" class="had-error" role="alert">{errors.role}</span>
              {/if}
            </div>
          </section>

          <!-- 2. Adapter -->
          <section class="had-section">
            <h3 class="had-section-title">Adapter</h3>
            <div class="had-adapter-grid" role="radiogroup" aria-label="Select adapter">
              {#each ADAPTERS as a}
                <label
                  class="had-adapter-card"
                  class:had-adapter-card--selected={adapter === a.value}
                  aria-label="{a.label}: {a.description}"
                >
                  <input
                    type="radio"
                    name="adapter"
                    value={a.value}
                    bind:group={adapter}
                    class="had-radio-hidden"
                    aria-label={a.label}
                  />
                  <span class="had-adapter-name">{a.label}</span>
                  <span class="had-adapter-desc">{a.description}</span>
                </label>
              {/each}
            </div>
          </section>

          <!-- 3. Model -->
          <section class="had-section">
            <h3 class="had-section-title">Model</h3>
            <div class="had-field">
              <label class="had-label" for="had-model">Model <span class="had-required">*</span></label>
              <div class="had-model-wrap">
                <input
                  id="had-model"
                  class="had-input"
                  class:had-input--error={errors.model}
                  type="text"
                  bind:value={model}
                  placeholder="claude-sonnet-4-6"
                  list="had-model-presets"
                  autocomplete="off"
                  aria-describedby={errors.model ? 'had-model-error' : 'had-model-hint'}
                  aria-required="true"
                />
                <datalist id="had-model-presets">
                  {#each MODEL_PRESETS as preset}
                    <option value={preset}>{preset}</option>
                  {/each}
                </datalist>
              </div>
              <span id="had-model-hint" class="had-hint">Type or pick from presets</span>
              {#if errors.model}
                <span id="had-model-error" class="had-error" role="alert">{errors.model}</span>
              {/if}
            </div>
          </section>

          <!-- 4. System Prompt -->
          <section class="had-section">
            <h3 class="had-section-title">System Prompt</h3>
            <div class="had-field">
              <label class="had-label" for="had-system-prompt">Instructions</label>
              <textarea
                id="had-system-prompt"
                class="had-textarea"
                bind:value={systemPrompt}
                placeholder="You are {displayName || 'an AI agent'}…"
                rows="5"
                aria-label="Agent system prompt"
              ></textarea>
            </div>
          </section>

          <!-- 5. Skills -->
          <section class="had-section">
            <h3 class="had-section-title">Skills</h3>
            <div class="had-skills-grid" role="group" aria-label="Select agent skills">
              {#each SKILL_OPTIONS as skill}
                <label class="had-skill-item">
                  <input
                    type="checkbox"
                    class="had-checkbox"
                    checked={selectedSkills.includes(skill)}
                    onchange={() => toggleSkill(skill)}
                    aria-label="Enable skill: {skill}"
                  />
                  <span class="had-skill-name">{skill}</span>
                </label>
              {/each}
            </div>
          </section>

          <!-- 6. Budget -->
          <section class="had-section">
            <h3 class="had-section-title">Budget</h3>
            <div class="had-row">
              <div class="had-field">
                <label class="had-label" for="had-daily">Daily limit ($)</label>
                <input
                  id="had-daily"
                  class="had-input"
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={dailyLimitDollars}
                  aria-label="Daily spending limit in dollars"
                />
              </div>
              <div class="had-field">
                <label class="had-label" for="had-monthly">Monthly limit ($)</label>
                <input
                  id="had-monthly"
                  class="had-input"
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={monthlyLimitDollars}
                  aria-label="Monthly spending limit in dollars"
                />
              </div>
            </div>

            <div class="had-field">
              <label class="had-label" for="had-warning">
                Warning threshold: {warningThreshold}%
              </label>
              <input
                id="had-warning"
                class="had-slider"
                type="range"
                min="50"
                max="95"
                step="5"
                bind:value={warningThreshold}
                aria-label="Warning threshold percentage"
                aria-valuemin="50"
                aria-valuemax="95"
                aria-valuenow={warningThreshold}
                aria-valuetext="{warningThreshold}%"
              />
            </div>

            <label class="had-toggle-row">
              <span class="had-label">Hard stop at limit</span>
              <input
                type="checkbox"
                class="had-checkbox"
                bind:checked={hardStop}
                aria-label="Enable hard stop when budget limit is reached"
              />
              <span class="had-toggle-hint">Agent stops immediately when budget is exhausted</span>
            </label>
          </section>

          <!-- 7. Schedule -->
          <section class="had-section">
            <h3 class="had-section-title">Schedule</h3>
            <div class="had-field">
              <label class="had-label" for="had-cron">Cron expression</label>
              <input
                id="had-cron"
                class="had-input had-input--mono"
                type="text"
                bind:value={cronExpr}
                placeholder="0 9 * * 1-5"
                autocomplete="off"
                aria-describedby="had-cron-hint"
              />
              <span id="had-cron-hint" class="had-hint">Leave empty for no schedule</span>
            </div>
            <div class="had-cron-presets" role="group" aria-label="Cron presets">
              {#each CRON_PRESETS as preset}
                <button
                  type="button"
                  class="had-preset-btn"
                  class:had-preset-btn--active={cronExpr === preset.cron}
                  onclick={() => cronExpr = preset.cron}
                  aria-label="Set schedule to {preset.label}"
                  aria-pressed={cronExpr === preset.cron}
                >
                  {preset.label}
                </button>
              {/each}
            </div>
          </section>
        </div>

        <!-- Footer -->
        <footer class="had-footer">
          <button
            type="button"
            class="had-btn had-btn--secondary"
            onclick={onClose}
            aria-label="Cancel and close dialog"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="had-btn had-btn--primary"
            disabled={isSubmitting}
            aria-label="Hire agent"
            aria-busy={isSubmitting}
          >
            {#if isSubmitting}
              <span class="had-spinner" aria-hidden="true"></span>
              Hiring…
            {:else}
              Hire Agent
            {/if}
          </button>
        </footer>
      </form>
    </div>
  </div>
{/if}

<style>
  .had-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 24px;
  }

  .had-modal {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 640px;
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .had-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
  }

  .had-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .had-close {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-xs);
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 120ms ease;
  }

  .had-close:hover {
    background: var(--bg-elevated);
    border-color: var(--border-default);
    color: var(--text-primary);
  }

  .had-form {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .had-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .had-body::-webkit-scrollbar {
    width: 5px;
  }

  .had-body::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 3px;
  }

  .had-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .had-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
    margin: 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-default);
  }

  .had-row {
    display: flex;
    gap: 12px;
  }

  .had-row .had-field {
    flex: 1;
  }

  .had-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .had-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .had-required {
    color: var(--accent-error);
  }

  .had-hint {
    font-size: 11px;
    color: var(--text-muted);
  }

  .had-error {
    font-size: 11px;
    color: var(--accent-error);
  }

  .had-input {
    height: 34px;
    padding: 0 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    font-family: var(--font-sans);
    outline: none;
    transition: border-color 120ms ease;
  }

  .had-input:focus {
    border-color: var(--border-focus);
  }

  .had-input--error {
    border-color: var(--accent-error);
  }

  .had-input--mono {
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .had-textarea {
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12px;
    font-family: var(--font-mono);
    resize: vertical;
    outline: none;
    transition: border-color 120ms ease;
    line-height: 1.5;
  }

  .had-textarea:focus {
    border-color: var(--border-focus);
  }

  /* Emoji grid */
  .had-emoji-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .had-emoji-btn {
    width: 34px;
    height: 34px;
    font-size: 18px;
    border-radius: var(--radius-xs);
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 100ms ease;
  }

  .had-emoji-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--border-default);
  }

  .had-emoji-btn--selected {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .had-emoji-preview {
    font-size: 11px;
    color: var(--text-muted);
  }

  /* Adapter grid */
  .had-adapter-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .had-adapter-card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    cursor: pointer;
    transition: all 120ms ease;
  }

  .had-adapter-card:hover {
    border-color: var(--border-hover);
    background: var(--bg-elevated);
  }

  .had-adapter-card--selected {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(59, 130, 246, 0.1);
  }

  .had-radio-hidden {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .had-adapter-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .had-adapter-desc {
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.3;
  }

  /* Model */
  .had-model-wrap {
    position: relative;
  }

  /* Skills grid */
  .had-skills-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .had-skill-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-xs);
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 100ms ease;
  }

  .had-skill-item:hover {
    background: var(--bg-elevated);
  }

  .had-checkbox {
    width: 14px;
    height: 14px;
    cursor: pointer;
    accent-color: var(--accent-primary);
    flex-shrink: 0;
  }

  .had-skill-name {
    font-size: 12px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  /* Budget slider */
  .had-slider {
    width: 100%;
    height: 4px;
    accent-color: var(--accent-primary);
    cursor: pointer;
  }

  .had-toggle-row {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .had-toggle-hint {
    font-size: 11px;
    color: var(--text-muted);
  }

  /* Cron presets */
  .had-cron-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .had-preset-btn {
    height: 26px;
    padding: 0 10px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-default);
    background: transparent;
    color: var(--text-secondary);
    font-size: 11px;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: all 100ms ease;
  }

  .had-preset-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .had-preset-btn--active {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
    color: #93c5fd;
  }

  /* Footer */
  .had-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid var(--border-default);
    flex-shrink: 0;
    background: var(--bg-secondary);
  }

  .had-btn {
    height: 34px;
    padding: 0 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    font-family: var(--font-sans);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 120ms ease;
    border: 1px solid transparent;
  }

  .had-btn--secondary {
    background: transparent;
    border-color: var(--border-default);
    color: var(--text-secondary);
  }

  .had-btn--secondary:hover {
    background: var(--bg-elevated);
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .had-btn--primary {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
    color: #93c5fd;
  }

  .had-btn--primary:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.7);
    color: #bfdbfe;
  }

  .had-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .had-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(147, 197, 253, 0.3);
    border-top-color: #93c5fd;
    border-radius: 50%;
    animation: had-spin 0.7s linear infinite;
  }

  @keyframes had-spin {
    to { transform: rotate(360deg); }
  }
</style>
