# Maruti Furniture — Job Card Application
# Master SRS v3.0 — Complete Development Reference
**For: Developers & AI Agents**
**Stack: MERN + Socket.io + WhatsApp BSP + GST API + Puppeteer**

---

## SECTION 1 — SYSTEM IDENTITY

### 1.1 What This System Is
A multi-tenant, multi-role, real-time order-to-delivery tracking system
built for furniture manufacturers. It replaces paper job cards and
manual WhatsApp follow-ups with a single digital system that tracks
every order from first client contact to final payment.

### 1.2 Two Companies, One Codebase
```
Owner (Super Admin — isSuperAdmin: true)
├── Company A: Maruti Furniture (slug: "maruti-furniture")
│   ├── Own clients, quotations, projects, job cards
│   ├── Own staff, roles, permissions
│   └── Own branding (logo, prefix, GST, bank details)
└── Company B: Brand Two (slug: "brand-two")
    ├── Own clients, quotations, projects, job cards
    ├── Own staff, roles, permissions
    └── Own branding
```
**Rule:** Every MongoDB document (except Company) carries `companyId`.
Every API query is scoped to `req.user.companyId`. Zero cross-company leakage.

### 1.3 Core Principle
```
One Quotation → One Project → Multiple Job Cards
One Job Card = One production unit flowing through departments
```

---

## SECTION 2 — USER ROLES

### 2.1 Role Definitions

| Role | Department | Primary Job |
|------|-----------|-------------|
| `super_admin` | Management | Full system access, both companies, user management |
| `sales` | Sales | Client onboarding, quotation creation |
| `design` | Design | Measurements, CAD files, client sign-off |
| `store` | Store | BOM check, inventory, purchase orders |
| `production` | Workshop | Sub-stage tracking, daily progress |
| `qc` | Quality Control | Checklist, pass/fail verdict |
| `dispatch` | Dispatch | Schedule delivery, proof of delivery |
| `accountant` | Accounts | Invoices, payments, GST reports |
| `client` | External | Read-only portal, design sign-off |

### 2.2 Super Admin vs Other Roles
- `super_admin` = the owner. Bypasses ALL permission checks.
  `isSuperAdmin: true` flag on User model.
- All other roles = employees. Subject to `checkPermission()` middleware.
- Super Admin is the only one who can create users, assign roles,
  and manage permissions.
- Super Admin CANNOT be deactivated (system guard).

---

## SECTION 3 — COMPLETE SYSTEM FLOW

### 3.1 Flow Overview
```
[QUOTATION] → [PROJECT] → [JOB CARD] → [DESIGN] → [STORE]
     → [PRODUCTION] → [QC] → [DISPATCH] → [BILLING] → [CLOSED]
```

### 3.2 Stage 1 — Quotation (Entry Point)
**Owner:** Sales / Super Admin
**WhatsApp:** OFF — no group yet
**DB Collections touched:** clients, quotations, Counter

**Steps:**
1. Sales opens /quotations/new
2. Searches existing client OR creates new client
   - On GSTIN entry → auto-calls GST API → fills business name, state, tax type
   - `POST /api/clients` + `POST /api/gst/verify`
3. Builds quotation:
   - Fills: projectName, architect, siteAddress, deliveryDays, validUntil
   - Adds items: each with photo (Cloudinary), description, size, polish,
     fabric, material, qty, MRP, sellingPrice
   - System auto-computes: totalPrice per item, subtotal, discount,
     GST (CGST+SGST or IGST), grandTotal, advanceAmount
   - Adds T&C lines
   - `POST /api/quotations` → status: draft
4. Generates PDF → Puppeteer renders `quotation.ejs`
   - PDF uploaded to Cloudinary → quotation.pdfURL saved
   - `GET /api/quotations/:id/pdf`
5. Sends to client (WhatsApp direct + Email)
   - `PATCH /api/quotations/:id/send` → status: sent
6. Client approves → `PATCH /api/quotations/:id/approve` → status: approved
   - OR client rejects → `POST /api/quotations/:id/revise` → new revision

**Job Card Number Format:** Not yet. Quotation number: `MF-311025-01`

---

### 3.3 Stage 2 — Project Creation
**Owner:** Super Admin
**WhatsApp:** SETUP — group created manually, ID saved to system
**DB Collections touched:** projects, quotations (status update)

**Steps:**
1. Admin opens approved quotation → clicks "Convert to Project"
2. System creates project:
   - Copies from quotation: projectName, architect, siteAddress, clientId
   - Admin sets: priority, expectedDelivery, assignedStaff[]
   - quotation.status → converted, quotation.projectId set
   - `POST /api/projects`
3. Admin creates WhatsApp group manually on phone:
   - Group name: "MF-26-001 | GMP Office | Ram Tiwari"
   - Adds all assigned staff manually
   - Then pastes group ID + invite link into system
   - `PATCH /api/projects/:id/whatsapp`
4. project.status → active

---

### 3.4 Stage 3 — Job Card Creation
**Owner:** Super Admin
**WhatsApp:** ON — first message fires here
**DB Collections touched:** jobCards, Counter, notifications

**Steps:**
1. Admin opens project → clicks "Create Job Card"
2. Selects which quotation items go into this job card
   (one project can have multiple job cards)
3. Fills: title, assignedTo (per department), priority, expectedDelivery
4. System auto-generates jobCardNumber: `MF-26-011`
   (Counter collection: `{companyId}_jobcard` seq++)
5. `POST /api/jobcards` → status: active
6. Job Card PDF generated → Puppeteer renders `jobcard.ejs`
   Simple format: meta table + item photos + specs
7. WA notification fires:
   Template: `job_card_created`
   To: WA group (all staff)
   Variables: { jcNumber, client, project, priority, dueDate, designer }
8. In-app notifications sent to all assignedTo users
9. Socket.io event fires → dashboard refreshes live

---

### 3.5 Stage 4 — Design Stage
**Owner:** Design team
**WhatsApp:** ON
**DB Collections touched:** designRequests, jobCards

**Trigger:** Job card created. DesignRequest document auto-created
and linked via `jobCard.designRequestId`.

**Steps:**
1. Design team opens job card → Design tab
2. DesignRequest document created (if not exists):
   `POST /api/jobcards/:id/design`
3. Design team fills measurements per item (H×W×D in mm):
   `PUT /api/jobcards/:id/design`
   - measurements[], materials{}, specialInstructions
4. Uploads files (CAD, renders, PDFs):
   `POST /api/jobcards/:id/design/files`
   - Uploaded to Cloudinary → URL saved in designRequest.files[]
5. (Optional) Client sign-off:
   - System generates secure UUID token link (time-limited, no login needed)
   - `POST /api/jobcards/:id/design/signoff`
   - Client receives WA direct + email with link
   - Client reviews drawings → approves or rejects with feedback
   - designRequest.signoffStatus updated, IP + timestamp logged
6. Design marks ready:
   `PATCH /api/jobcards/:id/design/ready`
   - designRequest.status → approved
   - jobCard.status → in_store
   - StoreStage document AUTO-CREATED
   - WA template `design_ready` fires → Store notified

---

### 3.6 Stage 5 — Store Stage
**Owner:** Store team
**WhatsApp:** ON
**DB Collections touched:** storeStages, inventory, purchaseOrders, jobCards

**Trigger:** Design marked ready. storeStages document already created.

**Steps:**
1. Store opens job card → Store tab
   `GET /api/jobcards/:id/store`
   - BOM auto-populated from designRequest.materials
   - System checks inventory for each material: required vs inStock
2. Reviews BOM:
   `PUT /api/jobcards/:id/store/bom`
3a. If stock sufficient for all items:
    Store marks each item issued:
    `PATCH /api/jobcards/:id/store/issue/:bomItemId`
    - storeStage.bom[item].issued = true
3b. If stock insufficient:
    Raises Purchase Order:
    `POST /api/purchase-orders`
    - PO linked to jobCardId
    - Admin + Accountant notified (in-app)
    - WA template `low_stock_alert` fires
    - storeStage.status → po_raised
    - Once PO received: `PATCH /api/purchase-orders/:id/receive`
      → inventory.currentStock updated
4. All materials issued → `PATCH /api/jobcards/:id/store/issue-all`
   - storeStage.allMaterialsIssued = true
   - storeStage.status → material_ready
   - jobCard.status → in_production
   - ProductionStage document AUTO-CREATED
   - WA template `materials_issued` fires

---

### 3.7 Stage 6 — Production Stage
**Owner:** Production team
**WhatsApp:** ON (each substage)
**DB Collections touched:** productionStages, jobCards, notifications

**Trigger:** Materials issued. productionStages document already created.
8 sub-stages pre-populated with status: pending.

**Sub-stages (in order):**
```
1. cutting
2. edge_banding
3. cnc_drilling
4. assembly
5. polishing
6. finishing
7. hardware_fitting
8. packing
```

**Steps:**
1. Production opens job card → Production tab (mobile-friendly)
   `GET /api/jobcards/:id/production`
2. Updates each substage as work progresses:
   `PATCH /api/jobcards/:id/production/substage`
   Body: { substage: "cutting", status: "done", workerName: "Ramesh" }
   - completedAt timestamp saved
   - WA template `substage_complete` fires to group
   - Socket.io event → admin dashboard live update
3. Adds progress notes any time:
   `POST /api/jobcards/:id/production/note`
4. If material missing mid-job:
   `PATCH /api/jobcards/:id/production/shortage`
   - materialShortage flag set
   - Store + Admin alerted (in-app + WA direct)
5. All sub-stages done → marks production complete:
   `PATCH /api/jobcards/:id/production/done`
   - productionStage.status → done
   - jobCard.status → qc_pending
   - QcStage document AUTO-CREATED
   - WA template fires → QC notified

**Exception — Overdue:**
Cron job (`deadlineChecker.js`) runs daily:
- If expectedDelivery within 3 days → WA `job_overdue` to Admin
- If past expectedDelivery → daily alert until resolved

---

### 3.8 Stage 7 — QC Stage
**Owner:** QC team
**WhatsApp:** ON
**DB Collections touched:** qcStages, jobCards, notifications

**Trigger:** Production done. qcStages document already created.

**Checklist parameters (default):**
- Dimensions accuracy
- Finish quality
- Hardware fitting
- Structural integrity
- Laminate / polish quality

**Steps:**
1. QC opens job card → QC tab
   `GET /api/jobcards/:id/qc`
2. Fills checklist: each parameter → passed: true/false + notes
   `PUT /api/jobcards/:id/qc/checklist`
3. Uploads defect photos if any issues:
   `POST /api/jobcards/:id/qc/defect-photos`
   - Uploaded to Cloudinary → qcStage.defectPhotos[]

**Path A — PASS:**
`PATCH /api/jobcards/:id/qc/pass`
- qcStage.verdict = pass
- QC Certificate PDF auto-generated (Puppeteer → `qccertificate.ejs`)
  URL saved in qcStage.certificateURL
- jobCard.status → qc_passed
- DispatchStage document AUTO-CREATED
- WA template `qc_passed` fires → Dispatch notified

**Path B — FAIL:**
`PATCH /api/jobcards/:id/qc/fail`
- qcStage.verdict = fail
- qcStage.reworkCount++
- Rework entry added to qcStage.reworkHistory[]
- jobCard.status → qc_failed → back to in_production
- WA template `qc_failed` fires → Production + Admin
- **If reworkCount > 2:**
  - qcStage.escalated = true
  - Super Admin directly notified (in-app + WA direct)

---

### 3.9 Stage 8 — Dispatch Stage
**Owner:** Dispatch team
**WhatsApp:** ON
**DB Collections touched:** dispatchStages, jobCards, notifications

**Trigger:** QC passed. dispatchStages document already created.

**Steps:**
1. Dispatch opens job card → Dispatch tab
   `GET /api/jobcards/:id/dispatch`
2. Schedules delivery:
   `POST /api/jobcards/:id/dispatch`
   Body: { scheduledDate, timeSlot, deliveryTeam[], vehicle{} }
   - jobCard.status → dispatched
   - Challan PDF auto-generated (Puppeteer → `challan.ejs`)
     URL saved in dispatchStage.challanPDF
   - WA template `delivery_scheduled` fires → CLIENT DIRECT
     Variables: { jcNumber, date, timeSlot, vehicleNo, driver }
3. On delivery day — marks items dispatched one by one:
   `PUT /api/jobcards/:id/dispatch`
4. Captures proof of delivery:
   `PATCH /api/jobcards/:id/dispatch/deliver`
   Body: { proofPhoto (Cloudinary URL), clientSignature, gpsLocation }
   - jobCard.status → delivered
   - jobCard.actualDelivery = now
   - WA template `job_delivered` fires → Group + Client direct
   - Accountant notified to generate invoice

---

### 3.10 Stage 9 — Billing & Closure
**Owner:** Accountant + Super Admin
**WhatsApp:** ON
**DB Collections touched:** invoices, jobCards, notifications

**Steps:**
1. Accountant opens job card → Finance tab
2. Creates invoice from approved quotation:
   `POST /api/invoices`
   Body: { jobCardIds[], quotationId, items[], gstType }
   - GST auto-calculated from client GSTIN state vs company state
   - Invoice number auto-generated: `MF-INV-2026-001`
   - Invoice PDF generated (Puppeteer → `invoice.ejs`)
   - WA template fires → invoice sent to client direct
   - invoice.status → sent
3. Records advance payment:
   `POST /api/invoices/:id/payment`
   Body: { amount, mode: "upi", reference: "UPI123", paidAt }
4. Records balance payment (same endpoint)
   - When total paid = grandTotal: invoice.status → paid
5. If payment overdue (cron job):
   - Auto WA reminder to client
   - invoice.status → overdue
6. Super Admin closes job card:
   `PATCH /api/jobcards/:id/close`
   Body: { warrantyNotes, punchListItems[] }
   - jobCard.status → closed
   - jobCard.closedAt, closedBy saved
   - Activity log entry (immutable)
   - WA template `job_closed` fires → full group (final message)
   - Can save as template: jobCard.isTemplate = true

---

## SECTION 4 — USER MANAGEMENT FLOW

### 4.1 Create Employee
**Who can do this:** Super Admin only
**API:** `POST /api/users`

```
Super Admin fills:
  name, email, phone, whatsappNumber
  role (dropdown: sales/design/store/production/qc/dispatch/accountant)
  department (auto-suggested from role)
  password (manual or auto-generated)
  profilePhoto (optional, Cloudinary)

System does automatically:
  1. Creates User document with companyId
  2. Creates UserPermission document:
     { userId, roleId (matching role), effectivePermissions: [...role.permissions] }
  3. Sends welcome email with login credentials (Nodemailer)
```

### 4.2 Change Role
**API:** `PATCH /api/users/:id/role`
```
Body: { role: "design" }
System:
  1. Updates user.role
  2. Finds matching Role document
  3. Updates UserPermission.roleId
  4. Calls resolvePermissions(userId) → rebuilds effectivePermissions cache
  5. In-app notification to user
```

### 4.3 Grant Extra Permission
**API:** `POST /api/privileges/users/:userId/grant`
```
Body: {
  permission: "invoice.view",
  reason: "Senior sales — needs financial visibility",
  expiresAt: null   ← permanent. Set date for temporary.
}
System:
  1. Adds to UserPermission.overrides[] with type: "grant"
  2. Calls resolvePermissions(userId) → cache rebuilt
  3. AccessLog entry created
```

### 4.4 Deny a Default Permission
**API:** `POST /api/privileges/users/:userId/deny`
```
Body: {
  permission: "productionStage.edit",
  reason: "New hire — restricted until trained",
  expiresAt: "2026-04-01T00:00:00Z"
}
Priority rule: DENY always beats GRANT beats role default.
```

### 4.5 Assign Employee to Job Card
```
At job card creation:
  POST /api/jobcards
  Body.assignedTo: {
    design: [userId1],
    store: [userId2],
    production: [userId3, userId4],
    qc: [userId5],
    dispatch: [userId6],
    accountant: [userId7]
  }

After creation (reassign):
  PATCH /api/jobcards/:id/assign
  Body: { department: "production", userIds: [userId8] }
  → In-app notification to new assignee
  → Activity log entry
```

### 4.6 Deactivate Employee
**API:** `PATCH /api/users/:id/deactivate`
```
System:
  1. user.isActive = false
  2. All active JWT tokens invalidated (token blacklist or version bump)
  3. User removed from future job card assignment dropdowns
  4. Existing job card assignments remain (historical record)
  5. Email sent to user
```

---

## SECTION 5 — PERMISSION SYSTEM

### 5.1 resolvePermissions Algorithm
Runs whenever: role changes, override added/removed, permission set updated.

```
1. Start with Role.permissions[] (role defaults)
2. Add all PermissionSet.permissions[] assigned to user (additive)
3. Apply overrides:
   - Filter out expired overrides (expiresAt < now)
   - Apply GRANT overrides: add to set
   - Apply DENY overrides: remove from set (DENY always wins)
4. Save result to UserPermission.effectivePermissions[] (cache)
```

### 5.2 Middleware Chain (every API request)
```
Request
  → authenticateJWT      → decode JWT → attach req.user → 401 if invalid
  → attachCompany        → fetch Company → attach req.company → 404 if not found
  → checkPermission(x.y) → read effectivePermissions → 403 if denied
                           → write to AccessLog (allowed or denied)
  → injectCompanyScope   → set req.scopeFilter = { companyId }
                           → for non-super_admin: add dept assignment filter
  → Controller           → always uses req.scopeFilter in DB queries
```

### 5.3 Complete Permission List

```
# CLIENT
client.create | client.view | client.edit | client.delete | client.verify_gst

# QUOTATION
quotation.create | quotation.view | quotation.edit | quotation.send
quotation.approve | quotation.reject

# PROJECT
project.create | project.view | project.edit

# JOB CARD (core)
jobcard.create | jobcard.view | jobcard.edit | jobcard.export
jobcard.close | jobcard.assign | jobcard.override_status

# DESIGN STAGE
designrequest.create | designrequest.view | designrequest.edit
designrequest.upload | designrequest.signoff | designrequest.ready

# STORE STAGE
storeStage.view | storeStage.edit | storeStage.issue

# PRODUCTION STAGE
productionStage.view | productionStage.edit

# QC STAGE
qcStage.view | qcStage.edit | qcStage.pass | qcStage.fail

# DISPATCH STAGE
dispatchStage.view | dispatchStage.edit | dispatchStage.deliver

# INVOICE
invoice.create | invoice.view | invoice.edit | invoice.send | invoice.payment

# INVENTORY
inventory.create | inventory.view | inventory.edit

# PURCHASE ORDER
purchaseOrder.create | purchaseOrder.view | purchaseOrder.edit | purchaseOrder.approve

# REPORTS
reports.view_financial | reports.view_production | reports.view_delivery | reports.export

# USER MANAGEMENT
user.create | user.view | user.edit | user.deactivate

# PRIVILEGES
privilege.view | privilege.grant | privilege.deny

# WHATSAPP
whatsapp.send_manual

# GST
gst.verify

# SETTINGS
settings.view | settings.edit | settings.company_edit

# AUDIT
audit_log.view | audit_log.export
```

### 5.4 Default Permissions Per Role

| Permission | super_admin | sales | design | store | production | qc | dispatch | accountant | client |
|---|---|---|---|---|---|---|---|---|---|
| client.create | ✓ | ✓ | | | | | | | |
| client.view | ✓ | ✓ | | | | | | ✓ | |
| quotation.create | ✓ | ✓ | | | | | | | |
| quotation.view | ✓ | ✓ | | | | | | ✓ | ✓ |
| quotation.send | ✓ | ✓ | | | | | | | |
| project.create | ✓ | | | | | | | | |
| project.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| jobcard.create | ✓ | | | | | | | | |
| jobcard.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| jobcard.close | ✓ | | | | | | | | |
| designrequest.* | ✓ | | ✓ | | | | | | |
| storeStage.* | ✓ | | | ✓ | | | | | |
| productionStage.* | ✓ | | | | ✓ | | | | |
| qcStage.* | ✓ | | | | | ✓ | | | |
| dispatchStage.* | ✓ | | | | | | ✓ | | |
| invoice.* | ✓ | | | | | | | ✓ | |
| reports.view_financial | ✓ | | | | | | | ✓ | |
| user.create | ✓ | | | | | | | | |
| privilege.* | ✓ | | | | | | | | |
| audit_log.view | ✓ | | | | | | | | |

---

## SECTION 6 — ALL API ENDPOINTS

### Auth — `/api/auth`
```
POST   /login                    Public      → returns JWT + refresh token
POST   /forgot-password          Public      → sends reset email
POST   /reset-password/:token    Public      → resets password
POST   /logout                   JWT         → invalidates token
GET    /me                       JWT         → current user + permissions
POST   /switch-company           super_admin → switch active company
POST   /refresh                  JWT         → refresh access token
```

### Users — `/api/users`
```
GET    /                         super_admin → list all company users
POST   /                         super_admin → create employee
GET    /:id                      super_admin → user detail + permissions
PUT    /:id                      super_admin → update user info
PATCH  /:id/role                 super_admin → change role → rebuilds permissions
PATCH  /:id/deactivate           super_admin → soft deactivate
PATCH  /:id/activate             super_admin → re-activate
POST   /:id/reset-password       super_admin → force password reset
```

### Clients — `/api/clients`
```
POST   /                         client.create  → create client
GET    /                         client.view    → list (company-scoped)
GET    /:id                      client.view    → detail
PUT    /:id                      client.edit    → update
PATCH  /:id/deactivate           client.edit    → soft delete
```

### GST — `/api/gst`
```
POST   /verify                   gst.verify     → verify GSTIN → returns business details
POST   /determine-type           gst.verify     → CGST+SGST vs IGST based on states
```

### Quotations — `/api/quotations`
```
POST   /                         quotation.create → create (draft)
GET    /                         quotation.view   → list
GET    /:id                      quotation.view   → detail
PUT    /:id                      quotation.edit   → update items/pricing
GET    /:id/pdf                  quotation.view   → Puppeteer PDF download
PATCH  /:id/send                 quotation.send   → mark sent + send to client
PATCH  /:id/approve              quotation.edit   → mark approved
PATCH  /:id/reject               quotation.edit   → mark rejected
POST   /:id/revise               quotation.create → create revision copy
```

### Projects — `/api/projects`
```
POST   /                         project.create → create from approved quotation
GET    /                         project.view   → list
GET    /:id                      project.view   → detail + all job cards
PUT    /:id                      project.edit   → update
PATCH  /:id/whatsapp             project.edit   → save WA group ID + link
PATCH  /:id/status               project.edit   → update status
```

### Job Cards (Core) — `/api/jobcards`
```
POST   /                         jobcard.create         → create
GET    /                         jobcard.view           → list (dept-scoped)
GET    /:id                      jobcard.view           → full detail + stage refs
GET    /:id/pdf                  jobcard.view           → Puppeteer PDF
PATCH  /:id/status               jobcard.override_status → admin override
PATCH  /:id/assign               jobcard.assign         → update dept assignments
PATCH  /:id/hold                 jobcard.edit           → put on hold
PATCH  /:id/cancel               jobcard.edit           → cancel with reason
PATCH  /:id/close                jobcard.close          → close + archive
```

### Design Stage — `/api/jobcards/:id/design`
```
POST   /                         designrequest.create → create design stage doc
GET    /                         designrequest.view   → get design details
PUT    /                         designrequest.edit   → update measurements + materials
POST   /files                    designrequest.upload → upload CAD/render/PDF to Cloudinary
DELETE /files/:fileId            designrequest.edit   → remove a file
POST   /signoff                  designrequest.signoff → generate + send sign-off link
GET    /signoff/:token           Public               → client views design (no login)
PATCH  /signoff/:token/approve   Public               → client approves design
PATCH  /signoff/:token/reject    Public               → client rejects with feedback
PATCH  /ready                    designrequest.ready  → mark design ready → triggers in_store
```

### Store Stage — `/api/jobcards/:id/store`
```
GET    /                         storeStage.view  → BOM + stock levels
PUT    /bom                      storeStage.edit  → update BOM items
PATCH  /issue/:bomItemId         storeStage.issue → mark one material issued
PATCH  /issue-all                storeStage.issue → mark all issued → triggers in_production
```

### Production Stage — `/api/jobcards/:id/production`
```
GET    /                         productionStage.view → substages + notes
PATCH  /substage                 productionStage.edit → update one substage status
POST   /note                     productionStage.edit → add progress note
PATCH  /shortage                 productionStage.edit → flag material shortage → alerts store
PATCH  /done                     productionStage.edit → mark complete → triggers qc_pending
```

### QC Stage — `/api/jobcards/:id/qc`
```
GET    /                         qcStage.view → checklist + history
PUT    /checklist                qcStage.edit → fill checklist
POST   /defect-photos            qcStage.edit → upload defect photos to Cloudinary
PATCH  /pass                     qcStage.pass → QC pass → PDF + triggers qc_passed
PATCH  /fail                     qcStage.fail → QC fail → rework++ → triggers qc_failed
```

### Dispatch Stage — `/api/jobcards/:id/dispatch`
```
GET    /                         dispatchStage.view    → dispatch details
POST   /                         dispatchStage.edit    → schedule delivery → challan PDF
PUT    /                         dispatchStage.edit    → update team/vehicle
PATCH  /deliver                  dispatchStage.deliver → mark delivered + proof → triggers delivered
```

### Invoices — `/api/invoices`
```
POST   /                         invoice.create  → create GST invoice
GET    /                         invoice.view    → list
GET    /:id                      invoice.view    → detail
GET    /:id/pdf                  invoice.view    → Puppeteer PDF
PATCH  /:id/send                 invoice.edit    → send to client
POST   /:id/payment              invoice.payment → record payment
```

### Inventory — `/api/inventory`
```
POST   /                         inventory.create → add item
GET    /                         inventory.view   → list with stock levels
GET    /:id                      inventory.view   → detail
PUT    /:id                      inventory.edit   → update item
PATCH  /:id/restock              inventory.edit   → update stock level
```

### Purchase Orders — `/api/purchase-orders`
```
POST   /                         purchaseOrder.create → raise PO
GET    /                         purchaseOrder.view   → list
GET    /:id                      purchaseOrder.view   → detail
PATCH  /:id/approve              purchaseOrder.approve → approve PO
PATCH  /:id/receive              purchaseOrder.edit   → mark received + update inventory
PATCH  /:id/cancel               purchaseOrder.edit   → cancel PO
```

### Privileges — `/api/privileges`
```
# Roles
GET    /roles                              super_admin → list all roles
POST   /roles                              super_admin → create custom role
GET    /roles/:id                          super_admin → role detail
PUT    /roles/:id                          super_admin → edit role permissions
DELETE /roles/:id                          super_admin → deactivate custom role

# Permission Sets
GET    /permission-sets                    super_admin → list all sets
POST   /permission-sets                    super_admin → create set
PUT    /permission-sets/:id                super_admin → edit set (propagates to users)
DELETE /permission-sets/:id                super_admin → delete set

# Per-User Permissions
GET    /users/:userId                      super_admin → effective permissions + overrides
POST   /users/:userId/grant                super_admin → grant extra permission
POST   /users/:userId/deny                 super_admin → deny default permission
DELETE /users/:userId/override/:id         super_admin → remove override
POST   /users/:userId/permission-set       super_admin → assign set to user
DELETE /users/:userId/permission-set/:id   super_admin → remove set from user
GET    /users/:userId/history              super_admin → full override history

# Access Map
GET    /access-map                         super_admin → who has what access
GET    /access-map?permission=invoice.view super_admin → who can view invoices
GET    /access-logs                        super_admin → permission check log
GET    /access-logs/export                 super_admin → export CSV
```

### Notifications — `/api/notifications`
```
GET    /                         JWT → user's notifications (unread first)
PATCH  /:id/read                 JWT → mark one as read
PATCH  /read-all                 JWT → mark all as read
```

### Reports — `/api/reports`
```
GET    /financial                reports.view_financial → monthly/quarterly summary
GET    /outstanding               reports.view_financial → receivables aging
GET    /production               reports.view_production → job card throughput
GET    /delivery                 reports.view_delivery  → on-time delivery rate
GET    /export                   reports.export          → CSV export
```

### Companies — `/api/companies` (super_admin + cross-company)
```
GET    /                         super_admin → list both companies
GET    /:id                      super_admin → company detail
PUT    /:id                      super_admin → update company settings
POST   /:id/switch               super_admin → switch active company context
```

---

## SECTION 7 — DATABASE MODELS (19 total)

### Core Models
- `Company` — multi-tenant root
- `User` — all staff + client users
- `Counter` — auto-number sequences

### Business Flow Models
- `Client` — customers with GST verification
- `Quotation` — entry point (replaces enquiry)
- `Project` — born from approved quotation
- `JobCard` — lean core document with stage refs
- `Invoice` — GST-compliant financial document

### Stage Models (1-to-1 with JobCard)
- `DesignRequest` — measurements, files, sign-off
- `StoreStage` — BOM, PO links, issued flags
- `ProductionStage` — 8 substages, notes, shortage flag
- `QcStage` — checklist, photos, rework history
- `DispatchStage` — team, vehicle, challan, proof

### Inventory & Procurement
- `Inventory` — stock with low-stock alerts
- `PurchaseOrder` — raised by store for shortages

### Security & System
- `Role` — permission definitions (system + custom)
- `PermissionSet` — reusable permission bundles
- `UserPermission` — per-user role + overrides + effectivePermissions cache
- `AccessLog` — every permission check (TTL: 90 days)
- `Notification` — in-app + WA (TTL: 30 days read)

---

## SECTION 8 — WHATSAPP NOTIFICATION MAP

All messages sent via BSP (Interakt / Wati / 360dialog).
All templates pre-approved by Meta before go-live.
Node.js backend calls BSP API via Bull queue on every trigger event.

| Trigger | Template | Recipients | Variables |
|---------|----------|-----------|-----------|
| Job card created | `job_card_created` | WA Group | jcNumber, client, project, priority, dueDate, designer |
| Design ready | `design_ready` | WA Group | jcNumber, project |
| Materials issued | `materials_issued` | WA Group | jcNumber, dueDate |
| Substage done | `substage_complete` | WA Group | jcNumber, stage, date, nextStage |
| Production done | `production_complete` | WA Group | jcNumber |
| QC passed | `qc_passed` | WA Group | jcNumber |
| QC failed | `qc_failed` | WA Group | jcNumber, defects |
| Delivery scheduled | `delivery_scheduled` | Client direct | jcNumber, date, timeSlot, vehicleNo, driver |
| Delivered | `job_delivered` | Group + Client | jcNumber, client, address, date |
| Invoice sent | `invoice_sent` | Client direct | jcNumber, amount |
| Payment overdue | `payment_overdue` | Client direct | jcNumber, balanceDue |
| Job closed | `job_closed` | WA Group (final) | jcNumber, client |
| On hold | `job_on_hold` | WA Group | jcNumber, reason |
| Overdue alert | `job_overdue` | Admin direct | jcNumber, project, dueDate, status |
| Low stock | `low_stock_alert` | Store + Admin | material, qty, unit |

**WA Group is created MANUALLY by Super Admin on phone.**
Admin pastes group ID + invite link via `PATCH /api/projects/:id/whatsapp`.
All future messages are sent automatically via BSP to that group ID.

---

## SECTION 9 — PDF DOCUMENTS

Generated via **Puppeteer** (HTML → headless Chrome → PDF buffer).
Uploaded to **Cloudinary** (permanent URL for sharing).
Streamed back to client for download.

| Document | Template | When Generated | Stored On |
|----------|----------|---------------|-----------|
| Quotation PDF | `quotation.ejs` | On demand / on send | `quotation.pdfURL` |
| Job Card PDF | `jobcard.ejs` | On creation / on demand | (inline stream) |
| QC Certificate | `qccertificate.ejs` | Auto on QC pass | `qcStage.certificateURL` |
| Delivery Challan | `challan.ejs` | Auto on dispatch schedule | `dispatchStage.challanPDF` |
| Invoice PDF | `invoice.ejs` | On creation / on send | `invoice.pdfURL` |

**Quotation PDF format:** Matches real Maruti quotation (category rows, photos, MRP, price, discount, GST breakdown, yellow T&C box, bank details, signature)

**Job Card PDF format:** Matches real paper JC (meta table: JC No., Name, Date, Delivery Date, Salesperson; then item rows: large photo + specs, simple and readable for workshop floor)

---

## SECTION 10 — REAL-TIME & BACKGROUND JOBS

### Socket.io Events
```
job_card_status_changed   → all connected users on this job card
production_substage_done  → admin dashboard live update
new_notification          → notification bell update for recipient
```

### Bull Queue Jobs (Redis-backed)
```
send_whatsapp_notification → retries up to 3x on failure
send_email                 → welcome emails, invoice emails, sign-off links
generate_pdf               → async PDF generation for large documents
```

### Cron Jobs
```
deadlineChecker  → runs daily 08:00
  → jobs due in 3 days → WA alert to Admin
  → overdue jobs → daily WA alert to Admin

overduePayments  → runs daily 09:00
  → invoices past dueDate → WA reminder to client
  → invoice.status → overdue

expiredOverrides → runs daily 00:00
  → removes expired permission overrides
  → calls resolvePermissions() for affected users

lowStockCheck    → runs daily 07:00
  → inventory items below minStock → WA alert to store + admin
  → inventory.lowStockAlert = true
```

---

## SECTION 11 — FRONTEND PAGES

| Page | Route | API Used |
|------|-------|----------|
| Login | `/login` | POST /auth/login |
| Dashboard | `/` | GET /jobcards, /projects, /invoices |
| Clients List | `/clients` | GET /clients |
| Client Detail | `/clients/:id` | GET /clients/:id, /quotations, /projects |
| New Client | `/clients/new` | POST /clients, POST /gst/verify |
| Quotations List | `/quotations` | GET /quotations |
| **New Quotation** | `/quotations/new` | POST /quotations, GET /clients |
| **Quotation Detail** | `/quotations/:id` | GET /quotations/:id, PATCH /send /approve /reject |
| Projects List | `/projects` | GET /projects |
| **Project Detail** | `/projects/:id` | GET /projects/:id, PATCH /whatsapp |
| Job Cards List | `/jobcards` | GET /jobcards (filtered by role) |
| Job Card Detail | `/jobcards/:id` | GET /jobcards/:id + all 5 stage endpoints |
| Invoices List | `/invoices` | GET /invoices |
| **New Invoice** | `/invoices/new` | POST /invoices |
| Inventory | `/inventory` | GET/POST/PUT /inventory |
| Purchase Orders | `/purchase-orders` | GET/POST/PATCH /purchase-orders |
| Users | `/users` | GET/POST/PUT/PATCH /users |
| User Detail | `/users/:id` | GET /users/:id, GET /privileges/users/:id |
| Roles | `/roles` | GET/POST/PUT/DELETE /privileges/roles |
| Settings | `/settings` | GET /auth/me, PUT /companies/:id |
| Reports | `/reports` | GET /reports/* |

**Bold = currently stub (not yet implemented)**

---

## SECTION 12 — ENVIRONMENT VARIABLES

```env
# Server
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com

# MongoDB
MONGO_URI=mongodb+srv://...

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# WhatsApp BSP (Interakt / Wati / 360dialog)
WA_BSP_API_URL=https://api.interakt.ai/...
WA_BSP_API_KEY=
WA_PHONE_NUMBER_ID=

# GST API (Masters India recommended)
GST_API_URL=https://api.mastersindia.co/...
GST_API_KEY=

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Redis (Bull queues)
REDIS_URL=redis://localhost:6379

# Company Seeds
COMPANY_A_NAME=Maruti Furniture
COMPANY_B_NAME=Brand Two
SUPER_ADMIN_EMAIL=owner@marutifurniture.in
SUPER_ADMIN_PASSWORD=changeme123
```

---

## SECTION 13 — BUILD ORDER FOR DEVELOPMENT

```
PHASE 1 — Foundation
  1. Fix 8 model issues (DesignRequest, Project fields, Invoice GST fields)
  2. utils/autoNumber.js
  3. middleware/auth.middleware.js
  4. middleware/company.middleware.js
  5. middleware/permission.middleware.js
  6. middleware/scope.middleware.js
  7. utils/resolvePermissions.js
  8. utils/seed.js → run → verify in Atlas

PHASE 2 — Core Business
  9.  Client CRUD + GST verify
  10. Quotation CRUD + Puppeteer PDF
  11. Project CRUD
  12. Job Card CRUD + Puppeteer PDF

PHASE 3 — Department Stages
  13. Design stage (incl. sign-off public routes)
  14. Store stage + inventory + PO
  15. Production stage (substages, notes, shortage)
  16. QC stage (checklist, pass/fail, QC cert PDF)
  17. Dispatch stage (challan PDF, proof of delivery)

PHASE 4 — Financial
  18. Invoice CRUD + Puppeteer PDF
  19. Payment recording
  20. Reports

PHASE 5 — Notifications & Real-time
  21. Bull + Redis queue setup
  22. WhatsApp BSP integration
  23. Nodemailer email integration
  24. Socket.io events
  25. Cron jobs (deadline, overdue, low stock, expired overrides)

PHASE 6 — Privilege Management
  26. Role CRUD
  27. Per-user permission overrides
  28. Permission sets
  29. Access map + audit logs

PHASE 7 — Frontend (stub pages → real pages)
  30. New Quotation page (quotation builder UI)
  31. Quotation Detail page
  32. Project Detail page
  33. Job Card Detail page (all 5 stage tabs)
  34. Invoice creation page
  35. Mobile-friendly production + dispatch views
  36. User detail + permission management page
```
