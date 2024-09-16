const MemberCount = require("../../../models/MemberCountSettings");

module.exports = {
  name: "join",
  description: "idk",
  devOnly: true,
  async execute(message)  {

    const guildID = message.guild.id;
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    try {
      // Encontra ou cria um documento para a data específica
      const result = await MemberCount.findOneAndUpdate(
        { guildID, date: thirtyDaysAgo },
        { $inc: { joins: 1 } }, // Incrementa o número de joins
        { upsert: true, new: true } // Cria o documento se não existir
      );

      message.reply(`Join simulado adicionado com sucesso para a data ${thirtyDaysAgo.toDateString()}. Total de joins agora: ${result.joins}`);
    } catch (error) {
      console.error('Erro ao adicionar join:', error);
      message.reply('Houve um erro ao adicionar o join.');
    }

  }
}