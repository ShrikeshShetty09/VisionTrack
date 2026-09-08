import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportDatabase() {
  console.log('🔄 Starting full database export...');
  const backupFile = path.join(process.cwd(), 'data_backup.json');

  try {
    const data: Record<string, any> = {};

    console.log('Fetching Users...');
    data.users = await prisma.user.findMany();

    console.log('Fetching Softwares...');
    data.softwares = await prisma.software.findMany();

    console.log('Fetching Modules...');
    data.modules = await prisma.module.findMany();

    console.log('Fetching Issues (including assignees)...');
    data.issues = await prisma.issue.findMany({
      include: {
        assignees: { select: { id: true } },
      },
    });

    console.log('Fetching Issue Assignments...');
    data.assignments = await prisma.issueAssignment.findMany();

    console.log('Fetching Status Histories...');
    data.statusHistories = await prisma.issueStatusHistory.findMany();

    console.log('Fetching Resolutions...');
    data.resolutions = await prisma.issueResolution.findMany();

    console.log('Fetching Testing Records...');
    data.testingRecords = await prisma.testingRecord.findMany();

    console.log('Fetching Regression Records...');
    data.regressionRecords = await prisma.regressionRecord.findMany();

    console.log('Fetching Comments...');
    data.comments = await prisma.issueComment.findMany();

    console.log('Fetching Attachments...');
    data.attachments = await prisma.issueAttachment.findMany();

    console.log('Fetching Notifications...');
    data.notifications = await prisma.notification.findMany();

    console.log('Fetching Push Subscriptions...');
    data.pushSubscriptions = await prisma.pushSubscription.findMany();

    console.log('Fetching Notification Preferences...');
    data.notificationPreferences = await prisma.notificationPreference.findMany();

    console.log('Fetching Deadline Reminders...');
    data.deadlineReminders = await prisma.deadlineReminder.findMany();

    console.log('Fetching Audit Logs...');
    data.auditLogs = await prisma.auditLog.findMany();

    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf-8');

    const totalRecords = Object.values(data).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
    console.log(`\n✅ Database export complete!`);
    console.log(`📦 Total records exported: ${totalRecords}`);
    console.log(`📁 Backup saved to: ${backupFile}\n`);
  } catch (err: any) {
    console.error('\n❌ Export failed:');
    if (err?.message?.includes('exceeded the data transfer quota')) {
      console.error('⚠️ Your Neon database is currently locked by quota.');
      console.error('Please request an unblock from Neon support or upgrade temporarily before exporting.');
    } else {
      console.error(err);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase();
