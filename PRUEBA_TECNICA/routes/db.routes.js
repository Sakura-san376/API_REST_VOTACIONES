// routes/db.routes.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/health", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ db: "ok", result: rows[0] });
  } catch (err) {
    err.status = 500;
    next(err);
  }
});

module.exports = router;
