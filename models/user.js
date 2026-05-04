const mongoose = require("mongoose");
const Booking = require("./bookings");
const Home = require("./home");

const userSchema = mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First Name is required"],
  },
  lastName: String,
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  role: {
    type: String,
    enum: ["guest", "host"],
    default: "guest",
  },
  favourites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Home",
    },
  ],
  isActive: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpiry: Date,
  resetToken: String,
  resetTokenExpiry: Date,
});

userSchema.pre("findOneAndDelete", async function (next) {
  try {
    const user = await this.model.findOne(this.getFilter());

    if (!user) return next();

    // Delete all bookings made by user
    await Booking.deleteMany({ user: user._id });

    // Find homes owned by user
    const homes = await Home.find({ owner: user._id });

    const homeIds = homes.map((h) => h._id);

    // Delete bookings for those homes (guests bookings)
    await Booking.deleteMany({ home: { $in: homeIds } });

    // Delete homes
    await Home.deleteMany({ owner: user._id });

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("User", userSchema);
