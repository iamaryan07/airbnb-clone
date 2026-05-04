const express = require("express");
const storeController = require("../controller/storeController");
const isGuest = require("../middlewares/isGuest");
const storeRouter = express.Router();

storeRouter.get("/", storeController.getIndex);
storeRouter.get("/bookings", isGuest, storeController.getBookings);
storeRouter.get("/homes", isGuest, storeController.getHome);
storeRouter.get("/favourites", isGuest, storeController.getFavouriteList);
storeRouter.post("/favourites/", isGuest, storeController.postAddToFavourite);
storeRouter.get("/homes/:homeId", isGuest, storeController.getHomeDetails);
storeRouter.post(
  "/favourites/remove/:homeId",
  isGuest,
  storeController.postRemoveFromFavourite,
);

module.exports = storeRouter;
