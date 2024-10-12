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

    const addedEmojis = [];
    let failedCount = 0;
    let failureReasons = [];

    for (const emojiString of emojiMatches) {
      const parsed = parseEmoji(emojiString);
      const link = `https://cdn.discordapp.com/emojis/${parsed.id}${parsed.animated ? '.gif' : '.png'}`;

      // Verificar limites antes de adicionar
      if (parsed.animated && animatedEmojis >= maxAnimatedEmojis) {
        failedCount++;
        failureReasons.push(t("emoji.add.animatedLimitReached", { locale: language, replacements: { maxAnimatedEmojis } }));
        continue; // Pular para o próximo emoji
      } else if (!parsed.animated && staticEmojis >= maxEmojis) {
        failedCount++;
        failureReasons.push(t("emoji.add.staticLimitReached", { locale: language, replacements: { maxEmojis } }));
        continue; // Pular para o próximo emoji
      }

      try {
        const emoji = await guild.emojis.create({ attachment: link, name: parsed.name });
        addedEmojis.push(emoji);
      } catch (error) {
        failedCount++;
        failureReasons.push(t("emoji.add.errorAdding", { locale: language, replacements: { emojiName: parsed.name } }));
      }
    }

    // Mensagem de resposta
    let responseMessage = "";
    if (addedEmojis.length > 0) {
      const addedEmojiNames = addedEmojis.map(emoji => `${emoji}`).join(" ");
      responseMessage += t("emoji.add.successMultiple", {
        locale: language,
        replacements: {
          checkEmoji: e.check,
          addedEmojiNames
        }
      });
    }

    if (failedCount > 0) {
      const reasonsSummary = failureReasons.join(", ");
      responseMessage += `\n${t("emoji.add.failedCount", {
        locale: language,
        replacements: {
          denyEmoji: e.deny,
          failedCount,
          postEmoji: e.post,
          reasons: reasonsSummary
        }
      })}`;
    }

    await interaction.editReply({
      content: responseMessage
    });
  }
};