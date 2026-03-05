import express from 'express';
import {
  getProduction, updateSubstage, addProgressNote, flagShortage, markProductionDone,
} from '../../controllers/stages/production.js';
import { checkPermission } from '../../middleware/permission.js';

const router = express.Router({ mergeParams: true });

router.get('/',               checkPermission('productionStage.view'), getProduction);
router.patch('/substage',     checkPermission('productionStage.edit'), updateSubstage);
router.post('/note',          checkPermission('productionStage.edit'), addProgressNote);
router.patch('/shortage',     checkPermission('productionStage.edit'), flagShortage);
router.patch('/done',         checkPermission('productionStage.edit'), markProductionDone);

export default router;
