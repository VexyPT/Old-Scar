const { ComponentType } = require("discord.js");
const { t, db, e, color } = require("../../utils");
const TempRole = require("../../models/TempRoleSettings.js");
const Component = require("../../utils/component.js");
const ms = require("ms");

const tempRoleEditModal = new Component({
  customId: /tempRole_edit_modal_\w+/,
  componentType: ComponentType.ModalSubmit,
  async run(interaction) {
    const { user, guild } = interaction;
    const selectedRoleId = interaction.customId.split('_').pop();
    const timeInput = interaction.fields.getTextInputValue("timeInput");
    const selectedRole = await TempRole.findById(selectedRoleId);
    const userdb = await db.users.get(user);
    const guildDB = await db.users.get(guild);
    const language = userdb.language;

    const embedError = new EmbedBuilder({
      color: color.danger
    });

    if (!selectedRole) {

      embedError.setDescription(t("tempRole.manage.roleNotFound", { locale: language, replacements: { denyEmoji: e.deny } }))

      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    const milliseconds = ms(timeInput) || (timeInput === "1y" ? 365 * 24 * 60 * 60 * 1000 : null);
    
    if (!milliseconds || milliseconds <= 0) {

      embedError.setDescription(t("tempRole.invalidTime", { locale: language, replacements: { denyEmoji: e.deny } }))

      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    const premiumGuild = guildDB.premium;
    const maxDuration = premiumGuild ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

    if (milliseconds > maxDuration) {

      embedError.setDescription(t("tempRole.durationExceedsLimit", { locale: language, replacements: { denyEmoji: e.deny } }))

      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    // Atualizando a data de expiração do cargo temporário
    const newExpiresAt = new Date(Date.now() + milliseconds);
    selectedRole.expiresAt = newExpiresAt;
    await selectedRole.save();

    const guildRole = guild.roles.cache.get(selectedRole.roleID);

    embedError.setColor(color.success);
    embedError.setDescription(t("tempRole.manage.editSuccess.description", {
      locale: language,
      replacements: {
        checkEmoji: e.check,
        role: guildRole,
        newExpiresAt: Math.floor(newExpiresAt.getTime() / 1000)
      }
    }));
    embedError.setTitle(t("tempRole.manage.editSuccess.description", { locale: language}));

    await interaction.update({
      embeds: [embedError], // irónico
      components: [],
      ephemeral: true
    });
  }
});

module.exports = tempRoleEditModal;