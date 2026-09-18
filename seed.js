require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const User = require("./models/User");
const Item = require("./models/Item");
const Visit = require("./models/Visit");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/artaround";

const LANGUAGE_MAP = {
  infantile: "child",
  medio: "medium",
  avanzato: "advanced",
};

const ROLE_MAP = {
  autore: "author",
  visitatore: "visitor",
  admin: "admin",
};

async function runSeed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    console.log("Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      Item.deleteMany({}),
      Visit.deleteMany({}),
    ]);

    const rawData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "seed_data.json"), "utf8"),
    );

    // 1. Seed Users
    console.log("Seeding users...");
    const createdUsers = [];
    for (const u of rawData.utenti) {
      const user = new User({
        username: u.username,
        email: u.email,
        password: u.password,
        role: ROLE_MAP[u.ruolo] || "visitor",
        museum: u.museo || null,
      });
      await user.save();
      createdUsers.push(user);
    }
    const userMap = new Map(createdUsers.map((u) => [u.username, u._id]));

    // 2. Seed Items
    console.log("Seeding items...");
    const itemsToInsert = rawData.items.map((it) => {
      const mappedLang = LANGUAGE_MAP[it.linguaggio] || "medium";
      const creatorId = userMap.get(it.autore_visita) || null;

      return {
        artworkId: it.operaId,
        museum: it.museo,
        title: it.titolo,
        description: it.descrizione,
        audioUrl: it.audioUrl || "",
        tourAuthor: it.autore_visita,
        floor: String(it.piano || "0"),
        mapX: it.mappa_x || 0,
        mapY: it.mappa_y || 0,
        style: it.stile || "Unspecified historical period",
        artist: it.artista || "Unknown",
        period: it.periodo || "",
        url: it.url || null,
        length: it.lunghezza,
        language: mappedLang,
        category: it.categoria || "other",
        tags: it.tags || [],
        license: {
          type: it.licenza?.tipo || "free",
          notes: it.licenza?.note || "",
        },
        price: it.prezzo || 0,
        published: it.pubblicato !== false,
        creatorId: creatorId,
        contentDepth: it.profonditaContenuto || "standard",
        salesLogs: [],
      };
    });

    const insertedItems = await Item.insertMany(itemsToInsert);
    console.log(`Inserted ${insertedItems.length} items.`);

    // 3. Seed Visits
    console.log("Seeding visits...");
    const visitsToInsert = rawData.visits.map((v) => {
      const creatorId = userMap.get(v.autore) || null;
      const baseLevel = LANGUAGE_MAP[v.livello_base] || "medium";

      const stops = (v.tappe || []).map((t) => {
        return {
          order: t.ordine,
          logistics: t.logistica || "",
          artworkId: t.operaId || "",
          difficultyVariants: {
            child: t.varianti_difficolta?.infantile || "",
            medium: t.varianti_difficolta?.medio || "",
            advanced: t.varianti_difficolta?.avanzato || "",
          },
        };
      });

      return {
        title: v.title || v.titolo,
        museum: v.museo,
        image: v.image || "",
        type: v.type || "standard",
        duration: v.duration || "",
        stopsCount: v.stops || stops.length,
        baseLevel: baseLevel,
        generalInfo: v.info_generale || "",
        description: v.descrizione || "",
        stops: stops,
        price: v.prezzo || 0,
        isPublic: v.pubblica !== false,
        creatorId: creatorId,
        license: {
          type: v.licenza?.tipo || "free",
          notes: v.licenza?.note || "",
        },
        adoptionLogs: [],
      };
    });

    const insertedVisits = await Visit.insertMany(visitsToInsert);
    console.log(`Inserted ${insertedVisits.length} visits.`);

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

runSeed();
