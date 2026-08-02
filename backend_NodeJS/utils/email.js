const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendDoctorCredentials = async (
    doctorEmail,
    doctorName,
    temporaryPassword
) => {

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: doctorEmail,
        subject: "Hospital Management System - Doctor Account",

        html: `
            <h2>Welcome ${doctorName}</h2>

            <p>Your doctor account has been created successfully.</p>

            <p><strong>Email:</strong> ${doctorEmail}</p>

            <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>

            <p>Please login and change your password.</p>
        `
    };

    await transporter.sendMail(mailOptions);

};

module.exports = {
    sendDoctorCredentials
};