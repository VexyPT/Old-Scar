const MemberCount = require("../../models/MemberCountSettings");

module.exports = {
  name: "guildMemberAdd",
  customName: "memberCountAdd",
  async execute(member) {
    const guildID = member.guild.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Define o início do dia
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    try {
      // Atualiza ou cria um documento para o dia de hoje
      await MemberCount.findOneAndUpdate(
        { guildID, date: today },
        { $inc: { joins: 1 } }, // Incrementa o contador de entradas
        { upsert: true, new: true }
      );

      // Atualiza a data do intervalo antes de buscar
      const endDate = new Date(); // A data atual sem alterar 'today'

      // Obtém os registros dos últimos 7 dias
      const stats = await MemberCount.find({
        guildID,
        date: { $gte: sevenDaysAgo, $lt: endDate }
      });

      // Calcular somatórios
      let totalJoins = 0;
      let totalLeaves = 0;

      stats.forEach(day => {
        totalJoins += day.joins;
        totalLeaves += day.leaves;
      });

      console.log(`Total joins in the last 7 days: ${totalJoins}`);
      console.log(`Total leaves in the last 7 days: ${totalLeaves}`);

    } catch (error) {
      console.error(`Error updating member counts for guild ${guildID}:`, error);
    }
  }
};