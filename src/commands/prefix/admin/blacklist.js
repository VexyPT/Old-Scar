const { db, e, t } = require("../../../utils");

module.exports = {
  name: "blacklist",
  description: "dev only",
  devOnly: true,
  async execute(message, args) {
    const { guild, client } = message;
    const guildPrefix = (await db.guilds.get(guild)).prefix;

    if (!args || args.length < 1) {
      return message.reply({
        content: `${e.deny} Comando inválido\nUse \`${guildPrefix}blacklist add <user> <motivo>\` ou \`${guildPrefix}blacklist remove <user>\``
      });
    }

    const subcommand = args[0];
    const target = message.mentions.users.first();

    if (!subcommand || !target) {
      return message.reply({
        content: `${e.deny} Comando inválido\nUse \`${guildPrefix}blacklist add <user> <motivo>\` ou \`${guildPrefix}blacklist remove <user>\``
      });
    }

    const userData = await db.users.get(target);
    switch (subcommand) {
      case "add": {
        let reason = args.slice(2).join(" "); // Mudei const para let para poder redefinir abaixo
        if (!reason) reason = "Não informado";

        if (userData && userData.blacklist.isBanned) {
          return message.reply({ content: `${target} já está na blacklist.` });
        }

        userData.blacklist.isBanned = true;
        userData.blacklist.since = new Date();
        userData.blacklist.reason = reason;
        await userData.save();

        try {
          target.send({
            content: t("permissions.blacklistedMessage", {
              locale: userData.language,
              replacements: {
                supportServer: client.settings.links.supportServer,
                reason: userData.blacklist.reason,
                banDate: Math.floor(userData.blacklist.since.getTime() / 1000)
              }
            })
          })
        } catch (error) {
          console.log(error);
        }

        message.reply({
          content: `${target} foi adicionado à blacklist por: ${reason}`
        });

        break;
      }

      case "remove": {
        if (!userData || !userData.blacklist.isBanned) {
          return message.reply(`${target} não está na blacklist.`);
        }

        userData.blacklist.isBanned = false;
        userData.blacklist.since = null;
        userData.blacklist.reason = null;
        await userData.save();

        try {
          target.send({
            content: t("permissions.unblacklisted", {
              locale: userData.language,
              replacements: {
                scarEmoji: e.scar
              }
            })
          })
        } catch (error) {
          console.log(error);
        }

        message.reply(`${target} foi removido da blacklist.`);

        break;
      }

      default: 
        return message.reply({
          content: `${e.deny} Subcomando inválido! Use \`${guildPrefix}blacklist add\` ou \`${guildPrefix}blacklist remove\`.`
        });
    }
  }
}