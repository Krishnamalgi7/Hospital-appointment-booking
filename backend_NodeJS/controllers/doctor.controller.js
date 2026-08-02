const bcrypt = require("bcrypt");

const User = require("../models/user.model");
const Doctor = require("../models/doctor.model");
const db = require("../config/db");

const createDoctor = async (req, res) => {
  const {
    name,
    email,
    hospital_id,
    specialization,
    experience,
    consultation_fee,
  } = req.body;

  // Validation
  if (
    !name ||
    !email ||
    !hospital_id ||
    !specialization ||
    experience === undefined ||
    consultation_fee === undefined
  ) {
    return res.status(400).json({
      message: "All fields are required.",
    });
  }

  User.findUserByEmail(email, async (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Database Error",
      });
    }

    if (results.length > 0) {
      return res.status(409).json({
        message: "Doctor email already exists.",
      });
    }

    // Generate Temporary Password
    const temporaryPassword = Math.random().toString(36).slice(-8);

    // Hash Password
    const password_hash = await bcrypt.hash(temporaryPassword, 10);

    // Create User Object
    const newUser = {
      name,
      email,
      password_hash,
      role: "doctor",
    };

    db.beginTransaction((err) => {
      if (err) {
        return res.status(500).json({
          message: "Unable to start transaction.",
        });
      }

      // Insert into users table
      User.createUser(newUser, (err, result) => {
        if (err) {
          console.error(err);

          return db.rollback(() => {
            return res.status(500).json({
              message: "Unable to create doctor account...",
              error: err.message,
            });
          });
        }

        const doctor = {
          user_id: result.insertId,
          hospital_id,
          specialization,
          experience,
          consultation_fee,
        };

        Doctor.createDoctor(doctor, (err) => {
          if (err) {
            console.error(err);
            return db.rollback(() => {
              return res.status(500).json({
                message: "Unable to create doctor profile.",
              });
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                return res.status(500).json({
                  message: "Unable to commit transaction.",
                });
              });
            }

            return res.status(201).json({
              message: "Doctor created successfully.",
              temporaryPassword,
            });
          });
        });
      });
    });
  });
};

module.exports = {
  createDoctor,
};
