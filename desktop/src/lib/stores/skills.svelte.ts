// src/lib/stores/skills.svelte.ts
import type { Skill } from "$api/types";
import { skills as skillsApi } from "$api/client";
import { toastStore } from "./toasts.svelte";

class SkillsStore {
  skills = $state<Skill[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);

  // Derived
  enabledCount = $derived(this.skills.filter((s) => s.enabled).length);
  totalCount = $derived(this.skills.length);

  filteredSkills = $derived.by(() => {
    return [...this.skills].sort((a, b) => a.name.localeCompare(b.name));
  });

  async fetchSkills(): Promise<void> {
    this.loading = true;
    try {
      this.skills = await skillsApi.list();
      this.error = null;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to load skills", msg);
    } finally {
      this.loading = false;
    }
  }

  async toggleSkill(id: string): Promise<void> {
    const previous = this.skills;
    // Optimistic update
    this.skills = this.skills.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s,
    );
    try {
      const updated = await skillsApi.toggle(id);
      this.skills = this.skills.map((s) => (s.id === id ? updated : s));
      this.error = null;
    } catch (e) {
      this.skills = previous;
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to toggle skill", msg);
    }
  }
}

export const skillsStore = new SkillsStore();
