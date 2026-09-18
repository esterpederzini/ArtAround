const Item = require("../models/Item");
const Visit = require("../models/Visit");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { createAuthToken } = require("../middleware/auth");
const mm = require("music-metadata");
const path = require("path");
const fs = require("fs");

const sendResponse = (res, status, data, message = "") => {
  res.status(status).json({ success: status < 400, message, data });
};

async function buildStopsFromEditorItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
  );
  const stops = [];
  let fallbackOrder = 1;
  for (const row of sorted) {
    if (!row.itemId) continue;
    const idStr = String(row.itemId);
    const itemDoc = await Item.findById(idStr).select("artworkId").lean();
    const artworkId = itemDoc?.artworkId || row.artworkId || "";
    stops.push({
      order: row.order != null ? Number(row.order) : fallbackOrder,
      logistics: row.logistics || "",
      defaultItem: idStr,
      artworkId,
      optional: !!row.optional,
    });
    fallbackOrder += 1;
  }
  return stops.length ? stops : null;
}

async function enrichStopsWithArtworkIds(stops) {
  if (!Array.isArray(stops) || !stops.length) return stops;
  const out = [];
  for (const row of stops) {
    const idStr = String(row.defaultItem ?? "");
    let artworkId = row.artworkId || "";
    if (idStr && !artworkId) {
      const doc = await Item.findById(idStr).select("artworkId").lean();
      artworkId = doc?.artworkId || "";
    }
    out.push({
      ...row,
      order: row.order != null ? Number(row.order) : out.length + 1,
      logistics: row.logistics ?? "",
      defaultItem: idStr,
      artworkId,
    });
  }
  return out;
}

async function normalizeVisitPayloadForStorage(body) {
  const out = { ...body };
  if (Array.isArray(out.items) && out.items.length > 0) {
    const built = await buildStopsFromEditorItems(out.items);
    if (built) {
      out.stops = built;
      delete out.items;
    }
  }
  if (Array.isArray(out.stops) && out.stops.length > 0) {
    out.stops = await enrichStopsWithArtworkIds(out.stops);
  }
  return out;
}

exports.getMuseums = async (req, res) => {
  try {
    const museums = await Item.distinct("museum");
    sendResponse(res, 200, museums);
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.getItems = async (req, res) => {
  try {
    const {
      museum,
      language,
      category,
      license,
      minPrice,
      maxPrice,
      search,
      artworkId,
      length,
      page = 1,
      limit = 20,
      published = "true",
    } = req.query;

    const filter = {};
    if (museum) filter.museum = museum;
    if (language) filter.language = language;
    if (category) filter.category = category;
    if (artworkId) filter.artworkId = artworkId;
    if (length) filter.length = length;
    if (license) filter["license.type"] = license;
    if (published !== "all") filter.published = published === "true";

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { artworkId: { $regex: search, $options: "i" } },
        { artist: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Item.find(filter)
        .populate("creatorId", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Item.countDocuments(filter),
    ]);

    sendResponse(res, 200, {
      items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      "creatorId",
      "username",
    );
    if (!item) return sendResponse(res, 404, null, "Item not found");
    sendResponse(res, 200, item);
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.createItem = async (req, res) => {
  try {
    const creatorId = req.auth?.sub;
    const user = await User.findById(creatorId);
    if (!user || !["author", "admin"].includes(user.role)) {
      return sendResponse(res, 403, null, "Only authors can create content");
    }

    const newItemData = { ...req.body };
    delete newItemData._id;
    delete newItemData.id;

    newItemData.creatorId = creatorId;
    newItemData.tourAuthor = user.username;

    const item = await Item.create(newItemData);
    sendResponse(res, 201, item, "Item created successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!item) return sendResponse(res, 404, null, "Item not found");
    sendResponse(res, 200, item, "Item updated successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return sendResponse(res, 404, null, "Item not found");
    sendResponse(res, 200, null, "Item deleted successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.publishItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { published: true },
      { new: true },
    );
    if (!item) return sendResponse(res, 404, null, "Item not found");
    sendResponse(res, 200, item, "Item published successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.purchaseItem = async (req, res) => {
  try {
    const buyerId = req.auth?.sub;
    const itemId = req.params.id;

    const item = await Item.findById(itemId);
    if (!item) return sendResponse(res, 404, null, "Item not found");

    const transactionType = item.price > 0 ? "purchase" : "adoption";
    const newLog = {
      buyerId,
      price: item.price || 0,
      type: transactionType,
      purchaseDate: new Date(),
    };

    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      { $push: { salesLogs: newLog } },
      { new: true, runValidators: false },
    );

    await User.findByIdAndUpdate(buyerId, {
      $push: {
        purchases: { itemId: item._id, price: item.price || 0 },
      },
    });

    sendResponse(res, 200, updatedItem, "Purchase completed successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.getVisits = async (req, res) => {
  try {
    const { museum, creatorId, onlyMine, page = 1, limit = 12 } = req.query;
    const userId = req.auth?.sub;

    const filter = {};
    if (museum) filter.museum = museum;
    if (creatorId) filter.creatorId = creatorId;

    if (onlyMine === "true" && userId) {
      const user = await User.findById(userId).select("savedVisits");
      if (user) {
        filter._id = { $in: user.savedVisits };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [visitDocs, total] = await Promise.all([
      Visit.find(filter)
        .populate("creatorId", "username")
        .populate({
          path: "adoptionLogs.adopterId",
          select: "username",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Visit.countDocuments(filter),
    ]);

    const visits = await Promise.all(
      visitDocs.map(async (v) => {
        if (v.stops && Array.isArray(v.stops)) {
          v.stops = await Promise.all(
            v.stops.map(async (stop) => {
              if (!stop.defaultItem || typeof stop.defaultItem !== "object") {
                const targetArtworkId = stop.artworkId || "";
                const visitLanguage = v.baseLevel || "medium";

                const matchedItem = await Item.findOne({
                  artworkId: targetArtworkId,
                  museum: v.museum,
                  language: visitLanguage,
                }).lean();

                if (matchedItem) {
                  stop.defaultItem = matchedItem;
                } else {
                  const fallbackItem = await Item.findOne({
                    artworkId: targetArtworkId,
                  }).lean();
                  stop.defaultItem = fallbackItem || {
                    title: stop.logistics
                      ? stop.logistics.substring(0, 45) + "..."
                      : `Stop ${stop.order}`,
                    artworkId: targetArtworkId || `OP-${stop.order}`,
                    length: "15s",
                    language: "medium",
                  };
                }
              }
              return stop;
            }),
          );
        }
        return v;
      }),
    );

    sendResponse(res, 200, {
      visits,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("Error getVisits:", err.message);
    sendResponse(res, 500, null, err.message);
  }
};

exports.getVisitById = async (req, res) => {
  try {
    const visit = await Visit.findOne({
      $or: [{ _id: req.params.id }, { id: req.params.id }],
    })
      .populate("creatorId", "username email")
      .populate({
        path: "stops.defaultItem",
        model: "Item",
        select:
          "title artworkId length language url description artist category price license audioUrl period style mapX mapY floor",
      });

    if (!visit) return sendResponse(res, 404, null, "Visit not found");

    const visitObj = visit.toObject();

    if (visitObj.stops && Array.isArray(visitObj.stops)) {
      for (let stop of visitObj.stops) {
        if (!stop.defaultItem && stop.artworkId) {
          const targetLanguage =
            stop.defaultLanguage || visitObj.baseLevel || "medium";
          const targetLength = stop.defaultLength || "15s";

          const foundItem = await Item.findOne({
            artworkId: stop.artworkId,
            language: targetLanguage,
            length: targetLength,
          })
            .select(
              "title artworkId length language url description artist category price license audioUrl period style mapX mapY floor",
            )
            .lean();

          if (foundItem) {
            stop.defaultItem = foundItem;
          } else {
            const fallbackItem = await Item.findOne({
              artworkId: stop.artworkId,
            }).lean();
            if (fallbackItem) {
              stop.defaultItem = fallbackItem;
            }
          }
        }

        if (!stop.defaultItem || !stop.defaultItem.audioUrl) continue;

        try {
          const audioFileName = stop.defaultItem.audioUrl.split("/").pop();
          const audioFilePath = path.join(
            process.cwd(),
            "navigator",
            "public",
            "audio",
            audioFileName,
          );

          if (fs.existsSync(audioFilePath)) {
            const metadata = await mm.parseFile(audioFilePath);
            stop.defaultItem.realDuration = Math.round(
              metadata.format.duration,
            );
          }
        } catch (audioErr) {
          console.error("Error reading audio metadata:", audioErr.message);
        }
      }
    }

    sendResponse(res, 200, visitObj);
  } catch (err) {
    console.error("CRITICAL ERROR getVisitById:", err.message);
    sendResponse(res, 500, null, err.message);
  }
};

exports.createVisit = async (req, res) => {
  try {
    const payload = await normalizeVisitPayloadForStorage({ ...req.body });
    const visit = await Visit.create({
      ...payload,
      creatorId: req.auth?.sub,
    });
    sendResponse(res, 201, visit, "Visit created successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.updateVisit = async (req, res) => {
  try {
    const payload = await normalizeVisitPayloadForStorage({ ...req.body });
    const mongoUpdate = { $set: payload };
    if (Object.prototype.hasOwnProperty.call(payload, "stops")) {
      mongoUpdate.$unset = { items: "" };
    }
    const visit = await Visit.findByIdAndUpdate(req.params.id, mongoUpdate, {
      new: true,
      runValidators: true,
    });
    if (!visit) return sendResponse(res, 404, null, "Visit not found");
    sendResponse(res, 200, visit, "Visit updated successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.deleteVisit = async (req, res) => {
  try {
    const visit = await Visit.findByIdAndDelete(req.params.id);
    if (!visit) return sendResponse(res, 404, null, "Visit not found");
    sendResponse(res, 200, null, "Visit deleted successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.adoptVisit = async (req, res) => {
  try {
    const adopterId = req.auth?.sub;
    const visit = await Visit.findById(req.params.id);
    if (!visit) return sendResponse(res, 404, null, "Visit not found");

    visit.adoptionLogs.push({ adopterId, price: visit.price || 0 });
    await visit.save();

    await User.findByIdAndUpdate(adopterId, {
      $addToSet: { savedVisits: visit._id },
    });
    sendResponse(res, 200, visit, "Visit adopted successfully");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    sendResponse(res, 200, users);
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const identifier = (username || "").trim();
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier.toLowerCase() }],
    });
    if (!user) return sendResponse(res, 401, null, "User not found");

    let isPasswordValid = false;
    if (user.password && user.password.startsWith("$2")) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      isPasswordValid = user.password === password;
      if (isPasswordValid) {
        const newHash = await bcrypt.hash(password, 12);
        await User.updateOne(
          { _id: user._id },
          { $set: { password: newHash } },
        );
        user.password = newHash;
      }
    }

    if (!isPasswordValid)
      return sendResponse(res, 401, null, "Invalid password");
    const token = createAuthToken(user);
    sendResponse(res, 200, { user: user.toJSON(), token }, "Login successful");
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return sendResponse(res, 400, null, "Registration data is incomplete");
    }

    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: email.toLowerCase().trim() },
      ],
    });

    if (existingUser) {
      const errorMessage =
        existingUser.username === username.trim()
          ? "This username is already taken"
          : "This email is already registered";
      return sendResponse(res, 400, null, errorMessage);
    }

    const validRole = ["visitor", "author"].includes(role) ? role : "visitor";

    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: validRole,
    });

    await newUser.save();

    const token = createAuthToken(newUser);
    const userOutput = newUser.toJSON();

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: userOutput, token },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return sendResponse(res, 500, null, err.message);
  }
};

exports.getSalesLogs = async (req, res) => {
  try {
    const items = await Item.find({ "salesLogs.0": { $exists: true } })
      .populate("salesLogs.buyerId", "username")
      .select("title artworkId museum salesLogs price");
    sendResponse(res, 200, items);
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalItems, totalVisits, totalUsers, freeItems, paidItems] =
      await Promise.all([
        Item.countDocuments({ published: true }),
        Visit.countDocuments({ isPublic: true }),
        User.countDocuments(),
        Item.countDocuments({ price: 0, published: true }),
        Item.countDocuments({ price: { $gt: 0 }, published: true }),
      ]);
    sendResponse(res, 200, {
      totalItems,
      totalVisits,
      totalUsers,
      freeItems,
      paidItems,
    });
  } catch (err) {
    sendResponse(res, 500, null, err.message);
  }
};
