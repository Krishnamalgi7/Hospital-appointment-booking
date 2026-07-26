const bcrypt = require("bcrypt");

const User = require("../models/user.model");
const Patient = require("../models/patient.model");

// Register Controller
const register = (req, res) => {
  const { name, email, password, role, age, gender, phone } = req.body;

  // Basic Validation
  if (!name || !email || !password || !role || !age || !gender || !phone) {
    return res.status(400).json({
      message: "All fields are required.",
    });
  }

  // Check if email already exists
  User.findUserByEmail(email, async (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Database Error",
      });
    }

    if (results.length > 0) {
      return res.status(409).json({
        message: "Email already exists.",
      });
    }

    // Hash Password
    const password_hash = await bcrypt.hash(password, 10);

    // Create User Object
    const newUser = {
      name,
      email,
      password_hash,
      role,
    };

    // Insert into users table
    User.createUser(newUser, (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Unable to create user.",
        });
      }

      const patient = {
        user_id: result.insertId,
        age,
        gender,
        phone,
      };

      Patient.createPatient(patient, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Unable to create patient.",
          });
        }

        res.status(201).json({
          message: "Patient registered successfully.",
        });
      });
    });
  });
};

// Login Controller
const login = (req, res) => {
  res.json({
    message: "Login Controller Working",
  });
};

module.exports = {
  register,
  login,
};
