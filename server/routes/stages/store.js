import express from 'express';
import { getStore, updateBOM, issueBOMItem, issueAllMaterials } from '../../controllers/stages/store.js';
import { checkPermission } from '../../middleware/permission.js';

const router = express.Router({ mergeParams: true });

router.get('/',                      checkPermission('storeStage.view'),  getStore);
router.post('/bom',                  checkPermission('storeStage.edit'),  updateBOM);
router.patch('/issue/:bomItemId',    checkPermission('storeStage.issue'), issueBOMItem);
router.patch('/issue-all',           checkPermission('storeStage.issue'), issueAllMaterials);

export default router;
