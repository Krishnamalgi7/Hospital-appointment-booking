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

module.exports = {
    getHospitals
};