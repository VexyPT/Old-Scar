const { EmbedBuilder } = require("discord.js");
const { db } = require("../../utils");

module.exports = {
    name: "guildCreate",
    async execute(guild, client) {

        try {
            const logEmbed = new EmbedBuilder()
            .setThumbnail(`${guild.iconURL({ dynamic: true })}`)
            .setTitle("New Guild")
            .setDescription(`<t:${Math.floor(Date.now() / 1000)}:D> (<t:${Math.floor(Date.now() / 1000)}:T>)\n\n> **Name:** \`${guild.name}\`\n> **ID:** \`${guild.id}\`\n> **Owner:** <@${guild.ownerId}> \`${guild.ownerId}\`\n> **Member Count:** \`${guild.memberCount}\``)
            .setFooter({ text: `${client.guilds.cache.size} servers` })
            .setColor(`${client.settings.colors.success}`);

            await guild.client.channels.fetch(`${client.settings.channels.guildCreate}`)
            .then(
                (x) => x.send({ embeds: [logEmbed] })
            );
            
            // Temporarimente desabilitado
            /*const welcomeChannel = guild.channels.cache.find(
                (channel) => channel.type
                 === 
                 ChannelType.GuildText 
                 && 
                 guild.channel.permissionsFor(client.user)
                 .has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])
            );

            if(welcomeChannel){
                const embedNewServer = new EmbedBuilder()
                .setColor(`${client.settings.colors.success}`)
                .setDescription("Olá! Eu sou o Stawni, obrigado por me adicionar ao servidor!");

                await welcomeChannel.send({
                    embeds: [embedNewServer]
                });
            }*/
            

        } catch(error) {
            console.log("Failed to create guild", error);
        }

        try {
            await db.guilds.get(guild);
        } catch (error) {
            console.error("Erro ao criar configurações padrão para o servidor:", error.message);
        }

    }
}