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

    // Verifica se a duração é válida
    if (!milliseconds || milliseconds <= 0) {
      embedError.setDescription(t("tempRole.invalidTime", { locale: language, replacements: { denyEmoji: e.deny } }));
      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    // Verifica se a duração é menor que 5 minutos
    const minimumDuration = 5 * 60 * 1000; // 5 minutos em milissegundos
    if (milliseconds < minimumDuration) {
      embedError.setDescription(t("tempRole.minimumTimeRequirement", { locale: language, replacements: { denyEmoji: e.deny } }));
      return interaction.reply({
        embeds: [embedError],
        ephemeral: true
      });
    }

    const premiumGuild = guildDB.premium;
    const maxDuration = premiumGuild ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

    // Verifica se a duração excede o limite máximo
    if (milliseconds > maxDuration) {
      embedError.setDescription(t("tempRole.durationExceedsLimit", { locale: language, replacements: { denyEmoji: e.deny } }));
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

    await interaction.followUp({
      embeds: [embedError], // irónico
      components: [],
      ephemeral: true
    });
  }
});

module.exports = tempRoleEditModal;