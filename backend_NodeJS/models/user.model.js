const db = require("../config/db");

// Find user by email
const findUserByEmail = (email, callback) => {

    const sql = `
        SELECT *
        FROM users
        WHERE email = ?
    `;

    db.query(sql, [email], callback);

};

// Create user
const createUser = (user, callback) => {

    const sql = `
        INSERT INTO users
        (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            user.name,
            user.email,
            user.password_hash,
            user.role
        ],
        callback
    );

};

module.exports = {
    findUserByEmail,
    createUser
};