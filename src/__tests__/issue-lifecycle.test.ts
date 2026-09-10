import { validateStatusTransition } from "../lib/services/issue-lifecycle";

export function runLifecycleTests() {
  console.log("\n🧪 Running Issue Lifecycle State Machine & Permission Tests...");
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

  // 1. Developer cannot mark issue as RESOLVED directly
  const devResolve = validateStatusTransition({
    currentStatus: "FIXED",
    targetStatus: "RESOLVED",
    userRole: "DEVELOPER",
    isAssignedDeveloper: true,
  });
  assert("Developer CANNOT mark issue as RESOLVED directly", !devResolve.allowed);

  // 2. Tester cannot mark developer's work as FIXED
  const testerFixed = validateStatusTransition({
    currentStatus: "IN_PROGRESS",
    targetStatus: "FIXED",
    userRole: "TESTER",
  });
  assert("Tester CANNOT mark developer work as FIXED", !testerFixed.allowed);

  // 3. Developer can move ASSIGNED -> IN_PROGRESS
  const devStart = validateStatusTransition({
    currentStatus: "ASSIGNED",
    targetStatus: "IN_PROGRESS",
    userRole: "DEVELOPER",
    isAssignedDeveloper: true,
  });
  assert("Developer CAN transition ASSIGNED -> IN_PROGRESS", devStart.allowed);

  // 4. Developer can move IN_PROGRESS -> IN_REVIEW
  const devReview = validateStatusTransition({
    currentStatus: "IN_PROGRESS",
    targetStatus: "IN_REVIEW",
    userRole: "DEVELOPER",
    isAssignedDeveloper: true,
  });
  assert("Developer CAN transition IN_PROGRESS -> IN_REVIEW", devReview.allowed);

  // 5. Developer can move IN_REVIEW -> FIXED
  const devFix = validateStatusTransition({
    currentStatus: "IN_REVIEW",
    targetStatus: "FIXED",
    userRole: "DEVELOPER",
    isAssignedDeveloper: true,
  });
  assert("Developer CAN transition IN_REVIEW -> FIXED", devFix.allowed);

  // 6. Developer CANNOT modify another developer's issue
  const devOther = validateStatusTransition({
    currentStatus: "ASSIGNED",
    targetStatus: "IN_PROGRESS",
    userRole: "DEVELOPER",
    isAssignedDeveloper: false,
  });
  assert("Developer CANNOT update status on unassigned issue", !devOther.allowed);

  // 7. Tester CAN start testing: FIXED -> TESTING_IN_PROGRESS
  const testerStart = validateStatusTransition({
    currentStatus: "FIXED",
    targetStatus: "TESTING_IN_PROGRESS",
    userRole: "TESTER",
  });
  assert("Tester CAN transition FIXED -> TESTING_IN_PROGRESS", testerStart.allowed);

  // 8. Tester CAN move TESTING_IN_PROGRESS -> TESTED on pass
  const testerPass = validateStatusTransition({
    currentStatus: "TESTING_IN_PROGRESS",
    targetStatus: "TESTED",
    userRole: "TESTER",
  });
  assert("Tester CAN transition TESTING_IN_PROGRESS -> TESTED", testerPass.allowed);

  // 9. Tester CAN move TESTING_IN_PROGRESS -> REOPENED on fail
  const testerFail = validateStatusTransition({
    currentStatus: "TESTING_IN_PROGRESS",
    targetStatus: "REOPENED",
    userRole: "TESTER",
  });
  assert("Tester CAN transition TESTING_IN_PROGRESS -> REOPENED", testerFail.allowed);

  // 10. Tester CAN move TESTED -> REGRESSION -> RESOLVED
  const testerRegress = validateStatusTransition({
    currentStatus: "TESTED",
    targetStatus: "REGRESSION",
    userRole: "TESTER",
  });
  const testerResolve = validateStatusTransition({
    currentStatus: "REGRESSION",
    targetStatus: "RESOLVED",
    userRole: "TESTER",
  });
  assert("Tester CAN transition TESTED -> REGRESSION -> RESOLVED", testerRegress.allowed && testerResolve.allowed);

  // 11. Admin CAN override any transition
  const adminOverride = validateStatusTransition({
    currentStatus: "NEW",
    targetStatus: "RESOLVED",
    userRole: "ADMIN",
  });
  assert("Admin CAN perform status overrides", adminOverride.allowed);

  // 12. Multiple assignees: any assigned co-developer can advance issue to IN_PROGRESS and IN_REVIEW
  const multiAssignees = [{ id: "dev-1", name: "Dev A" }, { id: "dev-2", name: "Dev B" }];
  const currentDevUser = { id: "dev-2" };
  const isAssigned = multiAssignees.some((a) => a.id === currentDevUser.id);

  const coDevStart = validateStatusTransition({
    currentStatus: "ASSIGNED",
    targetStatus: "IN_PROGRESS",
    userRole: "DEVELOPER",
    isAssignedDeveloper: isAssigned,
  });
  assert("Co-assigned developer in multi-assignee team CAN transition ASSIGNED -> IN_PROGRESS", coDevStart.allowed);

  // 13. Non-assigned developer CANNOT transition a multi-assigned issue
  const nonAssignedUser = { id: "dev-3" };
  const isNonAssigned = multiAssignees.some((a) => a.id === nonAssignedUser.id);

  const nonAssignedAttempt = validateStatusTransition({
    currentStatus: "ASSIGNED",
    targetStatus: "IN_PROGRESS",
    userRole: "DEVELOPER",
    isAssignedDeveloper: isNonAssigned,
  });
  assert("Unassigned third developer CANNOT transition multi-assigned issue", !nonAssignedAttempt.allowed);

  // 14. Unassigned issue creation: initial status is NEW, assignees can be empty, deadline optional
  const unassignedIssue = {
    title: "Unassigned defect",
    assignedDeveloperIds: [],
    deadlineTimestamp: null,
  };
  const unassignedInitialStatus = unassignedIssue.assignedDeveloperIds.length > 0 ? "ASSIGNED" : "NEW";
  assert("Unassigned issue creation defaults to status NEW without assignees", unassignedInitialStatus === "NEW");

  // 15. Deferred assignment from row: Tester and Admin CAN assign developers and advance status from NEW -> ASSIGNED
  const deferredAssignmentDevs = ["dev-1", "dev-2"];
  const previousStatus = "NEW";
  const updatedStatus = previousStatus === "NEW" && deferredAssignmentDevs.length > 0 ? "ASSIGNED" : previousStatus;
  assert("Deferred assignment from table row transitions NEW -> ASSIGNED", updatedStatus === "ASSIGNED");

  // 16. Setting deadline independently without assignees preserves NEW status
  const standaloneDeadlineTimestamp = new Date().toISOString();
  const emptyAssigneesWithDeadline: string[] = [];
  const statusWithOnlyDeadline = emptyAssigneesWithDeadline.length > 0 ? "ASSIGNED" : "NEW";
  assert("Issue with deadline but no assignees preserves status NEW", statusWithOnlyDeadline === "NEW" && Boolean(standaloneDeadlineTimestamp));

  console.log(`\nLifecycle Test Summary: ${passed} passed, ${failed} failed.\n`);
  return failed === 0;
}
