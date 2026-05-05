const { check, validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.getLogin = (req, res, next) => {
  let message = [];

  const sessionMessage = req.session.message;
  req.session.message = null;

  if (sessionMessage) {
    message.push(sessionMessage);
  }

  if (req.query.verified === "true") {
    message.push("Verification successful. Please login.");
  }

  res.render("auth/login", {
    pageTitle: "Login",
    errors: message,
    oldInput: { email: "" },
  });
};

exports.getRegister = (req, res, next) => {
  res.render("auth/register", {
    pageTitle: "Register",
    errors: [],
    oldInput: {},
  });
};

exports.postRegister = [
  check("firstName")
    .notEmpty()
    .trim()
    .isLength({ min: 3 })
    .withMessage("First name must be at least 3 characters long")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("First name should contain only letters"),

  check("lastName")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters long")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("Last name should contain only letters"),

  check("email")
    .notEmpty()
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  check("password")
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage("Password should be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password should contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password should contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password should contain at least one number")
    .matches(/[!@#$%^&*]/)
    .withMessage("Password should contain at least one special character")
    .trim(),

  check("confirmPassword")
    .notEmpty()
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("role")
    .notEmpty()
    .withMessage("Please select a user type")
    .isIn(["guest", "host"])
    .withMessage("Invalid User Type"),

  check("terms")
    .notEmpty()
    .withMessage("Please accept the terms and conditions")
    .custom((value, { req }) => {
      if (value !== "on") {
        throw new Error("Please accept the terms and conditions");
      }
      return true;
    }),

  (req, res, next) => {
    const { firstName, lastName, email, password, role } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("auth/register", {
        pageTitle: "Register",
        errors: errors.array().map((e) => e.msg),
        oldInput: { firstName, lastName, email, password, role },
      });
    }

    bcrypt.hash(password, 12).then(async (hashedPassword) => {
      try {
        const token = crypto.randomBytes(32).toString("hex");
        const user = new User({
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role,
          isActive: false,
          verificationToken: token,
          verificationTokenExpiry: Date.now() + 600000,
        });
        await user.save();

        const info = await transporter.sendMail({
          to: email,
          subject: "Verify your account",
          html: `
          <h2>Email Verification for airbnb</h2>
          <p>Click below to activate your account:</p>
          <a href="${process.env.BASE_URL}/verify/${token}">
            Verify Account
          </a>
        `,
        });
        req.session.message =
          "If this email exists, a reset link has been sent.";
        console.log("MAIL SENT:", info.response);
        res.redirect("/login");
      } catch (error) {
        console.log("REGISTER ERROR:", error);

        return res.status(500).render("auth/register", {
          pageTitle: "Register",
          errors: ["Something went wrong. Try again."],
          oldInput: { firstName, lastName, email, password, role },
        });
      }
    });
  },
];

exports.postLogin = [
  check("email").notEmpty().withMessage("Email is required").trim(),
  check("password").notEmpty().withMessage("Password is required").trim(),

  (req, res, next) => {
    const { email, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("auth/login", {
        pageTitle: "Login",
        errors: errors.array().map((err) => err.msg),
        oldInput: { email },
      });
    }

    User.findOne({ email })
      .then((user) => {
        if (!user) {
          return res.status(422).render("auth/login", {
            pageTitle: "Login",
            isLoggedIn: req.session.isLoggedIn,
            errors: ["User doesn't exist"],
            oldInput: { email },
          });
        }

        return bcrypt.compare(password, user.password).then((isMatch) => {
          if (!isMatch) {
            return res.status(422).render("auth/login", {
              pageTitle: "Login",
              isLoggedIn: req.session.isLoggedIn,
              errors: ["Invalid Username or Password"],
              oldInput: { email },
            });
          }

          if (!user.isActive) {
            return res.status(403).render("auth/login", {
              pageTitle: "Login",
              errors: ["Please verify your email first"],
              oldInput: { email },
            });
          }

          req.session.isLoggedIn = true;
          req.session.user = {
            _id: user._id.toString(),
            role: user.role,
          };

          req.session.save((err) => {
            if (err) {
              console.log("SAVE ERROR:", err);
            }
            res.redirect("/");
          });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  },
];

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.redirect("/");
    }
    res.redirect("/login");
  });
};

exports.verifyUser = async (req, res, next) => {
  const token = req.params.token;

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send("Invalid or expired token");
  }

  user.isActive = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;

  await user.save();

  res.redirect("/login?verified=true");
};

exports.getForgotPassword = (req, res, next) => {
  res.render("auth/forget-password", {
    pageTitle: "Forget Password",
    errors: [],
  });
};

exports.postForgotPassword = [
  check("email").notEmpty(),

  async (req, res, next) => {
    const email = req.body.email;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        req.session.message =
          "If this email exists, a reset link has been sent.";
        return res.redirect("/login");
      }

      const token = crypto.randomBytes(32).toString("hex");
      user.resetToken = token;
      user.resetTokenExpiry = Date.now() + 600000;
      await user.save();

      await transporter.sendMail({
        to: email,
        subject: "Reset your password",
        html: `
        <h2>Password Reset</h2>
        <p>Click below to reset your password:</p>
        <a href="${process.env.BASE_URL}/reset/${token}">
          Reset Password
        </a>
      `,
      });

      req.session.message = "If this email exists, a reset link has been sent.";
      return res.redirect("/login");
    } catch (error) {
      console.log("FORGOT ERROR: ", error);
      req.session.message = "Something went wrong";
      return res.redirect("/forget-password");
    }
  },
];

exports.getResetPassword = async (req, res, next) => {
  const token = req.params.token;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    req.session.message = "Invalid or expired reset link";
    return res.redirect("/login");
  }

  res.render("auth/reset-password", {
    pageTitle: "Reset Password",
    errors: [],
    token: token,
  });
};

exports.postResetPassword = [
  check("password")
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage("Password should be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password should contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password should contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password should contain at least one number")
    .matches(/[!@#$%^&*]/)
    .withMessage("Password should contain at least one special character")
    .trim(),

  check("confirmPassword")
    .notEmpty()
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  async (req, res, next) => {
    const token = req.params.token;
    const password = req.body.password;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render("auth/reset-password", {
          pageTitle: "Reset Password",
          errors: errors.array().map((err) => err.msg),
          token: token,
        });
      }

      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      });

      if (!user) {
        req.session.message = "Invalid or expired reset link";
        return res.redirect("/login");
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;

      await user.save();

      req.session.message = "Password reset successful. Please login.";
      res.redirect("/login");
    } catch (error) {
      req.session.message = "Something went wrong.";
      return res.redirect("/");
    }
  },
];

exports.getChangePassword = (req, res, next) => {
  return res.render("auth/change-password", {
    pageTitle: "Change Password",
    errors: [],
  });
};

exports.postChangePassword = [
  check("currentPassword").notEmpty(),

  check("newPassword")
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage("Password should be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password should contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password should contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password should contain at least one number")
    .matches(/[!@#$%^&*]/)
    .withMessage("Password should contain at least one special character")
    .trim(),

  check("confirmPassword")
    .notEmpty()
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  async (req, res, next) => {
    try {
      if (!req.session.user) {
        return res.redirect("/login");
      }

      const userId = req.session.user._id;
      const currentPassword = req.body.currentPassword;
      const newPassword = req.body.newPassword;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render("auth/change-password", {
          pageTitle: "Change Password",
          errors: errors.array().map((err) => err.msg),
        });
      }

      const user = await User.findOne({ _id: userId });
      if (!user) return res.redirect("/login");

      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        req.session.message = "Incorrect Password";
        return res.redirect("/change-password");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;
      await user.save();
      req.session.message = "Password updated. Please log in again";
      req.session.destroy(() => {
        return res.redirect("/login");
      });
    } catch (error) {
      console.log("Error while Changing Password: ", error);
      return res.redirect("/login");
    }
  },
];
