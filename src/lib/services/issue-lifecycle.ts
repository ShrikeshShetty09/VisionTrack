import { IssueStatus, Role } from "@/types";

export interface TransitionCheckParams {
  currentStatus: IssueStatus;
  targetStatus: IssueStatus;
  userRole: Role;
  isAssignedDeveloper?: boolean;
  isCreator?: boolean;
}

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
}

export function validateStatusTransition(params: TransitionCheckParams): TransitionValidationResult {
  const { currentStatus, targetStatus, userRole, isAssignedDeveloper } = params;

  if (currentStatus === targetStatus) {
    return { allowed: false, reason: "Target status is the same as the current status." };
  }

  // ADMIN can override any status, but must provide an audit reason
  if (userRole === "ADMIN") {
    return { allowed: true };
  }

  // DEVELOPER ROLE RULES
  if (userRole === "DEVELOPER") {
    if (!isAssignedDeveloper) {
      return { allowed: false, reason: "You can only update the status of issues assigned to you." };
    }

    // Developer cannot mark as resolved or testing
    const testerOnlyStatuses: IssueStatus[] = [
      "TESTING_IN_PROGRESS",
      "TESTED",
      "REGRESSION",
      "RESOLVED",
      "TEST_FAILED",
      "REGRESSION_FAILED",
    ];

    if (testerOnlyStatuses.includes(targetStatus)) {
      return {
        allowed: false,
        reason: "Only Testers and Admins can perform testing, regression verification, or mark issues as Resolved.",
      };
    }

    // Allowed developer transitions
    if (currentStatus === "ASSIGNED" && targetStatus === "IN_PROGRESS") return { allowed: true };
    if (currentStatus === "IN_PROGRESS" && targetStatus === "IN_REVIEW") return { allowed: true };
    if (currentStatus === "IN_PROGRESS" && targetStatus === "FIXED") return { allowed: true };
    if (currentStatus === "IN_REVIEW" && targetStatus === "FIXED") return { allowed: true };
    if (currentStatus === "IN_REVIEW" && targetStatus === "IN_PROGRESS") return { allowed: true };
    if (currentStatus === "REOPENED" && targetStatus === "IN_PROGRESS") return { allowed: true };
    if (currentStatus === "REOPENED" && targetStatus === "FIXED") return { allowed: true };
    if (currentStatus === "ASSIGNED" && targetStatus === "FIXED") return { allowed: true };

    return {
      allowed: false,
      reason: `Developers cannot transition from ${currentStatus} to ${targetStatus}.`,
    };
  }

  // TESTER ROLE RULES
  if (userRole === "TESTER") {
    // Tester cannot mark developer's work as FIXED
    if (targetStatus === "FIXED") {
      return {
        allowed: false,
        reason: "Only the assigned developer can mark an issue as Fixed by submitting resolution details.",
      };
    }

    // Allowed tester transitions
    if (currentStatus === "NEW" && targetStatus === "ASSIGNED") return { allowed: true };
    if (currentStatus === "REOPENED" && targetStatus === "ASSIGNED") return { allowed: true };
    if (currentStatus === "FIXED" && targetStatus === "TESTING_IN_PROGRESS") return { allowed: true };
    if (currentStatus === "TESTING_IN_PROGRESS" && targetStatus === "TESTED") return { allowed: true };
    if (currentStatus === "TESTING_IN_PROGRESS" && (targetStatus === "TEST_FAILED" || targetStatus === "REOPENED")) {
      return { allowed: true };
    }
    if (currentStatus === "TESTED" && targetStatus === "REGRESSION") return { allowed: true };
    if (currentStatus === "TESTED" && targetStatus === "RESOLVED") return { allowed: true };
    if (currentStatus === "REGRESSION" && targetStatus === "RESOLVED") return { allowed: true };
    if (currentStatus === "REGRESSION" && (targetStatus === "REGRESSION_FAILED" || targetStatus === "REOPENED")) {
      return { allowed: true };
    }
    if (currentStatus === "RESOLVED" && targetStatus === "REOPENED") return { allowed: true };

    return {
      allowed: false,
      reason: `Testers cannot transition from ${currentStatus} to ${targetStatus}.`,
    };
  }

  return { allowed: false, reason: "Unauthorized transition." };
}
