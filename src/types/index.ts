export type Role = 'ADMIN' | 'TESTER' | 'DEVELOPER';

export type Environment = 'DEV' | 'PRODUCTION' | 'LOCAL' | 'TESTING';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IssueStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'FIXED'
  | 'TESTING_IN_PROGRESS'
  | 'TESTED'
  | 'REGRESSION'
  | 'RESOLVED'
  | 'TEST_FAILED'
  | 'REGRESSION_FAILED'
  | 'REOPENED';

export type TestResult = 'PASS' | 'FAIL';

export type RegressionResult = 'PASS' | 'FAIL';

export type NotificationType =
  | 'ISSUE_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'ISSUE_FIXED'
  | 'TESTING_REQUIRED'
  | 'TEST_FAILED'
  | 'REGRESSION_REQUIRED'
  | 'REGRESSION_FAILED'
  | 'ISSUE_REOPENED'
  | 'DEADLINE_30_MIN'
  | 'DEADLINE_10_MIN'
  | 'DEADLINE_OVERDUE'
  | 'COMMENT_ADDED'
  | 'ADMIN_ALERT';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: string | null;
  isActive: boolean;
}

export interface IssueListItem {
  id: string;
  issueCode: string;
  title: string;
  description: string;
  softwareId: string;
  softwareName: string;
  softwareCode: string;
  moduleId?: string | null;
  moduleName?: string | null;
  environment: Environment;
  priority: Priority;
  status: IssueStatus;
  jobUrl?: string | null;
  createdById: string;
  createdByName: string;
  assignedDeveloperId?: string | null;
  assignedDeveloperName?: string | null;
  deadlineDate?: string | null;
  deadlineTime?: string | null;
  deadlineTimestamp?: string | null;
  isOverdue: boolean;
  reopenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: 'CREATED' | 'ASSIGNED' | 'STATUS_CHANGE' | 'FIXED' | 'TESTING' | 'REGRESSION' | 'COMMENT' | 'REOPENED';
  title: string;
  description?: string;
  timestamp: string;
  actorName: string;
  actorRole: Role;
  metadata?: any;
}

export interface DeveloperWorkload {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  activeIssuesCount: number;
  inProgressCount: number;
  inReviewCount: number;
  fixedCount: number;
  overdueCount: number;
  urgentUpcomingDeadlines: number; // in next 2 hours
  avgResolutionHours: number;
  availability: 'AVAILABLE' | 'MODERATE' | 'BUSY';
}

export interface TesterWorkload {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  issuesRaised: number;
  awaitingTesting: number;
  testingInProgress: number;
  regressionPending: number;
  resolved: number;
  reopened: number;
  avgTestingHours: number;
}
