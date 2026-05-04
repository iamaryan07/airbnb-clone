const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/bookings");

exports.getHome = (req, res, next) => {
  Home.find().then((registeredHomes) => {
    res.render("store/home-list", {
      registeredHomes: registeredHomes,
      pageTitle: "Home List",
    });
  });
};

exports.getIndex = async (req, res, next) => {
  try {
    const registeredHomes = await Home.find()
      .sort({ rating: -1 }) // highest rating first
      .limit(6); // only top 6

    res.render("store/index", {
      registeredHomes,
      pageTitle: "airbnb Home",
      role: req.session.user.role,
    });
  } catch (err) {
    console.log("Error fetching index homes:", err);
    res.render("store/index", {
      registeredHomes: [],
      pageTitle: "airbnb Home",
    });
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id;

    const bookings = await Booking.find({ user: userId }).populate("home");

    return res.render("store/bookings", {
      pageTitle: "Bookings",
      bookings,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Failed to load bookings");
  }
};

exports.getFavouriteList = async (req, res, next) => {
  const userId = req.session.user._id;
  const user = await User.findById(userId).populate("favourites");
  res.render("store/favourite-list", {
    favouriteHomes: user.favourites,
    pageTitle: "My Favourites",
  });
};

exports.postAddToFavourite = async (req, res, next) => {
  const homeId = req.body.id;
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (!user.favourites.includes(homeId)) {
    user.favourites.push(homeId);
    await user.save();
  }
  res.redirect("/favourites");
};

exports.postRemoveFromFavourite = async (req, res, next) => {
  const homeId = req.params.homeId;
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (user.favourites.includes(homeId)) {
    user.favourites = user.favourites.filter(
      (fav) => fav.toString() !== homeId,
    );
    await user.save();
  }
  res.redirect("/favourites");
};

// exports.getHomeDetails = async (req, res, next) => {
//   const homeId = req.params.homeId;
//   const bookings = await Booking.find({ home: homeId });

//   Home.findById(homeId).then((home) => {
//     if (!home) {
//       console.log("Home Not Found");
//       res.redirect("/homes");
//     } else {
//       res.render("store/home-detail", {
//         home: home,
//         booking,
//         pageTitle: "Home Detail",
//       });
//     }
//   });
// };

exports.getHomeDetails = async (req, res, next) => {
  try {
    const homeId = req.params.homeId;

    const bookings = await Booking.find({ home: homeId });
    const home = await Home.findById(homeId);

    if (!home) {
      return res.redirect("/homes");
    }

    const today = new Date();

    // find the booking that covers today
    const activeBooking = bookings.find(
      (b) => today >= b.fromDate && today <= b.toDate,
    );

    res.render("store/home-detail", {
      home: home,
      bookings: bookings,
      activeBooking: activeBooking, // <-- pass this instead
      pageTitle: "Home Detail",
    });
  } catch (err) {
    console.log(err);
  }
};
