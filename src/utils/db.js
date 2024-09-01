const GuildSettings = require("../models/GuildSettings.js");
const UserSettings = require("../models/UserSettings.js");

const db = {
  users: {
    async get(user) {
      if (!user || !user.id) {
        throw new Error("Objeto de usuário inválido");
      }

      let userSettings = await UserSettings.findOne({ userID: user.id });

      if (!userSettings) {
        userSettings = new UserSettings({ userID: user.id });
        await userSettings.save();
      }

      return userSettings;
    },

    async delete(user) {
      if (!user || !user.id) {
        throw new Error("Objeto de usuário inválido");
      }

      const result = await UserSettings.deleteOne({ userID: user.id });
      return result.deletedCount > 0;
    },
  },

  guilds: {
    async get(guild) {
      if (!guild || !guild.id) {
        throw new Error("Objeto de servidor inválido");
      }

      let guildSettings = await GuildSettings.findOne({ guildID: guild.id });

      if (!guildSettings) {
        guildSettings = new GuildSettings({ guildID: guild.id, prefix: process.env.PREFIX });
        await guildSettings.save();
      }

      return guildSettings;
    },

    async delete(guild) {
      if (!guild || !guild.id) {
        throw new Error("Objeto de servidor inválido");
      }

      const result = await GuildSettings.deleteOne({ guildID: guild.id });
      return result.deletedCount > 0;
    },
  },
};

module.exports = { db };