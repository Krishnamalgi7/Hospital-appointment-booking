const db = require("../config/db");

// Fetch all hospitals
const getAllHospitals = (callback) => {

    const sql = `
        SELECT *
        FROM hospitals
    `;

    db.query(sql, callback);
};


// Create Hospital
const createHospital = (hospital, callback) => {

    const sql = `
        INSERT INTO hospitals
        (name, location)
        VALUES (?, ?)
    `;

    db.query(
        sql,
        [
            hospital.name,
            hospital.location
        ],
        callback
    );

};

// Update Hospital
const updateHospital = (id, hospital, callback) => {

    const sql = `
        UPDATE hospitals
        SET name = ?, location = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            hospital.name,
            hospital.location,
            id
        ],
        callback
    );

};

// Delete Hospital
const deleteHospital = (id, callback) => {

    const sql = `
        DELETE FROM hospitals
        WHERE id = ?
    `;

    db.query(
        sql,
        [id],
        callback
    );

};

module.exports = {
    getAllHospitals,
    createHospital,
    updateHospital,
    deleteHospital
};