/*
File: scripts/mongo.js
Descrizione: Popolamento DB per Gocker usando i modelli esistenti
*/

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const Item = require("../models/Item");
const Visit = require("../models/Visita");
const User = require("../models/User");

let dbname = "site252620";

const getUri = (credentials) => {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  return `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
};

exports.create = async (credentials) => {
  let debug = [];
  try {
    const mongouri = getUri(credentials);

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongouri);
    }
    debug.push("✅ Connesso al DB");

    let seedPath = path.join(__dirname, "..", "seed_data.json");
    debug.push(`Lettura file: ${seedPath}`);

    let doc = await fs.readFile(seedPath, "utf8");
    let fullData = JSON.parse(doc);

    await Item.deleteMany({});
    await Visit.deleteMany({});
    await User.deleteMany({});
    debug.push("🗑️ Database ripulito");

    if (fullData.utenti) {
      const utentiConPasswordHashata = await Promise.all(
        fullData.utenti.map(async (utente) => {
          const passwordHashata =
            utente.password && !utente.password.startsWith("$2")
              ? await bcrypt.hash(utente.password, 12)
              : utente.password;
          return { ...utente, password: passwordHashata };
        }),
      );
      await User.insertMany(utentiConPasswordHashata);
      debug.push(
        `👤 Inseriti ${fullData.utenti.length} utenti (password hashate con bcrypt)`,
      );
    }

    if (fullData.items) {
      const itemsMescolati = [...fullData.items];
      for (let i = itemsMescolati.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [itemsMescolati[i], itemsMescolati[j]] = [
          itemsMescolati[j],
          itemsMescolati[i],
        ];
      }

      await Item.insertMany(itemsMescolati);
      debug.push(
        `🖼️ Inseriti ${fullData.items.length} items in ordine casuale!`,
      );
    }

    if (fullData.visits) {
      let visitsToInsert = await Promise.all(
        fullData.visits.map(async (v) => {
          // 👤 ASSOCIAZIONE AUTOMATICA AUTORE/CREATORID
          // Prendiamo lo username dal JSON (può essere sotto v.creatorId o v.autore)
          const usernameAutore = v.creatorId || v.autore || "museo";

          // Cerchiamo l'utente appena inserito nel database per prenderne il vero ID
          const utenteTrovato = await User.findOne({
            username: usernameAutore,
          }).lean();
          const veroCreatorId = utenteTrovato ? utenteTrovato._id : null;

          // 🖼️ ASSOCIAZIONE AUTOMATICA ITEM DELLE TAPPE
          const tappeArricchite = await Promise.all(
            (v.tappe || []).map(async (t) => {
              const itemTrovato = await Item.findOne({
                operaId: t.operaId,
                linguaggio: v.livello_base || "medio",
              }).lean();

              return {
                ordine: t.ordine,
                logistica: t.logistica || t.indicazione_per_raggiungerlo,
                operaId: t.operaId,
                item_default: itemTrovato ? itemTrovato._id : null,
                varianti_difficolta: t.varianti_difficolta || {},
              };
            }),
          );

          return {
            id: v.id,
            title: v.title || v.titolo,
            image: v.image || v.immagine,
            museo: v.museo,
            pubblica: v.pubblica ?? false,
            livello_base: v.livello_base || v.difficolta_target,
            info_generale: v.info_generale || v.descrizione_logistica,
            stops: v.stops || tappeArricchite.length,
            duration: v.duration || "60 min",
            tappe: tappeArricchite,
            // 🌟 Sincronizziamo i campi per evitare incoerenze con il modello
            creatorId: veroCreatorId, // Sarà un vero ObjectId di Mongoose!
            autore: usernameAutore, // Manteniamo la stringa come paracadute per il frontend
          };
        }),
      );

      await Visit.insertMany(visitsToInsert);
      debug.push(
        `🗺️ Inserite ${visitsToInsert.length} visite con relazioni e autori perfetti`,
      );
    }

    return {
      success: true,
      message:
        "<h1>Successo!</h1><p>DB Gocker popolato correttamente usando i modelli originali.</p>",
      debug: debug,
    };
  } catch (e) {
    console.error("Errore in create:", e);
    return { success: false, error: e.message, debug: debug };
  }
};
