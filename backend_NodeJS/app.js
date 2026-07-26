const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const hospitalRoutes = require("./routes/hospital.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/hospitals", hospitalRoutes);

// Test Route
app.get("/", (req, res) => {
    res.json({
        message: "Hospital Management API is Running...."
    });
});

module.exports = app;