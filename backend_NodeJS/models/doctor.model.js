const db = require("../config/db");

// Create Doctor
const createDoctor = (doctor, callback) => {
  const sql = `
        INSERT INTO doctors
        (
            user_id,
            hospital_id,
            specialization,
            experience,
            consultation_fee
        )
        VALUES (?, ?, ?, ?, ?)
    `;

  db.query(
    sql,
    [
      doctor.user_id,
      doctor.hospital_id,
      doctor.specialization,
      doctor.experience,
      doctor.consultation_fee,
    ],
    callback,
  );
};

module.exports = {
  createDoctor,
};
