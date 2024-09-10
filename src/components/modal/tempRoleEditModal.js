const { ComponentType, EmbedBuilder } = require("discord.js");
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
    const guildDB = await db.guilds.get(guild);
    const language = userdb.language;

    const embedError = new EmbedBuilder({
      color: color.danger
    });

    if (!selectedRole) {
      embedError.setDescription(t("tempRole.manage.roleNotFound", { locale: language, replacements: { denyEmoji: e.deny } }));
      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    const milliseconds = ms(timeInput) || (timeInput === "1y" ? 365 * 24 * 60 * 60 * 1000 : null);

    if (!milliseconds || milliseconds <= 0) {
      embedError.setDescription(t("tempRole.invalidTime", { locale: language, replacements: { denyEmoji: e.deny } }));
      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    const minimumDuration = 5 * 60 * 1000;
    if (milliseconds < minimumDuration) {
      embedError.setDescription(t("tempRole.minimumTimeRequirement", { locale: language, replacements: { denyEmoji: e.deny } }));
      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    const premiumGuild = guildDB.premium;
    const maxDuration = premiumGuild ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

    if (milliseconds > maxDuration) {
      embedError.setDescription(t("tempRole.durationExceedsLimit", { locale: language, replacements: { denyEmoji: e.deny } }));
      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    const newExpiresAt = new Date(Date.now() + milliseconds);
    selectedRole.expiresAt = newExpiresAt;
    await selectedRole.save();

    const guildRole = guild.roles.cache.get(selectedRole.roleID);

    const embed = new EmbedBuilder({
      color: color.default,
      title: t("tempRole.manage.details.title", { locale: language }),
      description: t("tempRole.manage.details.description", {
        locale: language,
        replacements: {
          brushEmoji: e.brush,
          role: guildRole,
          gearEmoji: e.gear,
          staffID: selectedRole.staffID,
          postEmoji: e.post,
          timeEmoji: e.time,
          expiresAt: Math.floor(newExpiresAt.getTime() / 1000) // Correção aqui
        }
      })
    });

    await interaction.update({
      embeds: [embed],
      ephemeral: true
    });

    embedError.setColor(color.success);
    embedError.setDescription(t("tempRole.manage.editSuccess.description", {
      locale: language,
      replacements: {
        checkEmoji: e.check,
        role: guildRole,
        newExpiresAt: Math.floor(newExpiresAt.getTime() / 1000) // Correção aqui
      }
    }));

    await interaction.followUp({
      embeds: [embedError],
      ephemeral: true
    });
  }
});

module.exports = tempRoleEditModal;