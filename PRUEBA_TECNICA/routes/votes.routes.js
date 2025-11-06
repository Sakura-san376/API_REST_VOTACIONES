const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/votes.controller");

router.post("/", ctrl.create);      
router.get("/", ctrl.list);         
router.get("/statistics", ctrl.statistics); 
router.get("/:id", ctrl.getById);   

module.exports = router;
