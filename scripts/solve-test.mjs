// Fills missing answer keys on an uploaded test via the local admin API.
// Usage: node --env-file=.env.local scripts/solve-test.mjs <test-id> [base-url]
const [id, base = "http://localhost:3100"] = process.argv.slice(2);
if (!id) {
  console.error("Usage: node --env-file=.env.local scripts/solve-test.mjs <test-id> [base-url]");
  process.exit(1);
}

const login = await fetch(`${base}/api/admin/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }),
});
if (!login.ok) {
  console.error("Admin login failed:", login.status);
  process.exit(1);
}
const cookie = login.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");

let stalls = 0;
for (let pass = 1; pass <= 40; pass++) {
  const t0 = Date.now();
  const res = await fetch(`${base}/api/admin/tests/${id}/solve`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ limit: 12 }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`pass ${pass}: HTTP ${res.status}`, json.error ?? "");
    process.exit(1);
  }
  const solved = json.solve?.solved ?? 0;
  console.log(
    `pass ${pass}: +${solved} solved, ${json.remaining} open, ${Math.round((Date.now() - t0) / 1000)}s`
  );
  if (json.scorable || json.remaining === 0) {
    console.log("DONE: form is scorable");
    process.exit(0);
  }
  if (solved === 0 && ++stalls >= 2) {
    console.error("Stalled:", (json.warnings ?? []).filter((w) => /fail|Empty|parse/i.test(w)).slice(-3));
    process.exit(2);
  }
}
