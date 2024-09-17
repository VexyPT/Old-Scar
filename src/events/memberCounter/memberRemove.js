const MemberCount = require("../../models/MemberCountSettings");

module.exports = {
  name: "guildMemberRemove",
  customName: "memberCountRemove",
  async execute (member) {

    const guildID = member.guild.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      await MemberCount.findOneAndUpdate(
        { guildID, date: today },
        { $inc: { leaves: 1 } },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error(`Erro ao atualizar contagem de membros que saíram no servidor ${guildID}:`, error);
    }
  }
}