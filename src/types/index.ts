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

export type PublicationStatus = 'DRAFT' | 'PUBLISHED';

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
  | 'ADMIN_ALERT'
  | 'ISSUE_DELETED';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: string | null;
  isActive: boolean;
}

export interface IssueAssigneeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: string | null;
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
  publicationStatus?: PublicationStatus;
  jobUrl?: string | null;
  createdById: string;
  createdByName: string;
  assignedDeveloperId?: string | null;
  assignedDeveloperName?: string | null;
  assignees?: IssueAssigneeUser[];
  deadlineDate?: string | null;
  deadlineTime?: string | null;
  deadlineTimestamp?: string | null;
  isOverdue: boolean;
  reopenCount: number;
  deletedAt?: string | null;
  deletedById?: string | null;
  deletedBy?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    profileImage?: string | null;
  } | null;
  deleteRemark?: string | null;
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
