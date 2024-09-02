const { t, e, db } = require("../utils");

module.exports = {
    name: "messageCreate",
    async execute(message) {
        const { client, content, author, guild } = message;

        if (author.bot) return;
        if(guild) {
            if (content == `<@${client.user.id}>`) {
                message.channel.send({
                    content: t("mention", {
                     locale: (await db.users.get(author)).language,
                     replacements: {
                         scarEmoji: e.scar,
                         user: author,
                         serverPrefix: (await db.guilds.get(guild)).prefix || "s!",
                     }
                    })
                });
            }
        }
    }
};