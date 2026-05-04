const express = require("express");
const hostController = require("../controller/hostController");
const isHost = require("../middlewares/isHost");
const isGuest = require("../middlewares/isGuest");
const hostRouter = express.Router();

hostRouter.get("/add-home", isHost, hostController.getAddHome);
hostRouter.post("/add-home", isHost, hostController.postAddHome);
hostRouter.get("/home-list", isHost, hostController.getHostHome);
hostRouter.get("/bookings", isHost, hostController.getBookings);
hostRouter.post("/bookings", isGuest, hostController.postBookings);
hostRouter.get("/edit-home/:homeId", isHost, hostController.getEditHome);
hostRouter.post("/edit-home/:homeId", isHost, hostController.postEditHome);
hostRouter.post("/delete-home/:homeId", isHost, hostController.postDeleteHome);

module.exports = hostRouter;
