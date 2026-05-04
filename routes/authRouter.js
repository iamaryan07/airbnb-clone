const express = require("express");
const authRouter = express.Router();

const authController = require("../controller/authController");

authRouter.get("/login", authController.getLogin);
authRouter.post("/login", authController.postLogin);
authRouter.post("/logout", authController.postLogout);
authRouter.get("/register", authController.getRegister);
authRouter.post("/register", authController.postRegister);

authRouter.get("/verify/:token", authController.verifyUser);
authRouter.get("/forgot-password", authController.getForgotPassword);
authRouter.post("/forgot-password", authController.postForgotPassword);
authRouter.get("/reset/:token", authController.getResetPassword);
authRouter.post("/reset/:token", authController.postResetPassword);

authRouter.get("/change-password", authController.getChangePassword);
authRouter.post("/change-password", authController.postChangePassword);

module.exports = authRouter;
