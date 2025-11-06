// routes/candidates.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/candidates.controller");

router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);
router.delete("/:id", ctrl.remove);

module.exports = router;
