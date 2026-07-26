const db = require("../config/db");

// Fetch all hospitals
const getAllHospitals = (callback) => {

    const sql = `
        SELECT *
        FROM hospitals
    `;

    db.query(sql, callback);
};

module.exports = {
    getAllHospitals
};