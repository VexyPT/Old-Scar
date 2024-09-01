const TempRole = require("../models/TempRoleSettings.js");

let nextCheckTimeout;

const checkExpiredRoles = async (client) => {
    //console.log("Starting temp role verification...");

    const now = new Date();
    const expiredRoles = await TempRole.find({ expiresAt: { $lt: now } });
    let removedCount = 0;

    for (const role of expiredRoles) {
        try {

            const guild = await client.guilds.fetch(role.guildID).catch(error => {
                console.error(`Error fetching guild ${role.guildID}: ${error}`);
                return null; // Retorna null se falhar
            });

            if (!guild) {
                // Caso o servidor não seja encontrado, removemos o registro
                await TempRole.deleteOne({ _id: role._id });
                continue;
            }

            // Verificar se o membro existe
            const member = await guild.members.fetch(role.userID).catch(error => {
                console.error(`Error fetching member ${role.userID} in guild ${role.guildID}: ${error}`);
                return null; // Retorna null se falhar
            });

            if (!member) {
                // Caso o membro não seja encontrado, removemos o registro
                await TempRole.deleteOne({ _id: role._id });
                continue;
            }

            // Remover o cargo
            await member.roles.remove(role.roleID).catch(error => {
                console.error(`Error removing role ${role.roleID} from member ${role.userID}: ${error}`);
            });

            // Remover o registro de TempRole
            await TempRole.deleteOne({ _id: role._id });

            removedCount++;
            //console.log(`Role removed from ${member.user.tag}`);
        } catch (error) {
            console.error(`Error processing role ${role.roleID} for member ${role.userID}: ${error}`);
        }
    }

    //console.log(`Verification completed. Roles removed: ${removedCount}`);

    scheduleNextCheck(client);
};

const scheduleNextCheck = async (client) => {
    const nextRole = await TempRole.findOne().sort({ expiresAt: 1 });

    if (nextRole) {
        const now = Date.now();
        const nextCheckIn = nextRole.expiresAt.getTime() - now;

        //console.log(`Next role expiration check in ${nextCheckIn / 1000} seconds`);

        clearTimeout(nextCheckTimeout); // Limpar qualquer verificação agendada anteriormente
        nextCheckTimeout = setTimeout(() => checkExpiredRoles(client), Math.max(nextCheckIn, 1000));
    } else {
        //console.log("No active temp roles found.");
        clearTimeout(nextCheckTimeout); // Limpar qualquer verificação agendada anteriormente
        nextCheckTimeout = setTimeout(() => checkExpiredRoles(client), 60000); // Verifique novamente em 60 segundos
    }
};

module.exports = {
    checkExpiredRoles,
    scheduleNextCheck
};