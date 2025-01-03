const fs = require("fs");
const { db, t, e, color } = require("../utils");
const { ApplicationCommandType, Routes, EmbedBuilder } = require("discord.js");
const path = require('path');

module.exports = (client) => {

const loadPrefixCommands = (dir) => {
  const prefixCommandFiles = fs.readdirSync(dir);

  for (const file of prefixCommandFiles) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory()) {
      loadPrefixCommands(filePath);
    } else if (file.endsWith(".js")) {
      const command = require(filePath);
      client.commands.set(command.name, command);
      console.log(`Prefix command loaded: ${command.name}`);
    }
  }
};

const loadSlashCommands = (dir) => {
  const slashCommandFiles = fs.readdirSync(dir);

  for (const file of slashCommandFiles) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory()) {
      loadSlashCommands(filePath);
    } else if (file.endsWith(".js")) {
      const command = require(filePath);
      client.slashCommands.set(command.name, command);
      console.log(`Slash command loaded: ${command.name}`);
    }
  }
};

loadPrefixCommands(path.join(__dirname, '../commands/prefix'));
loadSlashCommands(path.join(__dirname, '../commands/slash'));


  client.once("ready", async () => {
    try {
        const allCommands = client.slashCommands.map(command => ({
            name: command.name,
            description: command.description,
            type: command.type || ApplicationCommandType.ChatInput,
            options: command.options || [],
            integration_types: command.integration_types || [0],
            contexts: command.contexts || [0]
        }));

        await client.rest.put(
            Routes.applicationCommands(client.user.id), 
            { body: allCommands }
        );
        console.log("Slash commands registered."); 
    } catch (error) {
        console.error("Failed to register commands:", error);
    }
  });

  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot) return;

    let guildSettings;
    try {
      guildSettings = await db.guilds.get(message.guild);
    } catch (error) {
      console.error("Erro ao obter as configurações do servidor:", error.message);
      return;
    }

    let userSettings;
    try {
      userSettings = await db.users.get(message.author);
    } catch (error) {
      console.error("Erro ao obter as configurações do user:", error.message);
      return;
    }

    const prefix = guildSettings ? guildSettings.prefix : process.env.PREFIX;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;
    if (command.devOnly && !client.settings.devs.includes(message.author.id)) return;
    if (command.premium) {
      return await message.reply({
        content: t("permissions.premiumOnly", {
          locale: userSettings.language,
          replacements: {
            denyEmoji: e.deny
          }
        })
      });
    }

    if(userSettings.blacklist.isBanned) {
      return await message.reply({
        content: t("permissions.blacklisted", {
          locale: userSettings.language,
          replacements: {
            supportServer: client.settings.links.supportServer,
            reason: userSettings.blacklist.reason,
            banDate: `<t:${Math.floor(userSettings.blacklist.since.getTime() / 1000)}:R>`
          }
        })
      });
    }

    try {
      await command.execute(message, args);
      const userdb = await db.users.get(message.author);
      userdb.executedCommands++;
      userdb.save();

      await sendPrefixCommandLog(message, commandName, args);
    } catch (error) {
      console.error(error);
    }
  });

  client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;

      try {
        const userdb = await db.users.get(interaction.user);
        if (command.devOnly && !client.settings.devs.includes(interaction.user.id)) {
          return await interaction.reply({
            content: t("permissions.devOnly", {
              locale: userdb.language,
              replacements: {
                denyEmoji: e.deny
              }
            }),
            ephemeral: true
          });
        }

        if (command.devOnly && !client.settings.devs.includes(interaction.user.id)) {
          return await interaction.reply({
            content: t("permissions.devOnly", {
              locale: userdb.language,
              replacements: {
                denyEmoji: e.deny
              }
            }),
            ephemeral: true
          });
        }

        if(userdb.blacklist.isBanned) {
          return await interaction.reply({
            content: t("permissions.blacklisted", {
              locale: userdb.language,
              replacements: {
                supportServer: client.settings.links.supportServer,
                reason: userdb.blacklist.reason,
                banDate: `<t:${Math.floor(userdb.blacklist.since.getTime() / 1000)}:R>`
              }
            }),
            ephemeral: false
          });
        }

        await command.execute(interaction);
        userdb.executedCommands++;
        userdb.save();

        await sendSlashCommandLog(interaction);
      } catch (error) {
        console.error(`Error executing command interaction "${interaction.commandName}":`, error);
      }
    } else if (interaction.isAutocomplete()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Error handling autocomplete interaction "${interaction.commandName}":`, error);
      }
    }
  });

  const loadEvents = (dir) => {
    const eventFiles = fs.readdirSync(dir);

    for (const file of eventFiles) {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);

        if (stat.isDirectory()) {
            loadEvents(filePath);
        } else if (file.endsWith('.js')) {
            const event = require(filePath);
            const eventName = event.customName ? event.customName : event.name;

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
                console.log(`Event loaded (once): ${eventName}`);
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
                console.log(`Event loaded: ${eventName}`);
            }
        }
    }
  };

  loadEvents(path.join(__dirname, "../events"));

  async function sendSlashCommandLog(interaction) {
    const logChannel = client.channels.cache.get(client.settings.channels.commands);

    if (!logChannel) {
      console.error("Log channel not found");
      return;
    }

    const commandType = interaction.commandType === ApplicationCommandType.ChatInput ? "ChatInput" : interaction.commandType === ApplicationCommandType.Message ? "Message" : "User";
    const subcommand = interaction.options.getSubcommand(false);

    const embed = new EmbedBuilder()
      .setColor(color.default)
      .setTitle("Comando SLASH executado")
      .addFields(
        { name: "Command", value: `\`${interaction.commandName}\``, inline: true },
        { name: "Subcommand", value: `\`${subcommand}\`` || "`None`", inline: true },
        { name: "Type", value: `\`${commandType}\``, inline: true },
        { name: "User", value: `\`${interaction.user.username}\` (\`${interaction.user.id}\`)`, inline: false }
      )
      .setTimestamp();

    if (interaction.guild) {
      embed.addFields({ name: "Server", value: `\`${interaction.guild.name}\` (\`${interaction.guild.id}\`)`, inline: false });
    }

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to send command log:", error);
    }
  }

  async function sendPrefixCommandLog(message, commandName, args) {
    const logChannel = client.channels.cache.get(client.settings.channels.commands);

    if (!logChannel) {
      console.error("Log channel not found");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(color.default)
      .setTitle("Comando PREFIX executado")
      .addFields(
        { name: "Command", value: `\`${commandName}\``, inline: true },
        { name: "Arguments", value: args.join(" ") || "None", inline: true },
        { name: "User", value: `\`${message.author.username}\` (\`${message.author.id}\`)`, inline: true },
        { name: "Server", value: `\`${message.guild.name}\` (\`${message.guild.id}\`)`, inline: true }
      )
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to send prefix command log:", error);
    }
  }
};