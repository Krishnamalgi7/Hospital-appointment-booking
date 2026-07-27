const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  User.findUserByEmail(email, async (err, results) => {

    if (err) {
      return res.status(500).json({
        message: "Database Error"
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  });

};

module.exports = {
  register,
  login,
};
