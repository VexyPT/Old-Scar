const { ActivityType } = require("discord.js");

module.exports = {
    name: "ready",
    once: true,
    execute(client) {
      console.log(`Logged in as ${client.user.tag}`);

      client.user.setActivity("EM BETA", {
        type: ActivityType.Playing,
      });

    }
};