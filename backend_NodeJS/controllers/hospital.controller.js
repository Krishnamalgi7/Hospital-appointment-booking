const Hospital = require("../models/hospital.model");

const getHospitals = (req, res) => {

    Hospital.getAllHospitals((err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database Error",
                error: err.message
            });
        }

        res.status(200).json(results);

    });

};



// Create Hospital
const createHospital = (req, res) => {

    const { name, location } = req.body;

    // Validation
    if (!name || !location) {
        return res.status(400).json({
            message: "Hospital name and location are required."
        });
    }

    const hospital = {
        name,
        location
    };

    Hospital.createHospital(hospital, (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Unable to create hospital."
            });
        }

        return res.status(201).json({
            message: "Hospital created successfully.",
            hospitalId: result.insertId
        });

    });

};

// Update Hospital
const updateHospital = (req, res) => {

    const id = req.params.id;

    const { name, location } = req.body;

    // Validation
    if (!name || !location) {
        return res.status(400).json({
            message: "Hospital name and location are required."
        });
    }

    const hospital = {
        name,
        location
    };

    Hospital.updateHospital(id, hospital, (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Unable to update hospital."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Hospital not found."
            });
        }

        return res.status(200).json({
            message: "Hospital updated successfully."
        });

    });

};

// Delete Hospital
const deleteHospital = (req, res) => {

    const id = req.params.id;

    Hospital.deleteHospital(id, (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Unable to delete hospital."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Hospital not found."
            });
        }

        return res.status(200).json({
            message: "Hospital deleted successfully."
        });

    });

};

module.exports = {
    getHospitals,
    createHospital,
    updateHospital,
    deleteHospital
};