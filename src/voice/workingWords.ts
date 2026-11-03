/**
 * What the panel says while the AI is searching or doing something for the customer, so a wait never looks like a freeze.
 * One word at a time, changing every second or so, in the way coding assistants show "Vibing…".
 */
export const WORKING_WORDS = [
  'Vibing',
  'Wheezing',
  'Pondering',
  'Noodling',
  'Brewing',
  'Cooking',
  'Untangling',
  'Conjuring',
  'Rummaging',
  'Percolating',
  'Tinkering',
  'Scheming',
  'Mulling',
  'Whirring',
  'Hustling',
  'Digging',
];

/** The word for a tick. `seed` makes each session start somewhere different; the same arguments always give the same word. */
export function workingWord(tick: number, seed = 0): string {
  const n = WORKING_WORDS.length;
  return WORKING_WORDS[(((tick + seed) % n) + n) % n]!;
}
