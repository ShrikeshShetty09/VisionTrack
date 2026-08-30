import { runLifecycleTests } from "../src/__tests__/issue-lifecycle.test";
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from "../src/lib/auth";

async function runAuthTests() {
  console.log("🔒 Running Authentication & Session Security Tests...");
  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Password hashing with bcrypt
  const password = "SuperSecretPassword123!";
  const hash = await hashPassword(password);
  assert("Password is not stored in plaintext", hash !== password);

  // 2. Password verification
  const isValid = await verifyPassword(password, hash);
  const isInvalid = await verifyPassword("WrongPassword", hash);
  assert("Valid password matches hash", isValid);
  assert("Invalid password fails hash verification", !isInvalid);

  // 3. JWT Session Sign and Verify
  const sessionPayload = {
    id: "user-123",
    name: "Tester Priya",
    email: "priya.sharma@visiondatalabs.com",
    role: "TESTER" as const,
    isActive: true,
  };
  const token = signSessionToken(sessionPayload);
  const decoded = verifySessionToken(token);
  assert("Session token encodes and verifies correctly", decoded !== null && decoded.email === sessionPayload.email);
  assert("Session preserves user role", decoded?.role === "TESTER");

  console.log(`\nAuth Test Summary: ${passed} passed, ${failed} failed.\n`);
  return failed === 0;
}

async function main() {
  console.log("=================================================");
  console.log("🧪 VISIONTRACK AUTOMATED TEST SUITE");
  console.log("=================================================");

  const lifecycleOk = runLifecycleTests();
  const authOk = await runAuthTests();

  if (lifecycleOk && authOk) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("❌ SOME TESTS FAILED!");
    process.exit(1);
  }
}

main();
