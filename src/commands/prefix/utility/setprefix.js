const { PermissionFlagsBits } = require("discord.js");
const { t, db, e } = require("../../../utils");

module.exports = {
  name: "setprefix",
  description: "Set a new prefix for this server",
  usage: "{currentPrefix}setprefix <new prefix>",
  aliases: ["prefixset"],
  devOnly: false,
  async execute(message, args) {
    const { member, guild, author } = message;

    const language = ((await db.users.get(author)).language);
    const guildDb = await db.guilds.get(guild);

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      message.reply({
        content: t("permissions.missingManageGuildPermission", {
          locale: language,
          replacements: { denyEmoji: e.deny }
        })
      });
      return;
    }

    const currentPrefix = guildDb?.prefix || process.env.PREFIX; 

    if (!args.length) {
      message.reply({
        content: t("setprefix.missingArgs", {
          locale: language,
          replacements: {
            denyEmoji: e.deny,
            rightArrowEmoji: e.rightArrow,
            currentPrefix: currentPrefix
          }
        })
      });
      return;
    }

    if (args[0].length > 2) {
      message.reply({
        content: t("setprefix.wrongLenght", {
          locale: language,
          replacements: { denyEmoji: e.deny }
        })
      });
      return;
    }

    const newPrefix = args[0];

    if (newPrefix === currentPrefix) {
      return message.reply(
        t("setprefix.samePrefix", {
          locale: language,
          replacements: { 
            denyEmoji: e.deny
          }
        })
      );
    }

    guildDb.prefix = newPrefix;
    guildDb.save();

    message.reply({
      content: t("setprefix.success", {
        locale: language,
        replacements: { checkEmoji: e.check, newPrefix: newPrefix }
      })
    });
  }
};