const mongoose = require("mongoose");

const bookingSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  home: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Home",
    required: true,
  },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  totalPrice: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// homeSchema.pre("findOneAndDelete", async function () {
//   console.log("Came to pre hook to delete Home");
//   const homeId = this.getQuery()._id;
//   await favourites.deleteMany({ houseId: homeId });
// });

module.exports = mongoose.model("Booking", bookingSchema);
