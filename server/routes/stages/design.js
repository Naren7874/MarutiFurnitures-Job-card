import express from 'express';
import {
  getDesign, createDesign, updateDesign, uploadDesignFiles,
  sendSignoffLink, markDesignReady,
  getSignoffPage, submitSignoff,
} from '../../controllers/stages/design.js';
import { uploadMultiple } from '../../middleware/upload.js';
import { checkPermission } from '../../middleware/permission.js';

const router = express.Router({ mergeParams: true }); // mergeParams to access /:id

// ── Authenticated routes ──────────────────────────────────────────────────────
router.get('/',         checkPermission('designrequest.view'),   getDesign);
router.post('/',        checkPermission('designrequest.create'), createDesign);
router.put('/',         checkPermission('designrequest.edit'),   updateDesign);
router.post('/files',   checkPermission('designrequest.upload'), uploadMultiple, uploadDesignFiles);
router.post('/signoff', checkPermission('designrequest.signoff'), sendSignoffLink);
router.patch('/ready',  checkPermission('designrequest.ready'),  markDesignReady);

// ── Public signoff routes (no auth — token-based) ─────────────────────────────
router.get('/signoff/:token',    getSignoffPage);
router.post('/signoff/:token',   submitSignoff);

export default router;
