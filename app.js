// require("dotenv").config();

// const DB_PATH = process.env.DB_PATH;
// console.log(process.env.DB_PATH);

// const express = require("express");
// const path = require("path");
// const mongoose = require("mongoose");
// const multer = require("multer");

// const storeRouter = require("./routes/storeRouter");
// const hostRouter = require("./routes/hostRouter");
// const authRouter = require("./routes/authRouter");
// const errorController = require("./controller/errors");

// const session = require("express-session");
// const MongoDBStore = require("connect-mongodb-session")(session);

// const app = express();

// app.set("view engine", "ejs");
// app.set("views", "views");

// // MongoDB session store
// const store = new MongoDBStore({
//   uri: DB_PATH,
//   collection: "sessions",
// });

// // 🔴 VERY IMPORTANT: log session store errors
// store.on("error", (error) => {
//   console.log("SESSION STORE ERROR:", error);
// });

// // middlewares
// const randomString = (length) => {
//   const chars = "abcdefghijklmnopqrstuvwxyz";
//   let result = "";
//   for (let i = 0; i < length; i++) {
//     result += chars.charAt(Math.floor(Math.random() * chars.length));
//   }
//   return result;
// };

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     if (file.fieldname === "url") {
//       cb(null, "uploads/");
//     } else if (file.fieldname === "rules") {
//       cb(null, "rules/");
//     } else {
//       cb(new Error("Invalid file field"), false);
//     }
//   },
//   filename: (req, file, cb) => {
//     cb(null, randomString(10) + "-" + file.originalname);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   if (
//     file.mimetype === "image/png" ||
//     file.mimetype === "image/jpg" ||
//     file.mimetype === "image/jpeg" ||
//     file.mimetype === "application/pdf"
//   ) {
//     cb(null, true);
//   } else {
//     cb(null, false);
//   }
// };

// const multerOptions = {
//   storage,
//   fileFilter,
// };

// app.use(express.static(path.join(__dirname, "public")));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/host/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/rules", express.static(path.join(__dirname, "rules")));
// app.use("/host/rules", express.static(path.join(__dirname, "rules")));
// app.use(express.urlencoded({ extended: false }));
// app.use(
//   multer(multerOptions).fields([
//     { name: "url", maxCount: 5 },
//     { name: "rules", maxCount: 1 },
//   ]),
// );

// // session middleware (must come before routes)
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: store,
//   }),
// );

// // 🔴 expose session globally to views (CRITICAL FIX)
// app.use((req, res, next) => {
//   res.locals.isLoggedIn = req.session.isLoggedIn;
//   res.locals.user = req.session.user;
//   next();
// });

// // routes
// app.use(authRouter);
// app.use(storeRouter);
// app.use("/host", hostRouter);

// // 404
// app.use(errorController.pageNotFound);

// // server
// const PORT = process.env.PORT || 3000;
// mongoose
//   .connect(DB_PATH)
//   .then(() => {
//     console.log("Connected to DB");
//     app.listen(PORT, () => {
//       // console.log(`Server running on address http://localhost:${PORT}`);
//       console.log(`Server running on port ${PORT}`);
//     });
//   })
//   .catch((error) => {
//     console.log("Error while connecting to DB", error);
//   });

require("dotenv").config();

const DB_PATH = process.env.DB_PATH;
const PORT = process.env.PORT || 3000;

if (!DB_PATH) {
  throw new Error("DB_PATH is missing in .env");
}

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");

const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require("./routes/authRouter");
const errorController = require("./controller/errors");

const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./config/cloudinary");

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

// ✅ MongoDB session store
const store = new MongoDBStore({
  uri: DB_PATH,
  collection: "sessions",
});

store.on("error", (error) => {
  console.log("SESSION STORE ERROR:", error);
});

// ✅ Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "airbnb-homes",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"], // aligned with fileFilter
  },
});

// ✅ File filter
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// ✅ Multer setup
app.use(
  multer({ storage, fileFilter }).fields([
    { name: "url", maxCount: 5 },
    { name: "rules", maxCount: 1 },
  ]),
);

// ✅ Static files
app.use(express.static(path.join(__dirname, "public")));

// (Optional: keep if you still support old local images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/rules", express.static(path.join(__dirname, "rules")));

// ✅ Body parser
app.use(express.urlencoded({ extended: false }));

// ✅ Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  }),
);

// ✅ Make session available in all views
app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn;
  res.locals.user = req.session.user;
  next();
});

// ✅ Routes
app.use(authRouter);
app.use(storeRouter);
app.use("/host", hostRouter);

// ✅ 404
app.use(errorController.pageNotFound);

// ✅ Server start
mongoose
  .connect(DB_PATH)
  .then(() => {
    console.log("Connected to DB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Error while connecting to DB", error);
  });
