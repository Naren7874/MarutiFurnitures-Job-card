import express from 'express';
import { getDispatch, scheduleDispatch, markDelivered } from '../../controllers/stages/dispatch.js';
import { uploadSingle } from '../../middleware/upload.js';
import { checkPermission } from '../../middleware/permission.js';

const router = express.Router({ mergeParams: true });

router.get('/',           checkPermission('dispatchStage.view'),    getDispatch);
router.post('/',          checkPermission('dispatchStage.edit'),    scheduleDispatch);
router.patch('/deliver',  checkPermission('dispatchStage.deliver'), uploadSingle, markDelivered);

export default router;
