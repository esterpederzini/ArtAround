const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/apiController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/museums", ctrl.getMuseums);
router.get("/musei", ctrl.getMuseums); 

router.get("/items", ctrl.getItems);
router.get("/items/:id", ctrl.getItemById);
router.post(
  "/items",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.createItem,
);
router.put(
  "/items/:id",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.updateItem,
);
router.delete(
  "/items/:id",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.deleteItem,
);
router.patch(
  "/items/:id/publish",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.publishItem,
);
router.patch(
  "/items/:id/pubblica",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.publishItem,
);
router.post("/items/:id/purchase", requireAuth, ctrl.purchaseItem);
router.post("/items/:id/acquista", requireAuth, ctrl.purchaseItem);

router.get("/visits", ctrl.getVisits);
router.get("/visite", ctrl.getVisits);
router.get("/visits/:id", ctrl.getVisitById);
router.get("/visite/:id", ctrl.getVisitById);
router.post(
  "/visits",
  requireAuth,
  requireRole("author", "admin", "visitor"),
  ctrl.createVisit,
);
router.post(
  "/visite",
  requireAuth,
  requireRole("author", "admin", "visitor"),
  ctrl.createVisit,
);
router.put(
  "/visits/:id",
  requireAuth,
  requireRole("author", "admin", "visitor"),
  ctrl.updateVisit,
);
router.put(
  "/visite/:id",
  requireAuth,
  requireRole("author", "admin", "visitor"),
  ctrl.updateVisit,
);
router.delete(
  "/visits/:id",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.deleteVisit,
);
router.delete(
  "/visite/:id",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.deleteVisit,
);
router.post("/visits/:id/adopt", requireAuth, ctrl.adoptVisit);
router.post("/visite/:id/adotta", requireAuth, ctrl.adoptVisit);

router.get(
  "/users",
  requireAuth,
  requireRole("author", "admin", "visitor"),
  ctrl.getUsers,
);
router.get(
  "/utenti",
  requireAuth,
  requireRole("author", "admin", "visitor"),
  ctrl.getUsers,
);
router.post("/register", ctrl.registerUser);
router.post("/login", ctrl.loginUser);

router.get("/stats", ctrl.getStats);
router.get(
  "/logs/sales",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.getSalesLogs,
);
router.get(
  "/log/vendite",
  requireAuth,
  requireRole("author", "admin"),
  ctrl.getSalesLogs,
);

module.exports = router;
