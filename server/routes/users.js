const express = require("express");
const Listing = require("../models/Listing");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/me/listings", auth, async (req, res) => {
  try {
    const listings = await Listing.find({ userId: req.user.id })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch your listings" });
  }
});

module.exports = router;
