const mongoose = require('mongoose');

const tempRoleSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    roleID: { type: String, required: true },
    guildID: { type: String, required: true },
    expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model('TempRole', tempRoleSchema);