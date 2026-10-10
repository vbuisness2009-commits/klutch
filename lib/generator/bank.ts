import "server-only";

import { ensureSchema, sql } from "../db";
import { listTests, saveTest, type TestSummary } from "../testEngine/store";
import { generateBlueprintTest } from "./blueprint";

export type UserBankStatus = {
  totalBankTests: number;
  userCompletedCount: number;
  userAssignedCount: number;
  nextAvailableFromBank: boolean;
};

/**
 * Returns all test IDs a user has ever attempted, started, or been assigned to.
 */
export async function getUserTakenTestIds(userId: string): Promise<Set<string>> {
  await ensureSchema();
  const taken = new Set<string>();

  try {
    // 1. From completed or saved attempts
    const attempts = (await sql()`
      SELECT form_id FROM attempts WHERE user_id = ${userId}
    `) as { form_id: string }[];
    for (const a of attempts) {
      if (a.form_id) taken.add(a.form_id);
    }

    // 2. From assigned tests in bank history
    const assignments = (await sql()`
      SELECT test_id FROM user_test_assignments WHERE user_id = ${userId}
    `) as { test_id: string }[];
    for (const a of assignments) {
      if (a.test_id) taken.add(a.test_id);
    }
  } catch (err) {
    console.error("Failed to query user taken tests:", err);
  }

  return taken;
}

/**
 * Record that a user was assigned to or started a test.
 */
export async function recordUserTestAssignment(
  userId: string,
  testId: string
): Promise<void> {
  await ensureSchema();
  try {
    await sql()`
      INSERT INTO user_test_assignments (user_id, test_id, status, created_at)
      VALUES (${userId}, ${testId}, 'assigned', now())
      ON CONFLICT (user_id, test_id) DO NOTHING
    `;
  } catch (err) {
    console.error("Failed to record test assignment:", err);
  }
}

/**
 * Returns all tests currently in the Generated Tests bank.
 */
export async function getGeneratedBankTests(): Promise<TestSummary[]> {
  const allTests = await listTests();
  return allTests.filter(
    (t) =>
      t.collection === "Generated Tests" ||
      t.id.startsWith("generated-test-") ||
      t.source === "ai-blueprint"
  );
}

/**
 * Smart On-Demand Test Generator & Bank Allocator:
 * - Checks if an existing generated test is in the bank that THIS user hasn't taken yet.
 * - If yes: Reuses it! (Cost: $0.00 API calls, instant load).
 * - If no: Calls AI blueprint engine to generate a brand new test, adds it to the bank for everyone.
 */
export async function assignOrGenerateTestForUser(
  userId: string
): Promise<{
  testId: string;
  title: string;
  isNew: boolean;
  reusedFromBank: boolean;
}> {
  await ensureSchema();

  const [taken, bankTests] = await Promise.all([
    getUserTakenTestIds(userId),
    getGeneratedBankTests(),
  ]);

  // 1. Check if there is an untaken generated test in the bank
  const untaken = bankTests
    .filter((t) => !taken.has(t.id))
    .sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(b.id.replace(/\D/g, "") || "0", 10);
      return numA - numB;
    });

  if (untaken.length > 0) {
    const available = untaken[0];
    await recordUserTestAssignment(userId, available.id);
    return {
      testId: available.id,
      title: available.title,
      isNew: false,
      reusedFromBank: true,
    };
  }

  // 2. User has completed all existing tests in the bank (or bank is empty)
  // Calculate next sequence number from max existing number
  let maxNum = 0;
  for (const t of bankTests) {
    const match =
      t.id.match(/generated-test-(\d+)/) ||
      t.title.match(/Generated Test\s*#?(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const nextNumber = maxNum + 1;

  // Synthesize brand new authentic test via AI Blueprint Engine
  const newTest = await generateBlueprintTest(nextNumber);

  // Save to Postgres bank permanently so all future users can reuse it
  await saveTest(newTest);

  // Record assignment
  await recordUserTestAssignment(userId, newTest.id);

  return {
    testId: newTest.id,
    title: newTest.title,
    isNew: true,
    reusedFromBank: false,
  };
}

/**
 * Quick stats for the student dashboard.
 */
export async function getBankOverviewForUser(
  userId: string
): Promise<UserBankStatus> {
  const [taken, bankTests] = await Promise.all([
    getUserTakenTestIds(userId),
    getGeneratedBankTests(),
  ]);

  const untaken = bankTests.filter((t) => !taken.has(t.id));

  return {
    totalBankTests: bankTests.length,
    userCompletedCount: taken.size,
    userAssignedCount: taken.size,
    nextAvailableFromBank: untaken.length > 0,
  };
}
