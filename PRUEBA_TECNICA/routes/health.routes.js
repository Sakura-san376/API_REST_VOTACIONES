const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");

// GET /api/health
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    // Simulemos algo async
    await new Promise((r) => setTimeout(r, 50));
    res.json({ status: "ok", uptime: process.uptime() });
  })
);

// Ruta que falla a propósito para probar el manejador
router.get(
  "/boom",
  asyncHandler(async () => {
    const err = new Error("Explosión controlada");
    err.status = 418; // I'm a teapot (solo para ver que respeta el status)
    throw err;
  })
);

module.exports = router;
