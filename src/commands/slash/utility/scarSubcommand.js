const { ApplicationCommandType, ApplicationCommandOptionType,
  EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder } = require("discord.js");
const { color, db, t } = require("../../../utils");

module.exports = {
  name: "scar",
  description: "See info about Scar",
  description_localizations: {
    "pt-BR": "Veja informações sobre o Scar",
  },
  integration_types: [0, 1], // 0: Guild - 1: User 
  contexts: [0, 1, 2], // 0: Guild - 1: DM - 2: Private Channel 
  type: ApplicationCommandType.ChatInput,
  devOnly: false,
  premium: false,
  options: [
    {
      name: "language",
      name_localizations: {
        "pt-BR": "idioma"
      },
      description: "Change the Scar language",
      description_localizations: {
        "pt-BR": "Altere o idioma do Scar",
      },
      type: ApplicationCommandOptionType.Subcommand,
    }
  ],
  async execute(interaction) {

    const { options, user } = interaction;
    const language = (await db.users.get(user)).language;

    switch (options.getSubcommand()) {
      case "language": {

        const embed = new EmbedBuilder()
        .setColor(color.default)
        .addFields([
          { name: "🇵🇹 Português - Portugal", value: "`vexydevpt`", inline: true },
          { name: "🇧🇷 Português - Brasil", value: "`vexydevpt`", inline: true },
          { name: "🇺🇲 English", value: "`vexydevpt`", inline: true },
        ])
        .setDescription(t("setlanguage.embedDescription", { locale: language }));
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder({
            placeholder: t("setlanguage.placeholder", { locale: language }),
            customId: "selectLanguage",
            options: [
              {
                label: "Português - Portugal",
                emoji: "🇵🇹",
                value: "pt-PT"
              },
              {
                label: "Português - Brasil",
                emoji: "🇧🇷",
                value: "pt-BR"
              },
              {
                label: "English",
                emoji: "🇺🇲",
                value: "en-US"
              },
            ]
          })
        );

        await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
        });


        break;
      }
    }

  }
};