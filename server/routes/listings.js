const express = require("express");
const Listing = require("../models/Listing");
const auth = require("../middleware/auth");

const router = express.Router();

function buildListingQuery(query) {
  const mongoQuery = {};

  if (query.search) {
    mongoQuery.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { location: { $regex: query.search, $options: "i" } },
    ];
  }

  if (query.category) {
    mongoQuery.category = query.category;
  }

  if (query.status) {
    mongoQuery.status = query.status;
  }

  if (query.type) {
    mongoQuery.type = query.type.toUpperCase();
  }

  return mongoQuery;
}

function normalizeListingPayload(body) {
  return {
    type: String(body.type || "").toUpperCase(),
    title: body.title,
    description: body.description,
    category: body.category,
    location: body.location,
    imageUrl: body.imageUrl,
    date: body.date,
  };
}

router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find(buildListingQuery(req.query))
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch listings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "userId",
      "name email",
    );

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch listing" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const payload = normalizeListingPayload(req.body);

    if (
      !payload.type ||
      !payload.title ||
      !payload.description ||
      !payload.category ||
      !payload.location ||
      !payload.date
    ) {
      return res.status(400).json({
        message:
          "type, title, description, category, location, and date are required",
      });
    }

    if (!["LOST", "FOUND"].includes(payload.type)) {
      return res.status(400).json({ message: "type must be LOST or FOUND" });
    }

    const listing = await Listing.create({
      ...payload,
      userId: req.user.id,
    });

    const savedListing = await Listing.findById(listing._id).populate(
      "userId",
      "name email",
    );

    res.status(201).json(savedListing);
  } catch (err) {
    res.status(500).json({ message: "Unable to create listing" });
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only edit your own listing" });
    }

    const payload = normalizeListingPayload(req.body);

    if (payload.type && !["LOST", "FOUND"].includes(payload.type)) {
      return res.status(400).json({ message: "type must be LOST or FOUND" });
    }

    listing.type = payload.type || listing.type;
    listing.title = payload.title || listing.title;
    listing.description = payload.description || listing.description;
    listing.category = payload.category || listing.category;
    listing.location = payload.location || listing.location;
    listing.date = payload.date || listing.date;
    if (payload.imageUrl !== undefined) {
      listing.imageUrl = payload.imageUrl;
    }

    await listing.save();

    const updatedListing = await Listing.findById(listing._id).populate(
      "userId",
      "name email",
    );

    res.json(updatedListing);
  } catch (err) {
    res.status(500).json({ message: "Unable to update listing" });
  }
});

router.patch("/:id/status", auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only update your own listing" });
    }

    if (listing.status === "Returned") {
      return res.status(400).json({ message: "Listing is already returned" });
    }

    listing.status = "Returned";
    await listing.save();

    const updatedListing = await Listing.findById(listing._id).populate(
      "userId",
      "name email",
    );

    res.json(updatedListing);
  } catch (err) {
    res.status(500).json({ message: "Unable to update listing status" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own listing" });
    }

    await listing.deleteOne();
    res.json({ message: "Listing deleted" });
  } catch (err) {
    res.status(500).json({ message: "Unable to delete listing" });
  }
});

module.exports = router;
