import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importDatabase() {
  const backupFile = path.join(process.cwd(), 'data_backup.json');

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    console.error('Please run "npm run db:export" first.');
    process.exit(1);
  }

  console.log(`📂 Reading backup from ${backupFile}...`);
  const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  try {
    console.log('🔄 Starting data import into the target database...\n');

    if (data.users?.length) {
      console.log(`Inserting ${data.users.length} Users...`);
      for (const u of data.users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {},
          create: u,
        });
      }
    }

    if (data.softwares?.length) {
      console.log(`Inserting ${data.softwares.length} Softwares...`);
      for (const s of data.softwares) {
        await prisma.software.upsert({
          where: { id: s.id },
          update: {},
          create: s,
        });
      }
    }

    if (data.modules?.length) {
      console.log(`Inserting ${data.modules.length} Modules...`);
      for (const m of data.modules) {
        await prisma.module.upsert({
          where: { id: m.id },
          update: {},
          create: m,
        });
      }
    }

    if (data.issues?.length) {
      console.log(`Inserting ${data.issues.length} Issues...`);
      for (const issue of data.issues) {
        const { assignees, ...issueData } = issue;
        await prisma.issue.upsert({
          where: { id: issueData.id },
          update: {},
          create: {
            ...issueData,
            assignees: assignees?.length
              ? {
                  connect: assignees.map((a: { id: string }) => ({ id: a.id })),
                }
              : undefined,
          },
        });
      }
    }

    if (data.assignments?.length) {
      console.log(`Inserting ${data.assignments.length} Issue Assignments...`);
      for (const a of data.assignments) {
        await prisma.issueAssignment.upsert({
          where: { id: a.id },
          update: {},
          create: a,
        });
      }
    }

    if (data.statusHistories?.length) {
      console.log(`Inserting ${data.statusHistories.length} Status Histories...`);
      for (const sh of data.statusHistories) {
        await prisma.issueStatusHistory.upsert({
          where: { id: sh.id },
          update: {},
          create: sh,
        });
      }
    }

    if (data.resolutions?.length) {
      console.log(`Inserting ${data.resolutions.length} Resolutions...`);
      for (const r of data.resolutions) {
        await prisma.issueResolution.upsert({
          where: { id: r.id },
          update: {},
          create: r,
        });
      }
    }

    if (data.testingRecords?.length) {
      console.log(`Inserting ${data.testingRecords.length} Testing Records...`);
      for (const tr of data.testingRecords) {
        await prisma.testingRecord.upsert({
          where: { id: tr.id },
          update: {},
          create: tr,
        });
      }
    }

    if (data.regressionRecords?.length) {
      console.log(`Inserting ${data.regressionRecords.length} Regression Records...`);
      for (const rr of data.regressionRecords) {
        await prisma.regressionRecord.upsert({
          where: { id: rr.id },
          update: {},
          create: rr,
        });
      }
    }

    if (data.comments?.length) {
      console.log(`Inserting ${data.comments.length} Comments...`);
      for (const c of data.comments) {
        await prisma.issueComment.upsert({
          where: { id: c.id },
          update: {},
          create: c,
        });
      }
    }

    if (data.attachments?.length) {
      console.log(`Inserting ${data.attachments.length} Attachments...`);
      for (const att of data.attachments) {
        await prisma.issueAttachment.upsert({
          where: { id: att.id },
          update: {},
          create: att,
        });
      }
    }

    if (data.notifications?.length) {
      console.log(`Inserting ${data.notifications.length} Notifications...`);
      for (const n of data.notifications) {
        await prisma.notification.upsert({
          where: { id: n.id },
          update: {},
          create: n,
        });
      }
    }

    if (data.pushSubscriptions?.length) {
      console.log(`Inserting ${data.pushSubscriptions.length} Push Subscriptions...`);
      for (const ps of data.pushSubscriptions) {
        await prisma.pushSubscription.upsert({
          where: { id: ps.id },
          update: {},
          create: ps,
        });
      }
    }

    if (data.notificationPreferences?.length) {
      console.log(`Inserting ${data.notificationPreferences.length} Notification Preferences...`);
      for (const np of data.notificationPreferences) {
        await prisma.notificationPreference.upsert({
          where: { id: np.id },
          update: {},
          create: np,
        });
      }
    }

    if (data.deadlineReminders?.length) {
      console.log(`Inserting ${data.deadlineReminders.length} Deadline Reminders...`);
      for (const dr of data.deadlineReminders) {
        await prisma.deadlineReminder.upsert({
          where: { id: dr.id },
          update: {},
          create: dr,
        });
      }
    }

    if (data.auditLogs?.length) {
      console.log(`Inserting ${data.auditLogs.length} Audit Logs...`);
      for (const al of data.auditLogs) {
        await prisma.auditLog.upsert({
          where: { id: al.id },
          update: {},
          create: al,
        });
      }
    }

    console.log('\n🎉 ALL DATA IMPORTED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Import error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importDatabase();
