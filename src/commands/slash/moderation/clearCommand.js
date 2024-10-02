const { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clear",
  description: "Clear some messages",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "amount",
      name_localizations: {
        "pt-BR": "quantidade"
      },
      description: "The amount of messages to clear (1-1000)",
      description_localizations: {
        "pt-BR": "Quantidade de mensagens a limpar (entre 1 e 1000)"
      },
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
      maxValue: 1000,
      required: true
    }
  ],
  async execute(interaction) {
    const { options, channel, guild, user, client } = interaction;
    const member = await guild.members.fetch(user.id);
    const botMember = await guild.members.fetch(client.user.id);

    // Verificar permissões do membro
    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: "Você não tem permissão para gerenciar mensagens.", ephemeral: true });
    }
    // Verificar permissões do bot
    if (!botMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: "Eu não tenho permissão para gerenciar mensagens.", ephemeral: true });
    }

    const amount = options.getInteger("amount", true);

    // Verificar se a quantidade está no limite permitido (1 a 1000)
    if (amount < 1 || amount > 1000) {
      return interaction.reply({ content: 'Você deve escolher entre 1 e 1000 mensagens.', ephemeral: true });
    }

    let deletedMessages = 0;

    await interaction.deferReply({ ephemeral: true });

    // Apaga mensagens por blocos de 100 em 100 (Devido a limitações da API do discord)
    async function deleteMessages(limit) {
      const messages = await channel.messages.fetch({ limit });
      if (messages.size === 0) return;
      const now = Date.now();
      const filtered = messages.filter(
        msg => msg.createdTimestamp > now - 14 * 24 * 60 * 60 * 1000 // Mensagens com menos de 14 dias
      );

      if (filtered.size > 0) {
        await channel.bulkDelete(filtered, true);
        deletedMessages += filtered.size;
      }
    }

    // Apagar em lotes até 100 mensagens por vez
    let remaining = amount;
    while (remaining > 0) {
      const deleteNow = remaining > 100 ? 100 : remaining;
      await deleteMessages(deleteNow);
      remaining -= deleteNow;

      // Se não restar mais mensagens, parar o loop
      if (deletedMessages === 0) break;
    }

    // Mensagem de feedback
    let responseMessage;
    if (deletedMessages === 0) {
      responseMessage = `🔷 | ${user} Não consegui apagar nenhuma mensagem devido às limitações do Discord.`;
    } else if (deletedMessages < amount) {
      responseMessage = `🎉 | ${user} O chat teve **${deletedMessages}** mensagens deletadas por ${user}!\n🔷 | ${user} Algumas mensagens não puderam ser apagadas devido às limitações do Discord.`;
    } else {
      responseMessage = `🎉 | ${user} O chat teve **${deletedMessages}** mensagens deletadas por ${user}!`;
    }

    await interaction.editReply({ content: responseMessage });
  }
};