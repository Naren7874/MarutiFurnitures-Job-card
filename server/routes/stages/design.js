import express from 'express';
import {
  getDesign, createDesign, updateDesign, uploadDesignFiles,
  sendSignoffLink, markDesignReady,
} from '../../controllers/stages/design.js';
import { uploadMultiple } from '../../middleware/upload.js';
import { checkPermission } from '../../middleware/permission.js';

const router = express.Router({ mergeParams: true }); // mergeParams to access /:id

router.get('/',         checkPermission('designrequest.view'),   getDesign);
router.post('/',        checkPermission('designrequest.create'), createDesign);
router.put('/',         checkPermission('designrequest.edit'),   updateDesign);
router.post('/files',   checkPermission('designrequest.upload'), uploadMultiple, uploadDesignFiles);
router.post('/signoff', checkPermission('designrequest.create'), sendSignoffLink);
router.patch('/ready',  checkPermission('designrequest.edit'),   markDesignReady);

export default router;
