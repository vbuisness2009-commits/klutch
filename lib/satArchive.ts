export type PastSat = {
  id: number;
  /** How College Board refers to the administration. */
  name: string;
  region: "U.S." | "International";
  /** Month the test was actually administered. */
  administered: string;
  /** Questions a student answers on test day (54 RW + 44 Math). */
  questions: number;
  /** 64 min Reading & Writing + 70 min Math. */
  minutes: number;
};

/**
 * Every past administration currently in the archive. This is the only place
 * the list lives: counts shown on the site are derived from it rather than
 * written into copy, so they can't drift from what we actually have.
 *
 * Only add an entry once the paper has been parsed and checked. An
 * administration that hasn't happened yet does not belong here.
 */
export const SAT_ARCHIVE: PastSat[] = [
  { id: 1, name: "September U.S. SAT", region: "U.S.", administered: "September 2026", questions: 98, minutes: 134 },
  { id: 2, name: "August U.S. SAT", region: "U.S.", administered: "August 2026", questions: 98, minutes: 134 },
  { id: 3, name: "June U.S. SAT", region: "U.S.", administered: "June 2026", questions: 98, minutes: 134 },
  { id: 4, name: "May U.S. SAT", region: "U.S.", administered: "May 2026", questions: 98, minutes: 134 },
  { id: 5, name: "March U.S. SAT", region: "U.S.", administered: "March 2026", questions: 98, minutes: 134 },
];

export const ARCHIVE_COUNT = SAT_ARCHIVE.length;

/** The most recent administration, used for the "newest" callout. */
export const NEWEST_SAT = SAT_ARCHIVE[0];
