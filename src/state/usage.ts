import { invoke } from "@tauri-apps/api/core";

// Free-tier weekly transcription cap. Trial and licensed (premium) users are
// unlimited and never hit this. The counter itself lives in Rust
// (AppData/usage.json) so clearing the WebKit cache can't reset it.
export const WEEKLY_WORD_CAP = 2000;

export type UsageState = {
  week_start: string;
  words_used: number;
};

export function getUsageState(): Promise<UsageState> {
  return invoke<UsageState>("usage_get_state");
}

export function addUsageWords(words: number): Promise<UsageState> {
  return invoke<UsageState>("usage_add_words", { words });
}

/** Words the free tier still has this week. Never negative. */
export function wordsRemaining(state: UsageState): number {
  return Math.max(0, WEEKLY_WORD_CAP - state.words_used);
}

/** Word count of a transcription, matching how the quota is measured. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
