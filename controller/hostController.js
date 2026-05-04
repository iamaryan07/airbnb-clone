const Home = require("../models/home");
const path = require("path");
const fs = require("fs");
const Booking = require("../models/bookings");

exports.getAddHome = (req, res, next) => {
  res.render("host/edit-home", {
    pageTitle: "Add Home",
    editing: false,
  });
};

exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === "true";
  const owner = req.session.user._id;
  Home.findOne({ _id: homeId, owner }).then((home) => {
    if (!home) {
      console.log("Home not found");
      return res.redirect("/host/home-list");
    } else {
      res.render("host/edit-home", {
        pageTitle: "Edit Home",
        editing: editing,
        home: home,
      });
    }
  });
};

exports.postAddHome = (req, res, next) => {
  const userId = req.session.user._id;
  const { houseName, price, location, rating, description } = req.body;

  const images = req.files["url"] || [];

  if (images.length === 0) {
    return res
      .status(422)
      .send("Please upload at least one image (JPG, JPEG, PNG).");
  }

  const url = images.map((file) => file.path);
  const rulesFile = req.files.rules?.[0];
  const rules = rulesFile ? rulesFile.path : undefined;

  const home = new Home({
    houseName,
    price,
    location,
    rating,
    url,
    rules,
    description,
    owner: userId,
  });
  home
    .save()
    .then(() => {
      return res.redirect("/host/home-list");
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).send("Failed to save home");
    });
};

exports.postEditHome = async (req, res, next) => {
  const id = req.params.homeId;
  const owner = req.session.user._id;
  const { houseName, price, location, rating, description } = req.body;

  try {
    const home = await Home.findOne({ _id: id, owner });

    if (!home) {
      return res.status(404).send("Home not found");
    }

    const updatedData = {
      houseName,
      price,
      location,
      rating,
      description,
    };

    const images = req.files?.["url"] || [];
    const rulesFile = req.files?.["rules"]?.[0];

    if (images.length > 0) {
      updatedData.url = images.map((file) => file.path);
    }

    if (rulesFile) {
      updatedData.rules = rulesFile.path;
    }

    await Home.findOneAndUpdate({ _id: id, owner }, updatedData);

    return res.redirect("/host/home-list");
  } catch (error) {
    console.log("Error while updating:", error);
    return res.status(500).send("Update failed");
  }
};

exports.postDeleteHome = async (req, res, next) => {
  const homeId = req.params.homeId;
  const owner = req.session.user._id;

  try {
    const home = await Home.findOne({ _id: homeId, owner });

    if (!home) {
      return res.status(404).send("Home not found");
    }

    await Home.findOneAndDelete({ _id: homeId, owner });

    return res.redirect("/host/home-list");
  } catch (error) {
    console.log("Error while deleting:", error);
    return res.status(500).send("Delete failed");
  }
};

exports.getHostHome = (req, res, next) => {
  Home.find({ owner: req.session.user._id }).then((registeredHomes) => {
    res.render("host/host-home-list", {
      registeredHomes: registeredHomes,
      pageTitle: "Host Home List",
    });
  });
};

exports.getBookings = async (req, res, next) => {
  try {
    const ownerId = req.session.user._id;

    const homes = await Home.find({ owner: ownerId });

    const homeIds = homes.map((home) => home._id);

    const bookings = await Booking.find({ home: { $in: homeIds } })
      .populate("home")
      .populate("user");

    return res.render("host/bookings", {
      pageTitle: "Bookings",
      bookings,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Failed to load bookings");
  }
};

exports.postBookings = async (req, res, next) => {
  try {
    const { homeId, fromDate, toDate } = req.body;
    const userId = req.session.user._id;

    if (new Date(fromDate) >= new Date(toDate)) {
      return res.status(400).send("Invalid date range");
    }

    if (!homeId) {
      return res.status(400).send("Invalid home");
    }

    const existingBooking = await Booking.findOne({
      home: homeId,
      $or: [
        {
          fromDate: { $lt: toDate },
          toDate: { $gt: fromDate },
        },
      ],
    });

    if (existingBooking) {
      return res.status(400).send("Home already booked for selected dates");
    }

    const home = await Home.findById(homeId);

    const days =
      (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24);

    const totalPrice = home.price * days;

    const booking = new Booking({
      user: userId,
      home: homeId,
      fromDate,
      toDate,
      totalPrice,
    });

    await booking.save();

    return res.redirect("/bookings");
  } catch (error) {
    console.log(error);
    return res.status(500).send("Booking failed");
  }
};
