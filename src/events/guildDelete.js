const { EmbedBuilder } = require("discord.js");
const { db } = require("../utils");

module.exports = {
    name: "guildDelete",
    async execute(guild, client) {

        try {
            const logEmbed = new EmbedBuilder()
            .setThumbnail(`${guild.iconURL({ dynamic: true })}`)
            .setTitle("Removed from a Guild")
            .setDescription(`<t:${Math.floor(Date.now() / 1000)}:D> (<t:${Math.floor(Date.now() / 1000)}:T>)\n\n> **Name:** \`${guild.name}\`\n> **ID:** \`${guild.id}\`\n> **Owner:** \`${guild.ownerId}\`\n> **Member Count:** \`${guild.memberCount}\``)
            .setFooter({text: `${client.guilds.cache.size} servers` })
            .setColor(`${client.settings.colors.danger}`);

            await guild.client.channels.fetch(`${client.settings.channels.guildDelete}`)
            .then(
                (x) => x.send({ embeds: [logEmbed] })
            );

        } catch(error) {
            console.log("Failed to delete guild", error);
        }

        try {
            await db.guilds.delete(guild); 
        } catch (error) {
            console.error("Erro ao criar configurações padrão para o servidor:", error.message);
        }
    }
}