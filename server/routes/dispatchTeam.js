import express from "express";
import { 
  getDispatchMembers, 
  createDispatchMember, 
  deleteDispatchMember 
} from "../controllers/dispatchTeam.js";
import { authenticateJWT } from "../middleware/auth.js";
import { injectCompanyScope } from "../middleware/scope.js";

const router = express.Router();

router.use(authenticateJWT, injectCompanyScope);

router.route("/")
  .get(getDispatchMembers)
  .post(createDispatchMember);

router.route("/:id")
  .delete(deleteDispatchMember);

export default router;
