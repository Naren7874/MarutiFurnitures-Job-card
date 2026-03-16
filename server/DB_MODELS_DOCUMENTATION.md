# Maruti Furniture — Database Models Reference

> **Last updated:** 2026-03-04  
> **Status:** All audit issues resolved ✅

---

## Model Inventory

| File | Status | Description |
|---|---|---|
| `Company.js` | ✅ Complete | Multi-tenant company / brand |
| `User.js` | ✅ Fixed | Added `department` field |
| `Client.js` | ✅ Complete | Customers, architects, factory managers |
| `Quotation.js` | ✅ Complete | Entry point of the system |
| `Project.js` | ✅ Fixed | Added `projectName`, `architect`, `siteAddress`, `clientGstin` |
| `DesignRequest.js` | ✅ Created | Measurements, CAD files, client sign-off |
| `JobCard.js` | ✅ Fixed | Added `designRequestId` ref |
| `StoreStage.js` | ✅ Fixed | Added `hsnCode` to BOM items |
| `ProductionStage.js` | ✅ Complete | Substages, shortage flag |
| `QcStage.js` | ✅ Complete | Checklist, rework, escalation |
| `DispatchStage.js` | ✅ Complete | Scheduling, challan, POD |
| `Invoice.js` | ✅ Fixed | Added `placeOfSupply`, `reverseCharge`, GSTIN snapshots |
| `Inventory.js` | ✅ Complete | Raw materials, low-stock alert |
| `PurchaseOrder.js` | ✅ Fixed | Added `approvedBy`, `approvedAt`, `requiresApproval` |
| `Role.js` | ✅ Complete | Permission bundles per role |
| `UserPermission.js` | ✅ Complete | Per-user permission overrides |
| `AccessLog.js` | ✅ Complete | Security audit trail (TTL 90d) |
| `Counter.js` | ✅ Complete | Auto-number sequencer |
| `Notification.js` | ✅ Fixed | Added `quotationId` context |

---

## 1. Company
**File:** `Company.js`

The top-level multi-tenant entity. Every record in every collection carries a `companyId`.

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `slug` | String | Unique, lowercase |
| `logo` | String | Cloudinary URL |
| `tagline` | String | |
| `gstin` | String | Uppercase |
| `address` | Object | line1, line2, city, state, pincode |
| `phone` | String | |
| `email` | String | Lowercase |
| `website` | String | |
| `whatsappNumber` | String | Official WA Business number |
| `bankDetails` | Object | accountName, accountNumber, ifsc, bankName, branch |
| `quotationPrefix` | String | Default: `"QT"` → `QT-311025-01` |
| `jobCardPrefix` | String | Default: `"JC"` → `JC-26-011` |
| `invoicePrefix` | String | Default: `"INV"` → `INV-2026-001` |
| `projectPrefix` | String | Default: `"PRJ"` → `PRJ-2026-001` |
| `gstRates` | Object | cgst: 9, sgst: 9, igst: 18 |
| `defaultTermsAndConditions` | [String] | Array of T&C lines |
| `isActive` | Boolean | Default: true |

---

## 2. User
**File:** `User.js`

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `name` | String | Required |
| `email` | String | Required, unique per company |
| `password` | String | Hashed with bcrypt (rounds: 12) |
| `phone` | String | |
| `whatsappNumber` | String | |
| `profilePhoto` | String | Cloudinary URL |
| `role` | String | Enum: `super_admin`, `sales`, `design`, `store`, `production`, `qc`, `dispatch`, `accountant`, `client` |
| **`department`** ✅ | String | Enum: `sales`, `design`, `store`, `production`, `qc`, `dispatch`, `accounts`, `management` |
| `isSuperAdmin` | Boolean | Cross-company access flag |
| `isActive` | Boolean | Default: true |
| `lastLogin` | Date | |
| `resetPasswordToken` | String | |
| `resetPasswordExpires` | Date | |
| `createdBy` | ObjectId | ref: User |

**Hooks:** Password auto-hashed on save. `comparePassword()` method available.

---

## 3. Client
**File:** `Client.js`

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `clientType` | String | Enum: `architect`, `project_designer`, `direct_client`, `factory_manager` |
| `name` | String | Required |
| `firmName` | String | |
| `phone` | String | Required |
| `whatsappNumber` | String | |
| `email` | String | Lowercase |
| `address` | Object | line1, line2, city, state, pincode |
| `gstin` | String | Uppercase |
| `gstVerified` | Boolean | Default: false |
| `gstBusinessName` | String | Returned by GSTIN API |
| `gstState` | String | |
| `gstStatus` | String | Active / Cancelled / Suspended |
| `taxType` | String | Enum: `regular`, `composition`, `urp` |
| `gstVerifiedAt` | Date | |
| `notes` | String | |
| `isActive` | Boolean | Default: true |
| `createdBy` | ObjectId | ref: User |

**Indexes:** `companyId`, `companyId + phone`

---

## 4. Quotation
**File:** `Quotation.js`

The system entry point. Every project originates here.

### Quotation Item (embedded)
| Field | Type | Notes |
|---|---|---|
| `srNo` | Number | Required |
| `category` | String | e.g., "Reception Area" |
| `description` | String | Required |
| `photo` | String | Cloudinary URL |
| `specifications` | Object | size, polish, fabric, material, finish, hardware, notes |
| `qty` | Number | Required |
| `unit` | String | Default: "pcs" |
| `mrp` | Number | MRP per unit (optional display) |
| `sellingPrice` | Number | Required |
| `totalPrice` | Number | Auto-computed: qty × sellingPrice |

### Quotation Schema
| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `quotationNumber` | String | Unique. Auto: `MF-311025-01` |
| `clientId` | ObjectId | ref: Client, required |
| `projectName` | String | Required |
| `architect` | String | |
| `siteAddress` | Object | |
| `requirements` | String | Free-text notes |
| `referenceImages` | [String] | Cloudinary URLs |
| `deliveryDays` | String | e.g., "75 to 90 days" |
| `validUntil` | Date | |
| `items` | [QuotationItem] | |
| `subtotal` | Number | Auto-computed |
| `discount` | Number | |
| `discountNote` | String | |
| `amountAfterDiscount` | Number | Auto-computed |
| `gstType` | String | Enum: `cgst_sgst`, `igst` |
| `cgst` / `sgst` / `igst` | Number | Auto-computed |
| `gstAmount` | Number | Auto-computed |
| `grandTotal` | Number | Auto-computed |
| `advancePercent` | Number | Default: 50 |
| `advanceAmount` | Number | Auto-computed |
| `termsAndConditions` | [String] | |
| `status` | String | Enum: `draft`, `sent`, `approved`, `rejected`, `revised`, `converted` |
| `revisionOf` | ObjectId | ref: Quotation |
| `revisionNumber` | Number | Default: 1 |
| `projectId` | ObjectId | ref: Project (set when converted) |
| `handledBy` | ObjectId | ref: User |
| `pdfURL` | String | Cloudinary URL |

**Hooks:** `pre save` → auto-calculates all totals and GST

---

## 5. Project
**File:** `Project.js`

Born from an approved Quotation.

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `projectNumber` | String | Unique. Auto: `MF-PRJ-2026-001` |
| `clientId` | ObjectId | ref: Client, required |
| `quotationId` | ObjectId | ref: Quotation |
| **`projectName`** ✅ | String | Copied from Quotation on creation. Required |
| **`architect`** ✅ | String | Copied from Quotation on creation |
| **`siteAddress`** ✅ | Object | Copied from Quotation on creation |
| **`clientGstin`** ✅ | String | Copied at creation for reporting |
| `status` | String | Enum: `enquiry`, `quotation_sent`, `approved`, `active`, `on_hold`, `completed`, `cancelled` |
| `priority` | String | Enum: `low`, `medium`, `high`, `urgent` |
| `expectedDelivery` | Date | |
| `actualDelivery` | Date | |
| `whatsapp` | Object | groupName, groupId, groupLink, groupCreatedAt, groupCreatedBy |
| `assignedStaff` | [ObjectId] | ref: User |
| `referenceImages` | [String] | Cloudinary URLs |
| `notes` | String | |
| `createdBy` | ObjectId | ref: User |

---

## 6. DesignRequest ✅ NEW
**File:** `DesignRequest.js`

Stores design team work per Job Card.

### DesignRequest Item (embedded)
| Field | Type | Notes |
|---|---|---|
| `srNo` | Number | Maps to JobCard item |
| `description` | String | |
| `measurements` | Object | height, width, depth, unit (mm/inch/cm), notes |
| `materials` | Object | coreBoard, laminate, edgeBand, polish, fabric, hardware, glassMm, notes |
| `qty` | Number | |
| `status` | String | Enum: `pending`, `in_progress`, `ready_for_signoff`, `signed_off`, `rework` |

### DesignRequest Schema
| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `jobCardId` | ObjectId | ref: JobCard, required, unique |
| `projectId` | ObjectId | ref: Project, required |
| `clientId` | ObjectId | ref: Client, required |
| `items` | [DesignItem] | Per-item design details |
| `files` | Array | title, url, fileType (cad/render/pdf/image/other), version, uploadedBy |
| `signoff` | Object | status, sentAt, respondedAt, approvedBy, rejectedReason, revisionNote, signatureURL |
| `status` | String | Enum: `pending`, `in_progress`, `submitted_for_signoff`, `approved`, `rejected` |
| `notes` | String | |
| `assignedTo` | [ObjectId] | ref: User |
| `createdBy` | ObjectId | ref: User |

---

## 7. JobCard
**File:** `JobCard.js`

The core production document.

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `jobCardNumber` | String | Unique. Auto: `MF-26-011` |
| `projectId` | ObjectId | ref: Project, required |
| `clientId` | ObjectId | ref: Client, required |
| `quotationId` | ObjectId | ref: Quotation |
| **`designRequestId`** ✅ | ObjectId | ref: DesignRequest |
| `title` | String | Required. e.g., "Reception Area Sofas" |
| `items` | [ItemSchema] | srNo, description, photo, specifications, qty, unit |
| `salesperson` | Object | id, name |
| `assignedTo` | Object | design[], store[], production[], qc[], dispatch[], accountant[] |
| `status` | String | 11 states: `active`, `in_store`, `material_ready`, `in_production`, `qc_pending`, `qc_failed`, `qc_passed`, `dispatched`, `delivered`, `closed`, `on_hold`, `cancelled` |
| `whatsapp` | Object | groupName, groupId, groupLink |
| `storeStageId` | ObjectId | ref: StoreStage |
| `productionStageId` | ObjectId | ref: ProductionStage |
| `qcStageId` | ObjectId | ref: QcStage |
| `dispatchStageId` | ObjectId | ref: DispatchStage |
| `orderDate` | Date | Default: now |
| `expectedDelivery` | Date | |
| `actualDelivery` | Date | |
| `priority` | String | Enum: `low`, `medium`, `high`, `urgent` |
| `activityLog` | [ActivityLog] | Immutable audit trail: action, doneBy, prevStatus, newStatus, note, timestamp |
| `isTemplate` | Boolean | |
| `createdBy` | ObjectId | ref: User |

---

## 8. StoreStage
**File:** `StoreStage.js`

BOM check and material issuance.

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `jobCardId` | ObjectId | ref: JobCard, required, unique |
| `projectId` | ObjectId | ref: Project, required |
| `bom` | Array | inventoryId, materialName, **hsnCode** ✅, required, unit, inStock, shortage, issued, issuedAt, issuedBy |
| `purchaseOrderIds` | [ObjectId] | ref: PurchaseOrder |
| `allMaterialsIssued` | Boolean | Flag — triggers status to `material_ready` |
| `status` | String | Enum: `pending`, `po_raised`, `material_ready` |
| `issuedBy` | ObjectId | ref: User |

---

## 9. ProductionStage
**File:** `ProductionStage.js`

Workshop progress by substage.

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `jobCardId` | ObjectId | ref: JobCard, required, unique |
| `projectId` | ObjectId | ref: Project, required |
| `substages` | Array | name (cutting, edge_banding, cnc_drilling, assembly, polishing, finishing, hardware_fitting, packing), status, workerName, startedAt, completedAt, notes |
| `progressNotes` | Array | note, addedBy, addedAt |
| `materialShortage` | Boolean | Auto-alerts store team |
| `shortageNote` | String | |
| `estimatedCompletion` | Date | |
| `actualCompletion` | Date | |
| `status` | String | Enum: `pending`, `in_progress`, `done` |
| `completedBy` | ObjectId | ref: User |

---

## 10. QcStage
**File:** `QcStage.js`

Quality control inspection.

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `jobCardId` | ObjectId | ref: JobCard, required, unique |
| `projectId` | ObjectId | ref: Project, required |
| `checklist` | Array | parameter, passed (bool), notes |
| `defectPhotos` | Array | url, annotation, uploadedAt |
| `verdict` | String | Enum: `pass`, `fail` |
| `reworkCount` | Number | |
| `reworkHistory` | Array | failReason, defectSummary, sentBackAt, sentBackBy, resolvedAt |
| `escalated` | Boolean | Auto-set when `reworkCount > 2` |
| `certificateURL` | String | QC Pass PDF — Cloudinary URL |
| `inspectedBy` | ObjectId | ref: User |

---

## 11. DispatchStage
**File:** `DispatchStage.js`

Delivery scheduling and proof of delivery.

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `jobCardId` | ObjectId | ref: JobCard, required, unique |
| `projectId` | ObjectId | ref: Project, required |
| `scheduledDate` | Date | |
| `timeSlot` | String | e.g., "10:00 AM – 12:00 PM" |
| `deliveryTeam` | Array | name, phone, role (Driver/Helper) |
| `vehicle` | Object | number, type |
| `challanNumber` | String | |
| `challanPDF` | String | Cloudinary URL |
| `itemsDispatched` | Array | srNo, description, qty, dispatchedAt |
| `proofOfDelivery` | Object | photo, signature, gpsLocation, capturedAt |
| `clientNotifiedAt` | Date | When WA delivery_scheduled was sent |
| `status` | String | Enum: `scheduled`, `dispatched`, `delivered` |
| `deliveredBy` | ObjectId | ref: User |

---

## 12. Invoice
**File:** `Invoice.js`

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `invoiceNumber` | String | Unique. Auto: `MF-INV-2026-001` |
| `projectId` | ObjectId | ref: Project |
| `jobCardIds` | [ObjectId] | ref: JobCard |
| `clientId` | ObjectId | ref: Client, required |
| `quotationId` | ObjectId | ref: Quotation |
| **`placeOfSupply`** ✅ | String | State code — required on GST invoice |
| **`reverseCharge`** ✅ | Boolean | RCM applicable? Default: false |
| **`clientGstinSnapshot`** ✅ | String | Locked at invoice time |
| **`companyGstinSnapshot`** ✅ | String | Locked at invoice time |
| `items` | Array | srNo, description, qty, unit, rate, amount, hsnCode (default: "9403") |
| `subtotal` | Number | |
| `discount` | Number | |
| `amountAfterDiscount` | Number | |
| `gstType` | String | Enum: `cgst_sgst`, `igst` |
| `cgst` / `sgst` / `igst` / `gstAmount` | Number | |
| `grandTotal` | Number | |
| `advancePaid` | Number | |
| `balanceDue` | Number | |
| `dueDate` | Date | |
| `payments` | Array | amount, mode (cash/upi/neft/cheque/card), reference, paidAt, recordedBy, receiptURL |
| `status` | String | Enum: `draft`, `sent`, `partially_paid`, `paid`, `overdue` |

---

## 13. Inventory
**File:** `Inventory.js`

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `itemName` | String | Required |
| `category` | String | Enum: `board`, `laminate`, `hardware`, `fabric`, `polish`, `glass`, `other` |
| `unit` | String | Required. e.g., "sheets", "sqft", "pcs" |
| `currentStock` | Number | Default: 0 |
| `minStock` | Number | Alert threshold |
| `pricePerUnit` | Number | |
| `supplier` | String | |
| `lowStockAlert` | Boolean | Set by cron, cleared when restocked |
| `lastAlertSentAt` | Date | |
| `updatedBy` | ObjectId | ref: User |

---

## 14. PurchaseOrder
**File:** `PurchaseOrder.js`

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `poNumber` | String | Unique. Auto: `MF-PO-2026-001` |
| `projectId` | ObjectId | ref: Project |
| `jobCardId` | ObjectId | ref: JobCard |
| `items` | Array | inventoryId, materialName, qty, unit, pricePerUnit, totalPrice (auto) |
| `supplier` | String | |
| `totalAmount` | Number | Auto-computed in pre-save |
| `status` | String | Enum: `raised`, `ordered`, `received`, `cancelled` |
| `expectedDate` | Date | |
| `receivedDate` | Date | |
| **`requiresApproval`** ✅ | Boolean | For high-value POs |
| **`approvedBy`** ✅ | ObjectId | ref: User |
| **`approvedAt`** ✅ | Date | |
| `createdBy` | ObjectId | ref: User |

---

## 15. Notification
**File:** `Notification.js`

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `recipientId` | ObjectId | ref: User, required |
| **`quotationId`** ✅ | ObjectId | ref: Quotation (for pre-project alerts) |
| `projectId` | ObjectId | ref: Project |
| `jobCardId` | ObjectId | ref: JobCard |
| `type` | String | Enum: job_card_created, status_changed, materials_issued, substage_complete, qc_passed, qc_failed, qc_escalated, delivery_scheduled, delivered, job_closed, on_hold, overdue_alert, low_stock_alert, payment_received, payment_overdue, design_signoff_request, general |
| `title` | String | Required |
| `message` | String | Required |
| `channel` | String | Enum: `in_app`, `whatsapp`, `email`, `sms` |
| `waTemplateName` | String | WhatsApp template name |
| `waVariables` | Mixed | Template variable values |
| `isRead` | Boolean | Default: false |
| `deliveryStatus` | String | Enum: `pending`, `sent`, `delivered`, `failed` |
| `retryCount` | Number | |

**TTL:** Read notifications auto-deleted after **30 days**

---

## 16. Role
**File:** `Role.js`

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company, required |
| `name` | String | Required, unique per company |
| `isSystem` | Boolean | true = cannot delete |
| `permissions` | [String] | Format: `"resource.action"` e.g. `"jobcard.create"` |
| `dataScope` | String | Enum: `own`, `department`, `all` |
| `isActive` | Boolean | |
| `createdBy` | ObjectId | ref: User |

---

## 17. UserPermission + PermissionSet
**File:** `UserPermission.js`

### PermissionSet
Reusable bundles of permissions assigned on top of a role.

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company |
| `name` | String | e.g., "Warehouse Lead" |
| `permissions` | [String] | e.g., `["inventory.*", "jobcard.production.view"]` |

### UserPermission
| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company |
| `userId` | ObjectId | ref: User, unique |
| `roleId` | ObjectId | ref: Role |
| `permissionSetIds` | [ObjectId] | ref: PermissionSet |
| `overrides` | Array | permission, type (grant/deny), expiresAt, reason, grantedBy |
| `effectivePermissions` | [String] | Cached computed list |

**Priority:** `user-level deny > user-level grant > role default`

---

## 18. AccessLog
**File:** `AccessLog.js`

Every permission check is logged (allowed + denied).

| Field | Type | Notes |
|---|---|---|
| `companyId` | ObjectId | ref: Company |
| `userId` | ObjectId | ref: User |
| `permission` | String | e.g., `"jobcard.create"` |
| `resource` | String | e.g., `"/api/jobcards"` |
| `result` | String | Enum: `allowed`, `denied` |
| `ip` | String | |
| `userAgent` | String | |
| `timestamp` | Date | Default: now |

**TTL:** Auto-deleted after **90 days**

---

## 19. Counter
**File:** `Counter.js`

Atomic sequence generator — one document per company per document type.

| Field | Type | Notes |
|---|---|---|
| `_id` | String | Format: `"{companyId}_{type}"` e.g. `"mf001_quotation"` |
| `seq` | Number | Default: 0, incremented atomically |

### Generated Number Formats
| Document | Format | Example |
|---|---|---|
| Quotation | `prefix + DDMMYY + seq` | `MF-311025-01` |
| Job Card | `prefix + YY + seq` | `MF-26-011` |
| Invoice | `prefix + YYYY + seq` | `MF-INV-2026-001` |
| Project | `prefix + YYYY + seq` | `MF-PRJ-2026-001` |
| Purchase Order | `prefix + YYYY + seq` | `MF-PO-2026-001` |

---

## Collection Relationships (Simplified)

```
Company
  └── User (companyId)
  └── Client (companyId)
  └── Quotation (companyId, clientId)
        └── Project (quotationId, clientId)
              └── JobCard (projectId, clientId, quotationId)
                    ├── DesignRequest (jobCardId) ← NEW
                    ├── StoreStage    (jobCardId) → PurchaseOrder → Inventory
                    ├── ProductionStage (jobCardId)
                    ├── QcStage       (jobCardId)
                    └── DispatchStage (jobCardId)
              └── Invoice (projectId, clientId, quotationId)
  └── Role
  └── UserPermission (userId, roleId)
  └── PermissionSet
  └── AccessLog (userId)
  └── Counter
  └── Notification (recipientId, quotationId?, projectId?, jobCardId?)
```
