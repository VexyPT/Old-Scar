const TempRole = require("../models/TempRoleSettings.js");

let nextCheckTimeout;

const checkExpiredRoles = async (client) => {

    const now = new Date();
    const expiredRoles = await TempRole.find({ expiresAt: { $lt: now } });
    let removedCount = 0;

    for (const role of expiredRoles) {
        try {
            const guild = await client.guilds.fetch(role.guildID).catch(error => {
                console.error(`Error fetching guild ${role.guildID}: ${error}`);
                return null;
            });

            if (!guild) {
                await TempRole.deleteOne({ _id: role._id });
                continue;
            }

            const member = await guild.members.fetch(role.userID).catch(error => {
                console.error(`Error fetching member ${role.userID} in guild ${role.guildID}: ${error}`);
                return null;
            });

            if (!member) {
                await TempRole.deleteOne({ _id: role._id });
                continue;
            }

            await member.roles.remove(role.roleID).catch(error => {
                console.error(`Error removing role ${role.roleID} from member ${role.userID}: ${error}`);
            });

            await TempRole.deleteOne({ _id: role._id });

            removedCount++;
        } catch (error) {
            console.error(`Error processing role ${role.roleID} for member ${role.userID}: ${error}`);
        }
    }

    scheduleNextCheck(client);
};

const scheduleNextCheck = async (client) => {
    const nextRole = await TempRole.findOne().sort({ expiresAt: 1 });

    if (nextRole) {
        const now = Date.now();
        const nextCheckIn = nextRole.expiresAt.getTime() - now;

        clearTimeout(nextCheckTimeout);
        nextCheckTimeout = setTimeout(() => checkExpiredRoles(client), Math.min(nextCheckIn, 2629800000));
    } else {
        clearTimeout(nextCheckTimeout);
        nextCheckTimeout = setTimeout(() => checkExpiredRoles(client), 60000);
    }
};

module.exports = {
    checkExpiredRoles,
    scheduleNextCheck
};