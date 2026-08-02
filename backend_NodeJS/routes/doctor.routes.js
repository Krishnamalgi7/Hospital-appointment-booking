const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
    createDoctor
} = require("../controllers/doctor.controller");

router.post(
    "/",
    verifyToken,
    authorizeRoles("admin"),
    createDoctor
);

module.exports = router;