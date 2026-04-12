import express from 'express';
import {
  getProduction, updateSubstage, addProgressNote, markProductionDone, startProduction, resetProduction
} from '../../controllers/stages/production.js';
import { checkPermission } from '../../middleware/permission.js';

const router = express.Router({ mergeParams: true });

router.get('/',               checkPermission('productionStage.view'), getProduction);
router.post('/start',         checkPermission(['productionStage.edit', 'jobcard.edit']), startProduction);
router.patch('/substage',     checkPermission('productionStage.edit'), updateSubstage);
router.post('/note',          checkPermission('productionStage.edit'), addProgressNote);
router.patch('/done',         checkPermission('productionStage.edit'), markProductionDone);
router.patch('/reset',        checkPermission('productionStage.edit'), resetProduction);

export default router;
