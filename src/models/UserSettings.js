const { Schema, model } = require("mongoose");

const userSchema = new Schema({
  userID: { type: String, required: true, unique: true },
  language: { type: String, default: "pt-BR" },
  executedCommands: { type: Number, default: 0 },
  premium: { type: Boolean, default: false },
  blacklist: {
    isBanned: { type: Boolean, default: false },
    since: { type: Date, default: null },
    reason: { type: String, default: null }
  }
});

module.exports = model("UserSettings", userSchema);