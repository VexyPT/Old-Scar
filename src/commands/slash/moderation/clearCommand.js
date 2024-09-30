const { ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clear",
  description: "clear some messages",
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

    // Verificar permissões do bot
    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply("Member sem perms");
    }
    // Verificar permissões do membro
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply("BOT sem perms");
    }

    const amount = options.getInteger("amount", true);

    // Verificar se a quantidade está no limite permitido (1 a 1000)
    if (amount < 1 || amount > 1000) {
      return interaction.reply({ content: 'Você deve escolher entre 1 e 1000 mensagens.', ephemeral: true });
    }
     
    let deletedMessages = 0;
    let oldMessages = 0;
    const messagesToDelesIndividually = [];

    await interaction.deferReply({ ephemeral: true });

    // Apaga mensagens por blocos de 100 em 100 (Devido a limitações da API do discord)
    async function deleteMessages(limit) {
      const messages = await channel.messages.fetch({ limit });
      if (messages.size === 0) return;
      const now = Date.now();
      const filtered = messages.filter(
        msg => msg.createdTimestamp > now - 14 * 24 * 60 * 60 * 100 // Mensagens com menos de 14 dias
      );
      const old = messages.filter(
        msg => msg.createdTimestamp <= now - 14 * 24 * 60 * 60 * 100 // Mensagens com mais de 14 dias
      );

      oldMessages += old.size; // Somar mensagens antigas que não podem ser apagadas pelo "bulkDelete"
      messagesToDelesIndividually.push(...old.values()); // Guardar para deletar uma a uma

      if (filtered.size > 0) {
        await channel.bulkDelete(filtered, true);
        deletedMessages += filtered.size;
      }
    }

    // Apagar em lotes até 100 mensagens por vez
    let remaining = amount;
    while(remaining > 0) {
      const deleteNow = remaining > 100 ? 100 : remaining;
      await deleteMessages(deleteNow);
      remaining -= deleteNow;

      // Se não restar mais mensagens, parar o loop
      const messagesInChannel = await channel.messages.fetch({ limit: 1 });
      if (messagesInChannel.size === 0) break;
    }

    // Se houver mensagens antigas, deletar individualmente (Para "Burlar" os limites da API)
    for (const msg of messagesToDelesIndividually) {
      try {
          await msg.delete();
          deletedMessages++;
      } catch (error) {
          // Ignorar todos os erros
      }
  }

    // Mensagem de feedback
    let answer = `Consegui apagar **${deletedMessages}** mensagens!`;

    await interaction.editReply({ content: answer });
  }
}