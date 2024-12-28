const { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } = require("discord.js");
const { t, db, e } = require("../../../utils");

module.exports = {
  name: "clear",
  description: "Delete a specified number of recent messages from the channel",
  description_localizations: {
    "pt-BR": "Apaga um número especificado de mensagens recentes do canal"
  },
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "amount",
      name_localizations: {
        "pt-BR": "quantidade",
      },
      description: "The amount of messages to clear (2-1000)",
      description_localizations: {
        "pt-BR": "Quantidade de mensagens a limpar (entre 2 e 1000)",
      },
      type: ApplicationCommandOptionType.Integer,
      minValue: 2,
      maxValue: 1000,
      required: true
    }
  ],
  async execute(interaction) {
    const { options, channel, guild, user, client } = interaction;
    const member = await guild.members.fetch(user.id);
    const botMember = await guild.members.fetch(client.user.id);
    const userdb = await db.users.get(user);
    const language = userdb.language;

    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: t("clearCommand.noPermission", {
          locale: language,
          replacements: {
            denyEmoji: e.deny
          }
        }),
        ephemeral: true
      });
    }
    
    if (!botMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: t("clearCommand.botNoPermission", {
          locale: language,
          replacements: {
            denyEmoji: e.deny
          }
        }),
        ephemeral: true
      });
    }

    const amount = options.getInteger("amount", true);

    // Verificar se a quantidade está no limite permitido (2 a 1000)
    if (amount < 2 || amount > 1000) {
      return interaction.reply({
        content: t("clearCommand.invalidAmount", {
          locale: language,
          replacements: {
            denyEmoji: e.deny
          }
        }),
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let deletedMessages = 0;
    let ignoredMessages = 0;

    // Apaga mensagens por blocos de 100 em 100 (Devido a limitações da API do discord)
    async function deleteMessages(limit) {
      const messages = await channel.messages.fetch({ limit });
      if (messages.size === 0) return;
      const now = Date.now();
      const filtered = messages.filter(
        msg => msg.createdTimestamp > now - 14 * 24 * 60 * 60 * 1000 // Mensagens com menos de 14 dias
      );

      ignoredMessages += messages.size - filtered.size;

      if (filtered.size > 0) {
        const deleted = await channel.bulkDelete(filtered, true);
        deletedMessages += deleted.size;
      }
    }

    // Se a quantidade for maior que 100, entrar no loop
    if (amount > 100) {
      let remaining = amount;
      while (remaining > 0) {
        const deleteNow = remaining > 100 ? 100 : remaining;
        await deleteMessages(deleteNow);
        remaining -= deleteNow;

        // Se não restar mais mensagens, parar o loop
        if (deletedMessages === 0) break;
      }
    } else {
      // Se a quantidade for menor ou igual a 100, apagar de uma vez
      await deleteMessages(amount);
    }

    // Mensagem de feedback
    let responseMessage;
    if (deletedMessages === 0) {
      responseMessage = t("clearCommand.noMessagesDeleted", { locale: language, replacements: { denyEmoji: e.deny } });
    } else if (deletedMessages < amount && ignoredMessages != 0) {
      responseMessage = t("clearCommand.someMessagesDeleted", { locale: language, replacements: { checkEmoji: e.check, denyEmoji: e.deny, deletedMessages, ignoredMessages, user } });
    } else {
      responseMessage = t("clearCommand.allMessagesDeleted", { locale: language, replacements: { checkEmoji: e.check, deletedMessages, user } });
    }

    await interaction.editReply({ content: responseMessage });
  }
};
