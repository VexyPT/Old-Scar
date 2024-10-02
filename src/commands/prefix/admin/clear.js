const { PermissionFlagsBits } = require("discord.js");
const { t, db, e } = require("../../../utils");

module.exports = {
  name: "clear",
  description: "Delete a specified number of recent messages from the channel",
  usage: "{currentPrefix}clear <amount>",
  aliases: ["purge"],
  devOnly: false,
  async execute(message, args) {
    const { member, channel, guild, author, client } = message;

    const language = (await db.users.get(author)).language;
    const botMember = await guild.members.fetch(client.user.id);

    // Verificar permissões do membro
    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({
        content: t("clearCommand.noPermission", {
          locale: language,
          replacements: { denyEmoji: e.deny }
        })
      });
    }

    // Verificar permissões do bot
    if (!botMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({
        content: t("clearCommand.botNoPermission", {
          locale: language,
          replacements: { denyEmoji: e.deny }
        })
      });
    }

    const amount = parseInt(args[0], 10);

    // Verificar se a quantidade está no limite permitido (2 a 1000)
    if (isNaN(amount) || amount < 2 || amount > 1000) {
      return message.reply({
        content: t("clearCommand.invalidAmount", {
          locale: language,
          replacements: { denyEmoji: e.deny, user: author.tag }
        })
      });
    }

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
        try {
          const deleted = await channel.bulkDelete(filtered, true);
          deletedMessages += deleted.size;
        } catch (error) {
          console.error("(IGNORAR) Erro ao deletar mensagens:", error);
        }
      }
    }

    // Adicionar 1 à quantidade para incluir a mensagem do comando
    const totalAmount = amount + 1;

    // Se a quantidade for maior que 100, entrar no loop
    if (totalAmount > 100) {
      let remaining = totalAmount;
      while (remaining > 0) {
        const deleteNow = remaining > 100 ? 100 : remaining;
        await deleteMessages(deleteNow);
        remaining -= deleteNow;

        // Se não restar mais mensagens, parar o loop
        if (deletedMessages === 0) break;
      }
    } else {
      // Se a quantidade for menor ou igual a 100, apagar de uma vez
      await deleteMessages(totalAmount);
    }

    // Subtrair 1 das mensagens deletadas para não contar a mensagem do comando
    deletedMessages = Math.max(0, deletedMessages - 1);

    // Mensagem de feedback
    let responseMessage;
    if (deletedMessages === 0) {
      responseMessage = t("clearCommand.noMessagesDeleted", { locale: language, replacements: { denyEmoji: e.deny } });
    } else if (deletedMessages < amount) {
      responseMessage = t("clearCommand.someMessagesDeleted", { locale: language, replacements: { checkEmoji: e.check, denyEmoji: e.deny, deletedMessages, ignoredMessages, user: author.tag } });
    } else {
      responseMessage = t("clearCommand.allMessagesDeleted", { locale: language, replacements: { checkEmoji: e.check, deletedMessages, user: author.tag } });
    }

    channel.send({ content: responseMessage });
  }
};