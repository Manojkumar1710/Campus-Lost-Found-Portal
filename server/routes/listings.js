const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const Listing = require("../models/Listing");
const auth = require("../middleware/auth");
const { isConfigured, uploadImage } = require("../services/cloudinary");

const router = express.Router();
const categories = [
  "Electronics",
  "Documents",
  "Clothing",
  "Accessories",
  "Other",
];
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      return callback(
        new Error("Only JPEG, PNG, and WebP images are supported"),
      );
    }
    callback(null, true);
  },
});

function parseImageUpload(req, res, next) {
  if (!req.is("multipart/form-data")) return next();

  upload.single("image")(req, res, (error) => {
    if (error) {
      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(400)
          .json({ message: "Image must be 5 MB or smaller" });
      }
      return res
        .status(400)
        .json({ message: error.message || "Unable to read image upload" });
    }
    next();
  });
}

async function resolveImageUrl(req, res) {
  if (!req.file) return undefined;
  if (!isConfigured()) {
    res
      .status(503)
      .json({ message: "Image uploads are not configured on the server" });
    return null;
  }

  try {
    const result = await uploadImage(req.file.buffer);
    return result.secure_url;
  } catch (error) {
    res.status(502).json({ message: "Unable to upload image" });
    return null;
  }
}

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

function validateListingPayload(payload) {
  if (
    !payload.type ||
    !payload.title ||
    !payload.description ||
    !payload.category ||
    !payload.location ||
    !payload.date
  ) {
    return "type, title, description, category, location, and date are required";
  }

  if (!["LOST", "FOUND"].includes(payload.type)) {
    return "type must be LOST or FOUND";
  }

  if (!categories.includes(payload.category)) {
    return "category is not supported";
  }

  if (Number.isNaN(new Date(payload.date).getTime())) {
    return "date must be valid";
  }

  if (payload.imageUrl && !/^https?:\/\//i.test(payload.imageUrl)) {
    return "imageUrl must be a valid http or https URL";
  }

  return null;
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Listing not found" });
    }

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

router.post("/", auth, parseImageUpload, async (req, res) => {
  try {
    const imageUrl = await resolveImageUrl(req, res);
    if (req.file && imageUrl === null) return;
    const payload = normalizeListingPayload({
      ...req.body,
      imageUrl: imageUrl ?? req.body.imageUrl,
    });
    const validationMessage = validateListingPayload(payload);
    if (validationMessage)
      return res.status(400).json({ message: validationMessage });

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

router.patch("/:id", auth, parseImageUpload, async (req, res) => {
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

    const imageUrl = await resolveImageUrl(req, res);
    if (req.file && imageUrl === null) return;
    const payload = normalizeListingPayload({
      ...req.body,
      imageUrl: imageUrl ?? req.body.imageUrl,
    });

    if (payload.type && !["LOST", "FOUND"].includes(payload.type)) {
      return res.status(400).json({ message: "type must be LOST or FOUND" });
    }
    if (payload.category && !categories.includes(payload.category)) {
      return res.status(400).json({ message: "category is not supported" });
    }
    if (payload.date && Number.isNaN(new Date(payload.date).getTime())) {
      return res.status(400).json({ message: "date must be valid" });
    }
    if (payload.imageUrl && !/^https?:\/\//i.test(payload.imageUrl)) {
      return res
        .status(400)
        .json({ message: "imageUrl must be a valid http or https URL" });
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
