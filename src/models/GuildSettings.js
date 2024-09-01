const { Schema, model } = require("mongoose");

const guildSchema = new Schema({
  guildID: { type: String, required: true, unique: true },
  prefix: { type: String, default: process.env.PREFIX },
  blacklist: { type: Boolean, default: false }
});

module.exports = model("GuildSettings", guildSchema);