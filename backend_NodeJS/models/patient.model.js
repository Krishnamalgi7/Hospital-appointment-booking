const db = require("../config/db");

// Create Patient
const createPatient = (patient, callback) => {

    const sql = `
        INSERT INTO patients
        (user_id, age, gender, phone)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            patient.user_id,
            patient.age,
            patient.gender,
            patient.phone
        ],
        callback
    );

};

module.exports = {
    createPatient
};