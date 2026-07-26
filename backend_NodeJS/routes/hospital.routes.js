const express = require("express");

const router = express.Router();

const {
    getHospitals
} = require("../controllers/hospital.controller");

router.get("/", getHospitals);

module.exports = router;