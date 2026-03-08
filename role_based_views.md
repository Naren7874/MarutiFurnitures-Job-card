# Maruti Furniture — Role-Based View Specification
## What Every Employee Sees (Complete UI/Data Access Reference)
**Based on SRS v3.0 | For: Developers & AI Agents**

---

## How to Read This Document

Each role section covers:
- **Sidebar / Navigation** — which menu items are visible
- **Each Page** — what data loads, what actions are available, what is hidden
- **Job Card Scoping Rule** — which job cards appear in their list

### Global Rules (Apply to ALL roles except super_admin)
1. Every query is filtered by `companyId` — no cross-company data ever
2. `checkPermission()` middleware blocks any endpoint the role doesn't have
3. Deactivated users get 401 on every request immediately
4. `super_admin` bypasses all permission checks — sees everything, always

---

## ROLE 1 — super_admin

### Sidebar (Full)
- Dashboard
- Clients
- Quotations
- Projects
- Job Cards
- Invoices
- Inventory
- Purchase Orders
- Users *(manage staff)*
- Roles & Permissions
- Reports
- Settings

### Dashboard
- **KPI Cards:** Total active job cards, overdue jobs, pending QC, dispatched today, outstanding payments
- **Job Cards Table:** ALL job cards across ALL statuses, ALL departments
- **Live updates:** Socket.io — substage completions, status changes appear in real time
- **Alerts panel:** Overdue jobs, low stock items, QC escalations (reworkCount > 2), pending POs

### Clients Page (`/clients`)
- Full list of all clients for the active company
- Can create, edit, deactivate any client
- See full contact details, GSTIN, all linked quotations and projects per client

### Quotations Page (`/quotations`)
- Full list — all statuses: draft, sent, approved, rejected, converted
- Can create new quotation, edit any draft, send, approve, reject, revise
- Can download PDF for any quotation
- Sees all items, pricing, GST breakdown, T&C

### Projects Page (`/projects`)
- Full list — all projects, all statuses
- Can create project from approved quotation
- Can edit project details, set/update WhatsApp group ID
- Sees all assigned staff per project

### Job Cards Page (`/jobcards`)
- **Sees ALL job cards** — no department filter
- All statuses: active, in_store, in_production, qc_pending, qc_failed, dispatched, delivered, closed
- Can create job cards, assign departments, override status, put on hold, cancel, close
- Can download job card PDF

### Job Card Detail (`/jobcards/:id`)
- **All 5 stage tabs visible and editable:** Design, Store, Production, QC, Dispatch
- Can reassign any department at any time
- Sees full activity log, all notes, all uploaded files
- Can close job card with warranty notes and punch list

### Invoices Page (`/invoices`)
- Full list — all invoices, all statuses
- Can create invoice, send to client, record payments
- Sees GST breakdown, payment history, outstanding balance

### Inventory Page (`/inventory`)
- Full list of all inventory items with current stock levels
- Can add, edit, restock any item
- Sees low-stock alerts

### Purchase Orders Page (`/purchase-orders`)
- Full list — all POs, all statuses
- Can approve POs, mark as received
- Sees linked job cards per PO

### Users Page (`/users`)
- Full list of all company staff
- Can create, edit, deactivate, activate any user
- Can reset passwords
- Click any row → User Detail page

### User Detail Page (`/users/:id`)
- Full profile + effective permissions grid
- Can change role, grant/deny overrides, assign permission sets
- Sees full audit history for that user

### Roles & Permissions Page (`/roles`)
- Full list of system roles + custom roles
- Can create/edit custom roles
- Sees permission set management
- Sees access map (who has what)
- Sees audit log (all business events)

### Reports Page (`/reports`)
- Financial summary, outstanding receivables
- Production throughput, on-time delivery rate
- Can export any report as CSV

### Settings Page (`/settings`)
- Company branding (logo, prefix, GST, bank details)
- Audit Log tab (full business event history)

---

## ROLE 2 — sales

### Sidebar
- Dashboard
- Clients
- Quotations
- Projects *(view only)*
- Job Cards *(view only — own assignments)*

### Dashboard
- **KPI Cards:** My active quotations, pending client approvals, converted projects this month
- **Recent Quotations:** Last 10 quotations they created
- **No financial data** (no invoice totals, no payment info)

### Clients Page (`/clients`)
- Full list of clients for the company *(client.view)*
- **Can create new clients** *(client.create)* — fills name, phone, GSTIN (auto-verified via GST API)
- **Can edit** client details *(client.edit)*
- **Cannot delete/deactivate** clients

### Quotations Page (`/quotations`)
- **Sees ALL quotations** for the company *(not just their own — client.view is company-scoped)*
- **Can create** new quotation *(quotation.create)*
- **Can edit** any draft/sent quotation *(quotation.edit)*
- **Can send** quotation to client *(quotation.send)* — triggers WhatsApp + email
- **Can download** quotation PDF
- **Cannot approve** quotations *(quotation.approve is super_admin only)*
- **Cannot reject** quotations

### Projects Page (`/projects`)
- **View only** — sees all active projects *(project.view)*
- Can see project details: client, status, assigned staff, expected delivery
- **Cannot create** projects (super_admin only)
- **Cannot edit** project details

### Job Cards Page (`/jobcards`)
- **Sees ALL job cards** *(jobcard.view is not dept-scoped for sales)*
- View only — can see status, which stage it's in, assigned team
- **Cannot create, edit, or close** job cards
- Can download job card PDF

### Job Card Detail (`/jobcards/:id`)
- **Visible tabs:** Overview only (meta info, status, timeline)
- **Hidden tabs:** Design, Store, Production, QC, Dispatch (no stage permissions)
- Can see: job card number, client, project, priority, current status, assigned teams
- **Cannot take any action** on the job card

### What sales CANNOT See
- Invoices and payment data
- Inventory and stock levels
- Purchase Orders
- User management
- Reports
- Settings

---

## ROLE 3 — design

### Sidebar
- Dashboard
- Job Cards *(dept-scoped)*
- Projects *(view only)*

### Dashboard
- **KPI Cards:** Job cards awaiting design, files uploaded today, pending client sign-offs
- **My Job Cards:** Only job cards where `assignedTo.design` includes their userId AND status is `active` or `in_store` or design is in progress
- **Pending Sign-offs:** List of design requests where `signoffStatus = pending`

### Job Cards Page (`/jobcards`)
- **Scoping Rule:**
  ```
  Show job cards where:
    assignedTo.design contains req.user._id
    OR status = 'active' (newly created, not yet assigned)
  ```
- Statuses visible: `active`, `in_store` (their active work), plus their historical completed ones
- **Cannot see** job cards from other departments (production, QC, etc.) unless assigned

### Job Card Detail (`/jobcards/:id`)
- **Visible tabs:**

  **Overview Tab**
  - Job card number, client name, project name, priority, expected delivery
  - Item list with photos and basic specs from quotation
  - Current status badge
  - Assigned team names (all departments visible — read only)

  **Design Tab** *(full access — their primary workspace)*
  - View and fill measurements per item (H × W × D in mm)
  - Add/edit materials for each item
  - Add special instructions
  - Upload files (CAD drawings, renders, PDFs) → Cloudinary
  - Delete their own uploaded files
  - Generate and send client sign-off link
  - See sign-off status: pending / approved / rejected
  - See client feedback on rejection
  - Mark design as ready → triggers `in_store` status

- **Hidden tabs:** Store, Production, QC, Dispatch

### Projects Page (`/projects`)
- View only — sees all projects *(project.view)*
- Useful to understand context: client name, site address, architect
- Cannot edit or create

### What design CANNOT See
- Clients page (no client.view permission)
- Quotations (no quotation.view permission)
- Store BOM, inventory, purchase orders
- Production substages
- QC checklist
- Dispatch details
- Invoices and payments
- User management, Reports, Settings

---

## ROLE 4 — store

### Sidebar
- Dashboard
- Job Cards *(dept-scoped)*
- Inventory
- Purchase Orders
- Projects *(view only)*

### Dashboard
- **KPI Cards:** Job cards waiting for materials, active POs, low stock items count, materials issued today
- **My Job Cards:** Job cards where `assignedTo.store` includes their userId AND status = `in_store`
- **Low Stock Alert Panel:** Inventory items below `minStock`
- **Active POs:** Purchase orders currently open

### Job Cards Page (`/jobcards`)
- **Scoping Rule:**
  ```
  Show job cards where:
    assignedTo.store contains req.user._id
    AND status = 'in_store'
  Plus: their historically completed store-stage job cards
  ```

### Job Card Detail (`/jobcards/:id`)
- **Visible tabs:**

  **Overview Tab**
  - Job card number, client, project, priority, expected delivery
  - Current status

  **Design Tab** *(read only)*
  - Can view measurements and materials list (needed to understand BOM)
  - Cannot edit design details
  - Cannot upload files or trigger sign-off

  **Store Tab** *(full access — their primary workspace)*
  - View auto-populated BOM from design materials
  - See required qty vs current stock for each material (color coded: green = sufficient, red = short)
  - Edit BOM items (adjust quantities, add missing items)
  - Mark individual materials as issued (`PATCH /store/issue/:bomItemId`)
  - Mark all materials issued at once → triggers `in_production`
  - Raise Purchase Order if stock insufficient → links to PO module
  - See PO status updates

- **Hidden tabs:** Production, QC, Dispatch

### Inventory Page (`/inventory`)
- Full list of all inventory items *(inventory.view)*
- **Can create** new items *(inventory.create)*
- **Can edit** item details, update min stock levels *(inventory.edit)*
- **Can restock** — update current stock on PO receipt *(inventory.edit)*
- Sees current stock, min stock, unit, last restocked date

### Purchase Orders Page (`/purchase-orders`)
- **Can create** POs *(purchaseOrder.create)* — auto-linked to job card
- **Can view** all POs *(purchaseOrder.view)*
- **Can edit** PO details *(purchaseOrder.edit)*
- **Can mark PO as received** → updates inventory stock *(purchaseOrder.edit)*
- **Cannot approve** POs *(purchaseOrder.approve is separate — admin/accountant)*
- Sees: supplier, items, qty, expected delivery, linked job card

### Projects Page (`/projects`)
- View only *(project.view)* — for context (site address, client, timeline)

### What store CANNOT See
- Clients page
- Quotations
- Production substage details (can see job card is "in production" but not substages)
- QC checklist
- Dispatch details
- Invoices and payments
- User management, Reports, Settings

---

## ROLE 5 — production

### Sidebar
- Dashboard
- Job Cards *(dept-scoped)*
- Projects *(view only)*

### Dashboard
- **KPI Cards:** Active jobs in production, substages completed today, material shortage alerts, overdue jobs
- **My Job Cards:** Job cards where `assignedTo.production` includes their userId AND status = `in_production` or `qc_failed` (rework)
- **Substage Progress:** Mini Kanban or progress bars for each active job card

### Job Cards Page (`/jobcards`)
- **Scoping Rule:**
  ```
  Show job cards where:
    assignedTo.production contains req.user._id
    AND status IN ['in_production', 'qc_failed']
  Plus: their historically completed production-stage job cards
  ```
- `qc_failed` cards appear back in their list for rework

### Job Card Detail (`/jobcards/:id`) — Mobile-Friendly
- **Visible tabs:**

  **Overview Tab**
  - Job card number, client, project, priority, expected delivery
  - Items list with photos and specs (to know what they're building)
  - Current status

  **Design Tab** *(read only)*
  - Measurements per item (H × W × D) — critical for workshop
  - Materials list — to know what was issued
  - Uploaded CAD/render files — can view and download
  - Cannot edit anything

  **Store Tab** *(read only)*
  - Which materials were issued, quantities
  - Useful if they suspect a material shortage mid-job
  - Cannot edit BOM or issue materials

  **Production Tab** *(full access — their primary workspace)*
  - 8 substages displayed as a vertical checklist or progress tracker:
    1. Cutting — status: pending / in_progress / done
    2. Edge Banding
    3. CNC Drilling
    4. Assembly
    5. Polishing
    6. Finishing
    7. Hardware Fitting
    8. Packing
  - For each substage: tap to update status, enter worker name, completedAt auto-saved
  - WhatsApp fires to group on each substage completion
  - Add progress notes (text + optional photo)
  - Flag material shortage → alerts store + admin immediately
  - Mark all done → production complete → triggers `qc_pending`

  **QC Tab** *(read only — see result only)*
  - Can see QC verdict: pass / fail
  - Can see defect notes if failed (so they know what to rework)
  - Cannot fill checklist or pass/fail

- **Hidden tabs:** Dispatch tab

### Projects Page (`/projects`)
- View only *(project.view)* — for context

### What production CANNOT See
- Clients page
- Quotations
- Store BOM editing or PO management
- QC checklist controls (pass/fail buttons)
- Dispatch details
- Invoices and payments
- User management, Reports, Settings

---

## ROLE 6 — qc

### Sidebar
- Dashboard
- Job Cards *(dept-scoped)*
- Projects *(view only)*

### Dashboard
- **KPI Cards:** Jobs awaiting QC, passed today, failed today, escalated jobs (rework > 2)
- **My QC Queue:** Job cards where `assignedTo.qc` includes their userId AND status = `qc_pending`
- **Escalation Alert:** Jobs where `qcStage.reworkCount > 2` highlighted in red

### Job Cards Page (`/jobcards`)
- **Scoping Rule:**
  ```
  Show job cards where:
    assignedTo.qc contains req.user._id
    AND status IN ['qc_pending', 'qc_passed', 'qc_failed']
  Plus: historically completed QC job cards
  ```

### Job Card Detail (`/jobcards/:id`)
- **Visible tabs:**

  **Overview Tab**
  - Job card number, client, project, priority, delivery deadline
  - Full item list with photos and specs (essential for inspection)

  **Design Tab** *(read only)*
  - Measurements (H × W × D) per item — to verify dimensions during inspection
  - Materials list — to verify correct materials used
  - Design files — reference during inspection

  **Production Tab** *(read only)*
  - All 8 substages and their completion status + worker names
  - Progress notes — to understand what was done
  - Any shortage flags that were raised
  - Useful context for understanding potential defect causes

  **QC Tab** *(full access — their primary workspace)*
  - Default checklist (5 parameters):
    - Dimensions accuracy → passed: true/false + notes
    - Finish quality → passed: true/false + notes
    - Hardware fitting → passed: true/false + notes
    - Structural integrity → passed: true/false + notes
    - Laminate/polish quality → passed: true/false + notes
  - Upload defect photos → Cloudinary
  - View rework history (previous fail reasons)
  - **PASS button** → auto-generates QC Certificate PDF, triggers dispatch stage
  - **FAIL button** → increment reworkCount, write rework reason, send back to production
  - See if escalated (reworkCount > 2 badge)

- **Hidden tabs:** Store tab, Dispatch tab

### Projects Page (`/projects`)
- View only *(project.view)*

### What qc CANNOT See
- Clients page
- Quotations
- Store/inventory/PO management
- Production controls (can't update substages)
- Dispatch details
- Invoices and payments
- User management, Reports, Settings

---

## ROLE 7 — dispatch

### Sidebar
- Dashboard
- Job Cards *(dept-scoped)*
- Projects *(view only)*

### Dashboard
- **KPI Cards:** Ready to dispatch (qc_passed), dispatched today, delivered today, pending proof of delivery
- **Dispatch Queue:** Job cards where status = `qc_passed` assigned to them
- **Today's Schedule:** Jobs with `scheduledDate = today`

### Job Cards Page (`/jobcards`)
- **Scoping Rule:**
  ```
  Show job cards where:
    assignedTo.dispatch contains req.user._id
    AND status IN ['qc_passed', 'dispatched', 'delivered']
  Plus: historical dispatch records
  ```

### Job Card Detail (`/jobcards/:id`)
- **Visible tabs:**

  **Overview Tab**
  - Job card number, client name, client phone, delivery address (site address from project)
  - Priority, expected delivery date
  - Item list — to know what's being delivered

  **QC Tab** *(read only)*
  - QC verdict: pass confirmed
  - QC Certificate PDF download link (to carry with delivery)
  - Defect photos (if any items had notes)

  **Dispatch Tab** *(full access — their primary workspace)*
  - Schedule delivery form:
    - Scheduled date picker
    - Time slot (morning / afternoon / evening)
    - Delivery team member names
    - Vehicle details (type, registration number)
  - Submit → auto-generates Challan PDF → WhatsApp to client with delivery details
  - On delivery day: mark items dispatched one by one
  - Capture proof of delivery:
    - Upload proof photo (Cloudinary)
    - Client signature (drawn or photo)
    - GPS location (auto or manual)
  - Mark delivered → triggers accountant notification

- **Hidden tabs:** Design tab, Store tab, Production tab

### Projects Page (`/projects`)
- View only *(project.view)* — for delivery address and client contact

### What dispatch CANNOT See
- Clients page (cannot edit clients)
- Quotations
- Store/inventory/PO management
- Production substages
- QC checklist controls
- Invoices and payment amounts *(they only get notified to deliver, not see billing)*
- User management, Reports, Settings

---

## ROLE 8 — accountant

### Sidebar
- Dashboard
- Job Cards *(delivered ones only)*
- Invoices
- Reports
- Clients *(view only)*
- Quotations *(view only)*
- Projects *(view only)*
- Purchase Orders *(view only)*

### Dashboard
- **KPI Cards:** Invoices sent (unpaid), total outstanding amount, paid this month, overdue invoices count
- **Action Queue:** Delivered job cards awaiting invoice generation
- **Overdue Invoices:** List with client name, amount, days overdue
- **No production/stage data** in dashboard

### Job Cards Page (`/jobcards`)
- **Scoping Rule:**
  ```
  Show job cards where:
    assignedTo.accountant contains req.user._id
    AND status IN ['delivered', 'closed']
  ```
- They are assigned at job card creation but only act post-delivery
- Can view job card to understand what items/qty are being invoiced

### Job Card Detail (`/jobcards/:id`)
- **Visible tabs:**

  **Overview Tab**
  - Job card number, client, project, items and quantities
  - Delivery date (actualDelivery)
  - Current status

  *(All stage tabs: Design, Store, Production, QC, Dispatch — **hidden** — accountant has no stage permissions)*

  **Finance Tab** *(if implemented as a separate tab)*
  - Link to create invoice for this job card
  - Invoice status, payment history

### Clients Page (`/clients`)
- **View only** *(client.view)*
- Needed to see client GSTIN, billing address, tax type
- Cannot create or edit clients

### Quotations Page (`/quotations`)
- **View only** *(quotation.view)*
- Needed to get approved pricing for invoice generation
- Cannot create, edit, or send quotations

### Projects Page (`/projects`)
- **View only** *(project.view)* — for client and project context

### Invoices Page (`/invoices`) — Primary Workspace
- Full list of all company invoices with status
- **Can create** invoice *(invoice.create)*:
  - Select job card(s) and linked quotation
  - Items auto-populated from quotation
  - GST auto-calculated (CGST+SGST or IGST based on client state)
  - Invoice number auto-generated
  - PDF generated → send to client via WhatsApp + email
- **Can edit** invoice details *(invoice.edit)*
- **Can send** invoice to client *(invoice.send)*
- **Can record payments** *(invoice.payment)*:
  - Advance payment
  - Balance payment
  - Mode: cash / UPI / NEFT / cheque
  - Reference number
  - When fully paid → invoice.status → paid
- View full payment history per invoice

### Reports Page (`/reports`)
- **Financial reports** *(reports.view_financial)*:
  - Monthly/quarterly revenue summary
  - Outstanding receivables aging (30/60/90 days)
  - Payment mode breakdown
- **Cannot see** production or delivery reports

### Purchase Orders Page (`/purchase-orders`)
- **View only** *(purchaseOrder.view)*
- Needed for financial reconciliation
- Cannot create or approve POs

### What accountant CANNOT See
- Design, Store, Production, QC, Dispatch stage controls
- Inventory management
- User management, Settings
- Production/delivery reports

---

## ROLE 9 — client

### Sidebar
- My Orders *(job cards where they are the client)*
- My Quotations
- *(Minimal — external portal feel)*

### Dashboard
- **Their order status:** List of all their job cards with current status shown as a simple progress bar:
  ```
  Design → Store → Production → QC → Dispatch → Delivered
  ```
- **Outstanding invoices** — amount due, payment due date

### Quotations Page (`/quotations`)
- **View only** *(quotation.view)* — sees only quotations where `clientId = their userId`
- Can see: items, photos, pricing, GST, T&C
- Can download quotation PDF
- Cannot create, edit, or send

### Job Cards Page (`/jobcards`)
- **Scoping Rule:**
  ```
  Show job cards where:
    project.clientId = req.user._id
  ```
- View only — sees only their own job cards
- Can see: job card number, items ordered, current status, expected delivery

### Job Card Detail (`/jobcards/:id`)
- **Visible tabs:**

  **Overview Tab only**
  - Their items with photos and descriptions
  - Current stage and status (simple language, not internal jargon)
  - Expected delivery date
  - No internal notes, no staff assignments

  *(All other tabs hidden — they see ZERO internal stage detail)*

### Design Sign-off (Public — No Login Required)
- Receives a link via WhatsApp/email: `/design/signoff/:token`
- Opens on phone without logging in (UUID token, time-limited)
- Can view: design drawings, measurements, uploaded files
- Can **Approve** with one tap → `designRequest.signoffStatus = approved`
- Can **Reject** with a text reason → design team notified

### What client CANNOT See
- Any other client's data
- Pricing breakdowns / discounts / internal margins
- Internal staff assignments
- Stage details (BOM, substages, QC checklist)
- Inventory, POs
- Other users
- Settings

---

## Job Card Scoping Summary Table

| Role | Job Cards Visible | Status Filter |
|---|---|---|
| `super_admin` | ALL job cards | ALL statuses |
| `sales` | ALL job cards | ALL statuses (view only) |
| `design` | Where `assignedTo.design` includes userId | `active`, `in_store` + historical |
| `store` | Where `assignedTo.store` includes userId | `in_store` + historical |
| `production` | Where `assignedTo.production` includes userId | `in_production`, `qc_failed` + historical |
| `qc` | Where `assignedTo.qc` includes userId | `qc_pending`, `qc_passed`, `qc_failed` + historical |
| `dispatch` | Where `assignedTo.dispatch` includes userId | `qc_passed`, `dispatched`, `delivered` + historical |
| `accountant` | Where `assignedTo.accountant` includes userId | `delivered`, `closed` |
| `client` | Where `project.clientId` = their userId | ALL their own |

---

## Tab Visibility Per Role (Job Card Detail)

| Tab | super_admin | sales | design | store | production | qc | dispatch | accountant | client |
|---|---|---|---|---|---|---|---|---|---|
| Overview | ✅ Full | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View |
| Design | ✅ Full | ❌ Hidden | ✅ **Full** | ✅ View | ✅ View | ✅ View | ❌ Hidden | ❌ Hidden | ❌ Hidden |
| Store | ✅ Full | ❌ Hidden | ❌ Hidden | ✅ **Full** | ✅ View | ❌ Hidden | ❌ Hidden | ❌ Hidden | ❌ Hidden |
| Production | ✅ Full | ❌ Hidden | ❌ Hidden | ❌ Hidden | ✅ **Full** | ✅ View | ❌ Hidden | ❌ Hidden | ❌ Hidden |
| QC | ✅ Full | ❌ Hidden | ❌ Hidden | ❌ Hidden | ✅ View | ✅ **Full** | ✅ View | ❌ Hidden | ❌ Hidden |
| Dispatch | ✅ Full | ❌ Hidden | ❌ Hidden | ❌ Hidden | ❌ Hidden | ❌ Hidden | ✅ **Full** | ❌ Hidden | ❌ Hidden |

> **Full** = can read + write + take actions on that tab
> **View** = read only, no action buttons
> **Hidden** = tab does not render at all

---

## Page Access Summary Per Role

| Page | super_admin | sales | design | store | production | qc | dispatch | accountant | client |
|---|---|---|---|---|---|---|---|---|---|
| Dashboard | ✅ Full | ✅ Own KPIs | ✅ Own KPIs | ✅ Own KPIs | ✅ Own KPIs | ✅ Own KPIs | ✅ Own KPIs | ✅ Financial KPIs | ✅ Order status |
| Clients | ✅ Full | ✅ Create+Edit | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ View | ❌ |
| Quotations | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ View | ✅ Own only |
| Projects | ✅ Full | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ❌ |
| Job Cards | ✅ All | ✅ All View | ✅ Dept scoped | ✅ Dept scoped | ✅ Dept scoped | ✅ Dept scoped | ✅ Dept scoped | ✅ Dept scoped | ✅ Own only |
| Invoices | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Full | ✅ Own only |
| Inventory | ✅ Full | ❌ | ❌ | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| Purchase Orders | ✅ Full | ❌ | ❌ | ✅ Full | ❌ | ❌ | ❌ | ✅ View | ❌ |
| Users | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Roles/Permissions | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Financial | ❌ |
| Settings | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Implementation Notes for Agent

### Sidebar Rendering
```tsx
// Render nav items conditionally based on role
const navItems = ALL_NAV_ITEMS.filter(item =>
  user.isSuperAdmin || user.effectivePermissions.includes(item.requiredPermission)
);
```

### Job Card List Query (Backend — injectCompanyScope middleware)
```js
// For non-super_admin, scope middleware sets:
if (!req.user.isSuperAdmin) {
  const deptKey = ROLE_TO_DEPT_MAP[req.user.role]; // e.g. 'production'
  if (deptKey) {
    req.scopeFilter[`assignedTo.${deptKey}`] = req.user._id;
  }
}
// Controller always uses: JobCard.find(req.scopeFilter)
```

### Tab Visibility (Frontend)
```tsx
// In JobCardDetail.tsx — render tabs conditionally
const canSeeDesign  = hasPermission('designrequest.view');
const canSeeStore   = hasPermission('storeStage.view');
const canSeeProd    = hasPermission('productionStage.view');
const canSeeQC      = hasPermission('qcStage.view');
const canSeeDispatch = hasPermission('dispatchStage.view');
```

### Action Button Rendering (Frontend)
```tsx
// Only render action buttons if user has write permission
{hasPermission('productionStage.edit') && (
  <Button onClick={updateSubstage}>Mark Done</Button>
)}
// Read-only users see the data but no buttons
```

---

*End of Role-Based View Specification — Maruti Furniture SRS v3.0*
