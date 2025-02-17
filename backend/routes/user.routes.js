import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { body } from "express-validator";
import * as authMiddleware from "../middleware/auth.middleware.js";
const router = Router();

router.post(
  "/register",
  body("email").isEmail().withMessage("Email is not valid"),
  body("password")
    .isLength({ min: 3, max: 50 })
    .withMessage("Password must be at least 3 characters long"),
  userController.createUserController
);

router.post(
  "/login",
  body("email").isEmail().withMessage("Email is not valid"),
  body("password")
    .isLength({ min: 3, max: 50 })
    .withMessage("Password must be at least 3 characters long"),
  userController.loginUserController
);

router.get("/all", authMiddleware.authUser, userController.getAllUserController);
router.get("/profile", authMiddleware.authUser, userController.profleContoller);

router.get("/logout", authMiddleware.authUser, userController.logoutController);

export default router;
