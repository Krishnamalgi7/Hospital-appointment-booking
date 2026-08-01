const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const authorizeRoles = require("../middleware/role.middleware");

const {
    getHospitals,
    createHospital,
    updateHospital,
    deleteHospital
} = require("../controllers/hospital.controller");


router.get(
    "/",
    verifyToken,
    authorizeRoles("admin"),
    getHospitals
);

router.post(
    "/",
    verifyToken,
    authorizeRoles("admin"),
    createHospital
);

router.put(
    "/:id",
    verifyToken,
    authorizeRoles("admin"),
    updateHospital
);

router.delete(
    "/:id",
    verifyToken,
    authorizeRoles("admin"),
    deleteHospital
);

module.exports = router;