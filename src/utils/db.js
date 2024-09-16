const TempRole = require('../models/TempRoleSettings');
const GuildSettings = require('../models/GuildSettings.js');
const UserSettings = require('../models/UserSettings.js');
const MemberCount = require('../models/MemberCountSettings.js');

const db = {
  users: {
    async get(user) {
      if (!user || !user.id) {
        throw new Error('Objeto de usuário inválido');
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
        throw new Error('Objeto de usuário inválido');
      }

      const result = await UserSettings.deleteOne({ userID: user.id });
      return result.deletedCount > 0;
    },
  },

  guilds: {
    async get(guild) {
      if (!guild || !guild.id) {
        throw new Error('Objeto de servidor inválido');
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
        throw new Error('Objeto de servidor inválido');
      }

      // Excluir dados relacionados ao guildID de várias coleções
      await Promise.all([
        GuildSettings.deleteOne({ guildID: guild.id }),
        TempRole.deleteMany({ guildID: guild.id }),
        MemberCount.deleteMany({ guildID: guild.id }),
        // Adicione outras coleções conforme necessário
      ]);

      return true; // Retorna true se a exclusão for bem-sucedida
    },
  },

  memberCounts: {
    async get(guildID, startDate, endDate) {
      if (!guildID || !startDate || !endDate) {
        throw new Error('Parâmetros inválidos');
      }

      // Agregação para somar entradas e saídas
      const memberCounts = await MemberCount.aggregate([
        { $match: { guildID, date: { $gte: startDate, $lte: endDate } } },
        { $group: {
            _id: null,
            totalJoins: { $sum: '$joins' },
            totalLeaves: { $sum: '$leaves' }
          }
        }
      ]);

      return memberCounts[0] || { totalJoins: 0, totalLeaves: 0 };
    },

    async upsert(guildID, date, joins, leaves) {
      if (!guildID || !date) {
        throw new Error('Dados inválidos para atualizar ou criar o registro de contagem de membros');
      }

      await MemberCount.findOneAndUpdate(
        { guildID, date },
        { $inc: { joins, leaves } },
        { upsert: true, new: true }
      );
    },
  },
};

module.exports = { db };

/*
 * Exemplos de uso:

// Para obter as configurações de um usuário:
const userSettings = await db.users.get(user);
console.log(userSettings);

// Para deletar um usuário:
const isDeleted = await db.users.delete(user);
console.log(`Usuário deletado: ${isDeleted}`);

// Para obter as configurações de um servidor:
const guildSettings = await db.guilds.get(guild);
console.log(guildSettings);

// Para deletar um servidor e todos os dados associados:
const isDeleted = await db.guilds.delete(guild);
console.log(`Servidor deletado: ${isDeleted}`);

// Para obter um cargo temporário de um usuário em um servidor:
const tempRole = await db.tempRoles.get(userID, guildID);
console.log(tempRole);

// Para deletar um cargo temporário de um usuário em um servidor:
const isDeleted = await db.tempRoles.delete(userID, guildID);
console.log(`Cargo temporário deletado: ${isDeleted}`);

// Para criar um novo cargo temporário:
const newTempRole = await db.tempRoles.create({
  userID: 'user123',
  roleID: 'role123',
  guildID: 'guild123',
  expiresAt: new Date(Date.now() + 3600000), // 1 hora de expiração
  staffID: 'staff123',
  reason: 'Motivo do cargo temporário'
});
console.log(newTempRole);

// Para obter a contagem de membros de um servidor em um período:
const memberCounts = await db.memberCounts.get('guild123', new Date('2024-09-01'), new Date('2024-09-30'));
console.log(memberCounts);

// Para criar um novo registro de contagem de membros:
const newMemberCount = await db.memberCounts.create({
  guildID: 'guild123',
  date: new Date(),
  joins: 10,
  leaves: 2
});
console.log(newMemberCount);

// Para deletar registros de contagem de membros de um servidor em um período:
const isDeleted = await db.memberCounts.delete('guild123', new Date('2024-09-01'), new Date('2024-09-30'));
console.log(`Registros deletados: ${isDeleted}`);
*/
