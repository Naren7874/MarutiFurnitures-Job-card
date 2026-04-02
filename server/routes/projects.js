import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  saveWhatsAppGroup,
  updateProjectStatus,
  updateProject,
  deleteProject,
} from '../controllers/projects.js';
import { authenticateJWT }    from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission }    from '../middleware/permission.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

router.post('/',                  checkPermission('project.create'), createProject);
router.get('/',                   checkPermission('project.view'),   getProjects);
router.get('/:id',                checkPermission('project.view'),   getProjectById);
router.put('/:id',                checkPermission('project.edit'),   updateProject);
router.patch('/:id/whatsapp',     checkPermission('project.edit'),   saveWhatsAppGroup);
router.patch('/:id/status',       checkPermission('project.edit'),   updateProjectStatus);
router.delete('/:id',              checkPermission('project.delete'), deleteProject);

export default router;
