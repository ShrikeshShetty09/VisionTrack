import { PrismaClient, Role, Environment, Priority, IssueStatus, TestResult, RegressionResult } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting VisionTrack Database Seeding...");

  // 1. Clean up existing tables safely in sequence
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.deadlineReminder.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.issueAttachment.deleteMany({});
  await prisma.issueComment.deleteMany({});
  await prisma.regressionRecord.deleteMany({});
  await prisma.testingRecord.deleteMany({});
  await prisma.issueResolution.deleteMany({});
  await prisma.issueStatusHistory.deleteMany({});
  await prisma.issueAssignment.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.software.deleteMany({});
  await prisma.user.deleteMany({});

  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const shrikeshPasswordHash = await bcrypt.hash("041203", 10);
  const irfanPasswordHash = await bcrypt.hash("test@irfan", 10);
  const qaizPasswordHash = await bcrypt.hash("d1@qaiz", 10);
  const srushtiPasswordHash = await bcrypt.hash("d2@srushti", 10);
  const murliPasswordHash = await bcrypt.hash("d3@murli", 10);
  const divyaPasswordHash = await bcrypt.hash("d4@divya", 10);
  const hafeezPasswordHash = await bcrypt.hash("d5@hafeez", 10);
  const jamilPasswordHash = await bcrypt.hash("d6@jamil", 10);

  // 2. Create Users
  console.log("👤 Creating Admin, Testers, and Developers with requested credentials...");

  const admin = await prisma.user.create({
    data: {
      name: "Umar Farooq (Admin)",
      email: "admin@visiondatalabs.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
      notificationPreferences: {
        create: { desktopPush: true, email: true },
      },
    },
  });

  const testers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Shrikesh Shetty",
        email: "Shrikesh@2006",
        passwordHash: shrikeshPasswordHash,
        role: Role.TESTER,
        isActive: true,
        notificationPreferences: { create: {} },
      },
    }),
    prisma.user.create({
      data: {
        name: "Irfan (QA Tester)",
        email: "Irfan@2026",
        passwordHash: irfanPasswordHash,
        role: Role.TESTER,
        isActive: true,
        notificationPreferences: { create: {} },
      },
    }),
  ]);

  const developers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Qaiz",
        email: "Qaiz@01",
        passwordHash: qaizPasswordHash,
        role: Role.DEVELOPER,
        isActive: true,
        notificationPreferences: { create: {} },
      },
    }),
    prisma.user.create({
      data: {
        name: "Srushti",
        email: "Srushti@02",
        passwordHash: srushtiPasswordHash,
        role: Role.DEVELOPER,
        isActive: true,
        notificationPreferences: { create: {} },
      },
    }),
    prisma.user.create({
      data: {
        name: "Murli",
        email: "Murli@03",
        passwordHash: murliPasswordHash,
        role: Role.DEVELOPER,
        isActive: true,
        notificationPreferences: { create: {} },
      },
    }),
    prisma.user.create({
      data: {
        name: "Divya",
        email: "Divya@04",
        passwordHash: divyaPasswordHash,
        role: Role.DEVELOPER,
        isActive: true,
        notificationPreferences: { create: {} },
      },
    }),
    prisma.user.create({
      data: {
        name: "Hafeez",
        email: "Hafeez@05",
        passwordHash: hafeezPasswordHash,
        role: Role.DEVELOPER,
        isActive: true,
        notificationPreferences: { create: {} },
      },
    }),
    prisma.user.create({
      data: {
        name: "Jamil",
        email: "Jamil@06",
        passwordHash: jamilPasswordHash,
        role: Role.DEVELOPER,
        isActive: true,
        notificationPreferences: { create: {} },
      },
    }),
  ]);

  // 3. Create Software Suites and Modules
  console.log("📦 Creating Software Suites & Hierarchical Modules...");

  const softwareMasters = await prisma.software.create({
    data: {
      name: "Masters",
      code: "MST",
      description: "Core master records: parties, commodities, billing heads, banks, locations, vessels, and DSR.",
      modules: {
        create: [
          { name: "Party & Client", description: "Customer, shipper, consignee and vendor master management" },
          { name: "Commodity", description: "Harmonized freight commodity and cargo classification" },
          { name: "Package Type", description: "Standard container, pallet, and carton package dimensions" },
          { name: "Billing Head", description: "Revenue and expense ledger charge heads" },
          { name: "Bill Head Group", description: "Charge categorization and tax grouping" },
          { name: "Banks", description: "Corporate and client banking transaction details" },
          { name: "General Disputes", description: "Dispute categories and escalation matrices" },
          { name: "Location", description: "Port of loading, discharge, and transit hubs" },
          { name: "Vessel", description: "Vessel identification, IMO numbers, and carrier lines" },
          { name: "Voyage", description: "Voyage schedule, call signs, and rotation numbers" },
          { name: "DSR Master", description: "Daily Status Report templates and milestone configurations" },
        ],
      },
    },
    include: { modules: true },
  });

  const softwareBooking = await prisma.software.create({
    data: {
      name: "Booking",
      code: "BKG",
      description: "Freight booking operations across Sea, Air, Renewable Energy, and Local jobs.",
      modules: {
        create: [
          { name: "Sea Exports", description: "Ocean freight export shipment booking and container allocation" },
          { name: "Sea Imports", description: "Ocean freight import clearance, delivery orders, and IGM" },
          { name: "Air Exports", description: "Air freight export AWB creation and airline reservation" },
          { name: "Air Imports", description: "Air freight import manifest, CAN, and cargo delivery" },
          { name: "Renewable Energy", description: "Specialized green energy logistics, solar & wind transport" },
          { name: "Local Jobs", description: "Domestic transportation, CFS, and warehousing assignments" },
          { name: "Shipment HandOver", description: "Custody transfer, customs handover, and gate pass processing" },
        ],
      },
    },
    include: { modules: true },
  });

  const softwareBookingReports = await prisma.software.create({
    data: {
      name: "Booking Reports",
      code: "BKREP",
      description: "Operational reporting, daily trackers, sailing schedules, and job status analytics.",
      modules: {
        create: [
          { name: "Master Report", description: "Consolidated booking operations master log" },
          { name: "Daily Report", description: "Day-to-day operations and movement updates" },
          { name: "DSR Report", description: "Daily Status Reports generated for clients" },
          { name: "Booking Summary", description: "Periodic booking volume, TEU, and tonnage summary" },
          { name: "Sailing Report", description: "Vessel departure, ETA/ETD, and transit status" },
          { name: "Gate-In Report", description: "Container yard and CFS gate-in verifications" },
          { name: "Office Report", description: "Branch and department performance tracking" },
          { name: "Telex Report", description: "Telex release approvals and cargo surrender messages" },
          { name: "Document Dispatch", description: "Bill of Lading and document courier tracking" },
          { name: "Job close", description: "Job operational closure checklist and signoff" },
          { name: "Job Status Report", description: "Real-time lifecycle tracking of open bookings" },
        ],
      },
    },
    include: { modules: true },
  });

  const softwareAccounts = await prisma.software.create({
    data: {
      name: "Accounts",
      code: "ACC",
      description: "Financial transactions, sales & purchase entries, receivables, payables, debit notes, and bank ledgers.",
      modules: {
        create: [
          { name: "Air Sale Purchase Entry", description: "Air freight billing and cost vouchers" },
          { name: "Entity P&L Report", description: "Shipment and company profit & loss calculations" },
          { name: "Sale Purchase Entry", description: "Ocean and general freight invoice entries" },
          { name: "HBL/MBL (PREPAID COLLECT)", description: "Freight prepaid and collect split management" },
          { name: "Overseas Entry", description: "Foreign agent debit/credit notes and currency exchange" },
          { name: "Multiple Job", description: "Multi-job batch billing and consolidation" },
          { name: "Receivable", description: "Client invoice aging and outstanding collections" },
          { name: "Payable", description: "Carrier and vendor disbursement schedule" },
          { name: "Tally Bill Export", description: "XML integration and export to Tally ERP" },
          { name: "FTZ Summary", description: "Free Trade Zone duty exemption and transaction logs" },
          { name: "Air Receivable", description: "Air cargo client outstanding statements" },
          { name: "Air Payable", description: "Airline freight payment ledger" },
          { name: "Debit Note", description: "Additional charge issuance and supplementary invoices" },
          { name: "Overhead Expenses", description: "Office, admin, and indirect operational costs" },
          { name: "Opening Balance", description: "Fiscal year account initialization balances" },
          { name: "Bank Reconciliation", description: "Bank statement vs cash ledger automated matching" },
          { name: "Bank Ledger", description: "Detailed banking transactions and cheque records" },
          { name: "On Account Creation", description: "Advance receipt and customer on-account ledger allocation" },
        ],
      },
    },
    include: { modules: true },
  });

  const softwareAccountsReport = await prisma.software.create({
    data: {
      name: "Accounts Report",
      code: "ACCREP",
      description: "Financial quality audit reports, tax compliance, statements of account, and duty payables.",
      modules: {
        create: [
          { name: "Register Reports", description: "Sales, Purchase, and Journal registers" },
          { name: "Outstanding Reports", description: "Debtors and creditors balance aging analysis" },
          { name: "Profit & Loss Reports", description: "Income statements and gross margin audits" },
          { name: "Job Status Report", description: "Financial job closure and margin realization" },
          { name: "Statement of Account", description: "Customer running ledger and balance certificates" },
          { name: "Duty Payable Reports", description: "Customs duty payment and advance tracking" },
          { name: "Proforma Reports", description: "Draft invoice estimates and quotation tracking" },
          { name: "Tax Reports", description: "GST, TDS, and statutory tax filing summaries" },
          { name: "job report", description: "Comprehensive job cost sheet and profitability report" },
          { name: "Adjustment Amount Report", description: "Round-off, discount, and journal adjustment audits" },
        ],
      },
    },
    include: { modules: true },
  });

  // 4. Create Sample Issues covering all statuses & workflows
  console.log("🐞 Creating 22 comprehensive issues with full lifecycle and timeline...");

  const now = new Date();

  // Helper date creators
  const pastHours = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const futureHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

  const sampleIssuesData = [
    // 1. RESOLVED issue (Full lifecycle: New -> Assigned -> In Progress -> Fixed -> Tested -> Regression -> Resolved)
    {
      code: "VT-000101",
      title: "GST 18% calculation difference on fractional currency conversions",
      desc: "When an invoice with 3 items is generated in USD and converted to INR, the roundoff logic produces a ₹0.01 mismatch on the SGST row compared to the grand total.",
      software: softwareAccounts,
      module: softwareAccounts.modules[0],
      env: Environment.PRODUCTION,
      priority: Priority.HIGH,
      status: IssueStatus.RESOLVED,
      tester: testers[0],
      dev: developers[0],
      deadline: pastHours(24),
      createdHours: 72,
      resolution: {
        text: "Applied Banker's Rounding (half-to-even) uniformly across line-item tax calculations before summing to the grand total.",
        rootCause: "Floating point precision discrepancy in JavaScript `Math.round()` prior to standard decimal rounding.",
        files: "src/services/tax/gstCalculator.ts, src/utils/currency.ts",
        commit: "git: 8a93ef0",
      },
      testing: {
        result: TestResult.PASS,
        notes: "Tested 50 multi-currency invoice variations with odd cents. All tax totals match down to the exact paisa.",
      },
      regression: {
        result: RegressionResult.PASS,
        notes: "GSTR-1 export and PDF invoice generation verified. No side-effects found in domestic INR invoices.",
      },
    },

    // 2. FIXED - AWAITING TESTING
    {
      code: "VT-000102",
      title: "PDF invoice generation fails with 500 error for names with special characters",
      desc: "Customer names containing accents (e.g. René, François) or ampersands causes pdfmake library to crash with an unhandled unicode font error.",
      software: softwareAccounts,
      module: softwareAccounts.modules[1],
      env: Environment.TESTING,
      priority: Priority.CRITICAL,
      status: IssueStatus.FIXED,
      tester: testers[1],
      dev: developers[1],
      deadline: futureHours(5),
      createdHours: 20,
      resolution: {
        text: "Registered custom Roboto Unicode TTF font pack and sanitized customer input string encoding prior to PDF doc definition.",
        rootCause: "Standard PDF-1.4 base fonts do not support extended Latin unicode glyphs without embedded font definition.",
        files: "src/services/pdf/invoiceTemplate.ts, public/fonts/Roboto-Regular.ttf",
        commit: "git: 4b29c1e",
      },
    },

    // 3. TESTING IN PROGRESS
    {
      code: "VT-000103",
      title: "Payment webhook retry loop occurs on timeout response from Razorpay",
      desc: "If Razorpay webhook acknowledgement takes more than 5000ms, our handler does not commit the idempotency key, causing 4 duplicate payment confirmation records.",
      software: softwareAccounts,
      module: softwareAccounts.modules[2],
      env: Environment.PRODUCTION,
      priority: Priority.CRITICAL,
      status: IssueStatus.TESTING_IN_PROGRESS,
      tester: testers[0],
      dev: developers[3],
      deadline: futureHours(3),
      createdHours: 16,
      resolution: {
        text: "Moved idempotency key insertion to atomic transaction before async notification dispatch and wrapped webhook in Redis distributed lock.",
        rootCause: "Race condition between webhook handler timeout and background email queue execution.",
        files: "src/api/webhooks/razorpay.ts",
        commit: "git: 10ef82c",
      },
    },

    // 4. TESTED - REGRESSION PENDING
    {
      code: "VT-000104",
      title: "Stock quantity goes negative when simultaneous orders checkout last item",
      desc: "When two users purchase stock quantity = 1 simultaneously, both orders succeed, leading to warehouse stock of -1.",
      software: softwareBooking,
      module: softwareBooking.modules[0],
      env: Environment.PRODUCTION,
      priority: Priority.CRITICAL,
      status: IssueStatus.TESTED,
      tester: testers[0],
      dev: developers[2],
      deadline: futureHours(8),
      createdHours: 36,
      resolution: {
        text: "Added PostgreSQL SELECT ... FOR UPDATE pessimistic row-level locking on inventory item record during order checkout transaction.",
        rootCause: "Read-Modify-Write pattern without database row lock.",
        files: "src/services/inventory/checkoutService.ts",
        commit: "git: 9d83ac2",
      },
      testing: {
        result: TestResult.PASS,
        notes: "Simulated 100 concurrent checkout requests for a single unit. Exactly 1 succeeded, 99 received Out of Stock error.",
      },
    },

    // 5. IN REVIEW
    {
      code: "VT-000105",
      title: "MFA TOTP QR code scan fails with Google Authenticator on Android 14",
      desc: "The otpauth URI generated lacks the issuer parameter in the label portion, triggering invalid issuer warning on latest Google Authenticator version.",
      software: softwareMasters,
      module: softwareMasters.modules[0],
      env: Environment.TESTING,
      priority: Priority.HIGH,
      status: IssueStatus.IN_REVIEW,
      tester: testers[1],
      dev: developers[0],
      deadline: futureHours(6),
      createdHours: 12,
    },

    // 6. IN PROGRESS
    {
      code: "VT-000106",
      title: "Barcode scanner input buffer truncates last 2 digits on fast scanning",
      desc: "When warehouse operators scan items rapidly (>3 scans per second), keyup listener drops characters from USB HID buffer.",
      software: softwareBooking,
      module: softwareBooking.modules[1],
      env: Environment.DEV,
      priority: Priority.MEDIUM,
      status: IssueStatus.IN_PROGRESS,
      tester: testers[0],
      dev: developers[4],
      deadline: futureHours(14),
      createdHours: 8,
    },

    // 7. ASSIGNED (Near Deadline - 30 min)
    {
      code: "VT-000107",
      title: "Support ticket file attachment silently fails for files larger than 10MB",
      desc: "No error message is displayed when customer uploads a 12MB diagnostic log. The upload spinner runs indefinitely.",
      software: softwareMasters,
      module: softwareMasters.modules[2],
      env: Environment.PRODUCTION,
      priority: Priority.HIGH,
      status: IssueStatus.ASSIGNED,
      tester: testers[0],
      dev: developers[0],
      deadline: futureHours(0.4), // ~24 mins remaining
      createdHours: 4,
    },

    // 8. OVERDUE ISSUE
    {
      code: "VT-000108",
      title: "ETL Batch Ingestion drops decimal points for European formatted revenue numbers",
      desc: "Values with comma decimals (e.g. 1.450,50 €) are parsed as integers in midnight sync job.",
      software: softwareBookingReports,
      module: softwareBookingReports.modules[0],
      env: Environment.PRODUCTION,
      priority: Priority.CRITICAL,
      status: IssueStatus.IN_PROGRESS,
      tester: testers[1],
      dev: developers[1],
      deadline: pastHours(6), // Overdue by 6 hours
      createdHours: 48,
    },

    // 9. REOPENED (Failed Testing)
    {
      code: "VT-000109",
      title: "Courier API webhook returns 401 on tracking status updates",
      desc: "Webhook secret comparison is case-sensitive, failing for Bluedart lowercase authorization header.",
      software: softwareBooking,
      module: softwareBooking.modules[2],
      env: Environment.TESTING,
      priority: Priority.HIGH,
      status: IssueStatus.REOPENED,
      tester: testers[0],
      dev: developers[2],
      deadline: futureHours(10),
      createdHours: 50,
      resolution: {
        text: "Normalized auth header to lower case before checking against HMAC signature.",
        rootCause: "Direct string match against header dictionary.",
        files: "src/api/webhooks/bluedart.ts",
        commit: "git: 77a1bc8",
      },
      testing: {
        result: TestResult.FAIL,
        notes: "Webhook now accepts lowercase header, but signature calculation still uses raw body which was corrupted by JSON parser middleware. Reopening.",
      },
    },

    // 10. NEW (Unassigned)
    {
      code: "VT-000110",
      title: "Scheduled CSV export email contains corrupted UTF-8 BOM characters in Excel",
      desc: "Opening exported customer analytics CSV directly in Microsoft Excel on Windows displays mojibake characters in header column.",
      software: softwareBookingReports,
      module: softwareBookingReports.modules[2],
      env: Environment.TESTING,
      priority: Priority.LOW,
      status: IssueStatus.NEW,
      tester: testers[0],
      dev: null,
      deadline: null,
      createdHours: 2,
    },

    // Additional issues to populate rich analytics
    {
      code: "VT-000111",
      title: "GSTR-3B tax report export sums negative credit notes incorrectly",
      desc: "Section 4(A)(5) all other ITC is overstated by credit note adjustment values.",
      software: softwareAccounts,
      module: softwareAccounts.modules[3],
      env: Environment.PRODUCTION,
      priority: Priority.HIGH,
      status: IssueStatus.RESOLVED,
      tester: testers[0],
      dev: developers[3],
      deadline: pastHours(48),
      createdHours: 96,
      resolution: {
        text: "Corrected SQL aggregation query to apply conditional subtraction for credit notes with invoice type CN-01.",
        rootCause: "Absolute value sum applied instead of signed invoice amount sum.",
        files: "src/services/reports/gstr3b.ts",
        commit: "git: 33f1190",
      },
      testing: {
        result: TestResult.PASS,
        notes: "Matched with official GST portal offline utility JSON schema.",
      },
      regression: {
        result: RegressionResult.PASS,
        notes: "GSTR-1 and sales register verified.",
      },
    },
    {
      code: "VT-000112",
      title: "API Key usage rate limiter returns 429 too early during burst traffic",
      desc: "Token bucket algorithm decrements 5 tokens instead of 1 on parallel POST requests.",
      software: softwareMasters,
      module: softwareMasters.modules[3],
      env: Environment.PRODUCTION,
      priority: Priority.MEDIUM,
      status: IssueStatus.RESOLVED,
      tester: testers[1],
      dev: developers[4],
      deadline: pastHours(30),
      createdHours: 60,
      resolution: {
        text: "Fixed Redis Lua script to use atomic sliding window counter.",
        rootCause: "Race condition in multiple GET / INCR round trips.",
        files: "src/middleware/rateLimiter.ts",
        commit: "git: dd99812",
      },
      testing: {
        result: TestResult.PASS,
        notes: "1000 burst requests tested. Rate limit triggered at exactly 100 req/min limit.",
      },
      regression: {
        result: RegressionResult.PASS,
        notes: "Normal API clients unaffected.",
      },
    },
    {
      code: "VT-000113",
      title: "Dispatch label barcode height does not meet Indian Postal 30mm standard",
      desc: "Thermal printer prints 1D Code128 barcode at 18mm height, causing automated sorter rejection at hub.",
      software: softwareBooking,
      module: softwareBooking.modules[2],
      env: Environment.PRODUCTION,
      priority: Priority.HIGH,
      status: IssueStatus.IN_PROGRESS,
      tester: testers[0],
      dev: developers[2],
      deadline: futureHours(18),
      createdHours: 15,
    },
    {
      code: "VT-000114",
      title: "Real-time metrics stream disconnects after 60 seconds on Chrome mobile",
      desc: "SSE / WebSocket connection does not send keep-alive heartbeat ping every 25 seconds.",
      software: softwareBookingReports,
      module: softwareBookingReports.modules[1],
      env: Environment.DEV,
      priority: Priority.MEDIUM,
      status: IssueStatus.ASSIGNED,
      tester: testers[0],
      dev: developers[1],
      deadline: futureHours(22),
      createdHours: 10,
    },
    {
      code: "VT-000115",
      title: "Subscription downgrade modal shows incorrect prorated refund value",
      desc: "Proration formula calculates 31 days for February billing cycle.",
      software: softwareMasters,
      module: softwareMasters.modules[1],
      env: Environment.PRODUCTION,
      priority: Priority.MEDIUM,
      status: IssueStatus.IN_REVIEW,
      tester: testers[1],
      dev: developers[0],
      deadline: futureHours(7),
      createdHours: 18,
    },
    {
      code: "VT-000116",
      title: "Invoice PDF watermark 'ORIGINAL FOR RECIPIENT' overlaps with header table",
      desc: "On multi-page invoices with >15 items, page 2 header overlaps with background canvas watermark.",
      software: softwareAccounts,
      module: softwareAccounts.modules[1],
      env: Environment.TESTING,
      priority: Priority.LOW,
      status: IssueStatus.RESOLVED,
      tester: testers[0],
      dev: developers[0],
      deadline: pastHours(100),
      createdHours: 120,
      resolution: {
        text: "Adjusted PDF z-index layer and opacity to 0.08, added explicit margin top on repeating table headers.",
        rootCause: "Static absolute positioning in pdfmake layout.",
        files: "src/services/pdf/invoiceRenderer.ts",
        commit: "git: f281729",
      },
      testing: {
        result: TestResult.PASS,
        notes: "Tested 1-page, 3-page, and 10-page invoice outputs. Clean alignment.",
      },
      regression: {
        result: RegressionResult.PASS,
        notes: "Debit notes and receipt vouchers also verified.",
      },
    },
    {
      code: "VT-000117",
      title: "Stock sync fails with deadlock exception during flash sale bulk order processing",
      desc: "PostgreSQL log shows Deadlock detected between process A and process B updating warehouse stock.",
      software: softwareBooking,
      module: softwareBooking.modules[0],
      env: Environment.PRODUCTION,
      priority: Priority.CRITICAL,
      status: IssueStatus.RESOLVED,
      tester: testers[0],
      dev: developers[3],
      deadline: pastHours(150),
      createdHours: 180,
      resolution: {
        text: "Enforced deterministic item ID sorting before locking rows in multi-item order checkouts.",
        rootCause: "Opposing lock acquisition order across concurrent cart checkouts.",
        files: "src/services/inventory/lockManager.ts",
        commit: "git: ee4819a",
      },
      testing: {
        result: TestResult.PASS,
        notes: "Simulated 500 simultaneous multi-item transactions. Zero deadlocks recorded.",
      },
      regression: {
        result: RegressionResult.PASS,
        notes: "Order throughput increased by 22%.",
      },
    },
    {
      code: "VT-000118",
      title: "User password reset link allows multiple uses within 15 minute expiration",
      desc: "Token is not invalidated upon first successful password change.",
      software: softwareMasters,
      module: softwareMasters.modules[0],
      env: Environment.PRODUCTION,
      priority: Priority.CRITICAL,
      status: IssueStatus.RESOLVED,
      tester: testers[1],
      dev: developers[4],
      deadline: pastHours(200),
      createdHours: 240,
      resolution: {
        text: "Added single-use `usedAt` timestamp and revoked token immediately upon password hash update.",
        rootCause: "Verification only checked `expiresAt > now()` without tracking consumption state.",
        files: "src/services/auth/passwordReset.ts",
        commit: "git: aa87201",
      },
      testing: {
        result: TestResult.PASS,
        notes: "Second attempt with same token correctly responds with 'Link has already been used'.",
      },
      regression: {
        result: RegressionResult.PASS,
        notes: "Registration verification email flow verified.",
      },
    },
    {
      code: "VT-000119",
      title: "Automated weekly sales report email fails to deliver to distribution list",
      desc: "Brevo API returned invalid recipient for semicolons in comma-separated distribution email list.",
      software: softwareAccountsReport,
      module: softwareAccountsReport.modules[2],
      env: Environment.PRODUCTION,
      priority: Priority.HIGH,
      status: IssueStatus.IN_PROGRESS,
      tester: testers[0],
      dev: developers[1],
      deadline: futureHours(30),
      createdHours: 8,
    },
    {
      code: "VT-000120",
      title: "Debit note creation throws 'Module not initialized' in local Docker testing",
      desc: "Missing database migration seed for debit note sequence counter in local environment.",
      software: softwareAccounts,
      module: softwareAccounts.modules[0],
      env: Environment.LOCAL,
      priority: Priority.LOW,
      status: IssueStatus.NEW,
      tester: testers[0],
      dev: null,
      deadline: null,
      createdHours: 1,
    },
    {
      code: "VT-000121",
      title: "Payment gateway reconciliation webhook signature verification fails on load balancer",
      desc: "Reverse proxy converts raw payload into parsed object before signature validator executes.",
      software: softwareAccounts,
      module: softwareAccounts.modules[2],
      env: Environment.PRODUCTION,
      priority: Priority.HIGH,
      status: IssueStatus.TESTING_IN_PROGRESS,
      tester: testers[0],
      dev: developers[3],
      deadline: futureHours(4),
      createdHours: 14,
      resolution: {
        text: "Configured express raw body buffer capture specifically on `/api/webhooks/*` routes.",
        rootCause: "Body parser middleware mutation.",
        files: "src/app/api/webhooks/route.ts",
        commit: "git: cc99100",
      },
    },
    {
      code: "VT-000122",
      title: "Dark mode contrast ratio in table pagination falls below WCAG AA standard",
      desc: "Active page number text color has 2.4:1 contrast ratio against card background in dark theme.",
      software: softwareMasters,
      module: softwareMasters.modules[1],
      env: Environment.DEV,
      priority: Priority.LOW,
      status: IssueStatus.FIXED,
      tester: testers[1],
      dev: developers[2],
      deadline: futureHours(12),
      createdHours: 9,
      resolution: {
        text: "Updated text color from slate-400 to slate-100 with blue-600 background indicator.",
        rootCause: "Incorrect Tailwind class opacity.",
        files: "src/components/ui/Pagination.tsx",
        commit: "git: 66e8810",
      },
    },
  ];

  for (const item of sampleIssuesData) {
    const createdAt = pastHours(item.createdHours);
    const deadlineTimestamp = item.deadline ? item.deadline : null;
    const isOverdue = deadlineTimestamp ? deadlineTimestamp.getTime() < now.getTime() && item.status !== IssueStatus.RESOLVED : false;

    const issue = await prisma.issue.create({
      data: {
        issueCode: item.code,
        title: item.title,
        description: item.desc,
        softwareId: item.software.id,
        moduleId: item.module ? item.module.id : null,
        environment: item.env,
        priority: item.priority,
        status: item.status,
        createdById: item.tester.id,
        assignedDeveloperId: item.dev ? item.dev.id : null,
        deadlineDate: deadlineTimestamp,
        deadlineTime: deadlineTimestamp ? `${String(deadlineTimestamp.getHours()).padStart(2, "0")}:${String(deadlineTimestamp.getMinutes()).padStart(2, "0")}` : null,
        deadlineTimestamp: deadlineTimestamp,
        isOverdue: isOverdue,
        createdAt: createdAt,
        updatedAt: item.status === IssueStatus.RESOLVED ? pastHours(Math.max(1, item.createdHours - 20)) : now,
      },
    });

    // Initial creation history & audit
    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        changedById: item.tester.id,
        fromStatus: IssueStatus.NEW,
        toStatus: item.status === IssueStatus.NEW ? IssueStatus.NEW : IssueStatus.ASSIGNED,
        reason: "Issue reported by QA tester",
        createdAt: createdAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: item.tester.id,
        action: "ISSUE_CREATED",
        entityType: "Issue",
        entityId: issue.id,
        newValue: JSON.stringify({ issueCode: issue.issueCode, title: issue.title, priority: issue.priority }),
        createdAt: createdAt,
      },
    });

    // If assigned, create assignment record
    if (item.dev) {
      const assignTime = new Date(createdAt.getTime() + 15 * 60 * 1000);
      await prisma.issueAssignment.create({
        data: {
          issueId: issue.id,
          developerId: item.dev.id,
          assignedById: item.tester.id,
          deadline: deadlineTimestamp,
          notes: "Please prioritize resolution before deadline.",
          createdAt: assignTime,
        },
      });

      // Notification
      await prisma.notification.create({
        data: {
          userId: item.dev.id,
          issueId: issue.id,
          type: "ISSUE_ASSIGNED",
          title: "New Issue Assigned",
          message: `Issue ${issue.issueCode} — ${issue.title} has been assigned to you.`,
          isRead: item.status === IssueStatus.RESOLVED,
          createdAt: assignTime,
        },
      });
    }

    // If resolution submitted
    if (item.resolution && item.dev) {
      const fixTime = new Date(createdAt.getTime() + 3 * 60 * 60 * 1000);
      const res = await prisma.issueResolution.create({
        data: {
          issueId: issue.id,
          developerId: item.dev.id,
          resolutionText: item.resolution.text,
          rootCause: item.resolution.rootCause,
          filesChanged: item.resolution.files,
          commitRef: item.resolution.commit,
          createdAt: fixTime,
        },
      });

      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          changedById: item.dev.id,
          fromStatus: IssueStatus.IN_REVIEW,
          toStatus: IssueStatus.FIXED,
          reason: "Resolution details submitted by developer",
          createdAt: fixTime,
        },
      });

      await prisma.notification.create({
        data: {
          userId: item.tester.id,
          issueId: issue.id,
          type: "ISSUE_FIXED",
          title: "Issue Fixed — Testing Required",
          message: `Issue ${issue.issueCode} has been marked as Fixed by ${item.dev.name}. Testing is required.`,
          isRead: item.status === IssueStatus.RESOLVED,
          createdAt: fixTime,
        },
      });
    }

    // If testing record
    if (item.testing) {
      const testTime = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
      await prisma.testingRecord.create({
        data: {
          issueId: issue.id,
          testerId: item.tester.id,
          result: item.testing.result,
          testingNotes: item.testing.notes,
          testedAt: testTime,
        },
      });

      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          changedById: item.tester.id,
          fromStatus: IssueStatus.TESTING_IN_PROGRESS,
          toStatus: item.testing.result === TestResult.PASS ? IssueStatus.TESTED : IssueStatus.REOPENED,
          reason: item.testing.result === TestResult.PASS ? "Testing validation passed" : "Testing failed — issue reopened",
          createdAt: testTime,
        },
      });
    }

    // If regression record
    if (item.regression) {
      const regTime = new Date(createdAt.getTime() + 5 * 60 * 60 * 1000);
      await prisma.regressionRecord.create({
        data: {
          issueId: issue.id,
          testerId: item.tester.id,
          result: item.regression.result,
          regressionNotes: item.regression.notes,
          testedAt: regTime,
        },
      });

      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          changedById: item.tester.id,
          fromStatus: IssueStatus.REGRESSION,
          toStatus: IssueStatus.RESOLVED,
          reason: "Regression verification passed — issue resolved successfully",
          createdAt: regTime,
        },
      });
    }

    // Sample comments
    if (item.status !== IssueStatus.NEW) {
      await prisma.issueComment.create({
        data: {
          issueId: issue.id,
          authorId: item.tester.id,
          message: `Reproduction steps verified in ${item.env} environment with reference logs attached.`,
          createdAt: new Date(createdAt.getTime() + 10 * 60 * 1000),
        },
      });

      if (item.dev) {
        await prisma.issueComment.create({
          data: {
            issueId: issue.id,
            authorId: item.dev.id,
            message: "Investigating the root cause. Running regression unit tests locally.",
            createdAt: new Date(createdAt.getTime() + 45 * 60 * 1000),
          },
        });
      }
    }
  }

  console.log("✅ VisionTrack Database Seeded Successfully!");
  console.log("--------------------------------------------------");
  console.log("🔑 Default Login Credentials:");
  console.log("1. Admin: admin@visiondatalabs.com / admin123");
  console.log("2. Tester: Shrikesh@2006 / 041203");
  console.log("3. Developer: rahul.verma@visiondatalabs.com / password123");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
