const { ApplicationCommandType, ApplicationCommandOptionType, parseEmoji } = require("discord.js");
const { e, t, db, checkEmojiLimits } = require("../../../utils");

module.exports = {
  name: "emoji",
  description: "emoji module",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "add",
      name_localizations: {
        "pt-BR": "adicionar"
      },
      description: "Add emoji(s) on server",
      description_localizations: {
        "pt-BR": "Adicione emoji(s) ao servidor"
      },
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "emojis",
          description: "Add one or more emojis simultaneously",
          description_localizations: {
            "pt-BR": "Adicione um ou mais emojis simultaneamente"
          },
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    }
  ],
  async execute(interaction) {
    await interaction.deferReply();

    const { options, guild, user } = interaction;
    const emojis = options.getString("emojis", true);
    const emojiRegex = /<a?:(.*?):(\d+)>/g;
    const emojiMatches = emojis.match(emojiRegex);
    const { staticEmojis, animatedEmojis, maxEmojis, maxAnimatedEmojis } = await checkEmojiLimits(guild);
    const language = (await db.users.get(user)).language;

    if (!emojiMatches) {
      return interaction.editReply({
        content: t("emoji.add.noValidEmojis", {
          locale: language,
          replacements: {
            denyEmoji: e.deny
          }
        })
      });
    }

    // Verificar limites de emojis estáticos e animados
    const staticLimitReached = staticEmojis >= maxEmojis;
    const animatedLimitReached = animatedEmojis >= maxAnimatedEmojis;

    if (staticLimitReached && animatedLimitReached) {
      return interaction.editReply({
        content: t("emoji.add.bothLimitsReached", {
          locale: language,
          replacements: {
            denyEmoji: e.deny,
            maxEmojis,
            maxAnimatedEmojis
          }
        })
      });
    } else if (staticLimitReached) {
      return interaction.editReply({
        content: t("emoji.add.staticLimitReached", {
          locale: language,
          replacements: {
            denyEmoji: e.deny,
            maxEmojis
          }
        })
      });
    } else if (animatedLimitReached) {
      return interaction.editReply({
        content: t("emoji.add.animatedLimitReached", {
          locale: language,
          replacements: {
            denyEmoji: e.deny,
            maxAnimatedEmojis
          }
        })
      });
    }

    const addedEmojis = [];

    for (const emojiString of emojiMatches) {
      const parsed = parseEmoji(emojiString);
      const link = `https://cdn.discordapp.com/emojis/${parsed.id}${parsed.animated ? '.gif' : '.png'}`;

      try {
        const emoji = await guild.emojis.create({ attachment: link, name: parsed.name });
        addedEmojis.push(emoji);
      } catch (error) {
        console.error(error);
        return interaction.editReply({
          content: t("emoji.add.errorAdding", {
            locale: language,
            replacements: {
              denyEmoji: e.deny,
              emojiName: parsed.name
            }
          })
        });
      }
    }

    if (addedEmojis.length > 1) {
      const addedEmojiNames = addedEmojis.map(emoji => `${emoji}`).join(" ");
      await interaction.editReply({
        content: t("emoji.add.successMultiple", {
          locale: language,
          replacements: {
            checkEmoji: e.check,
            addedEmojiNames
          }
        })
      });
    } else {
      await interaction.editReply({
        content: t("emoji.add.successSingle", {
          locale: language,
          replacements: {
            addedEmojis
          }
        })
      });
    }
  }
};