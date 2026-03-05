import express from 'express';
import { getQC, updateChecklist, uploadDefectPhotos, passQC, failQC } from '../../controllers/stages/qc.js';
import { uploadMultiple } from '../../middleware/upload.js';
import { checkPermission } from '../../middleware/permission.js';

const router = express.Router({ mergeParams: true });

router.get('/',               checkPermission('qcStage.view'),  getQC);
router.put('/checklist',      checkPermission('qcStage.edit'),  updateChecklist);
router.post('/defect-photos', checkPermission('qcStage.edit'),  uploadMultiple, uploadDefectPhotos);
router.patch('/pass',         checkPermission('qcStage.pass'),  passQC);
router.patch('/fail',         checkPermission('qcStage.fail'),  failQC);

export default router;
