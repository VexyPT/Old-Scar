const { ComponentType } = require("discord.js");
const { t, db, e } = require("../../utils");
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

    if (!selectedRole) {
      return interaction.reply({
        content: t("tempRole.manage.roleNotFound", { locale: interaction.locale }),
        ephemeral: true
      });
    }

    const milliseconds = ms(timeInput) || (timeInput === "1y" ? 365 * 24 * 60 * 60 * 1000 : null);
    
    if (!milliseconds || milliseconds <= 0) {
      return interaction.reply({
        content: t("tempRole.invalidTime", { locale: interaction.locale, replacements: { denyEmoji: e.deny } }),
        ephemeral: true
      });
    }

    // Verificar se o usuário é premium para definir o tempo máximo permitido
    const premiumUser = userdb.premium;
    const maxDuration = premiumUser ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

    if (milliseconds > maxDuration) {
      return interaction.reply({
        content: t("tempRole.durationExceedsLimit", { locale: interaction.locale, replacements: { denyEmoji: e.deny } }),
        ephemeral: true
      });
    }

    // Atualizando a data de expiração do cargo temporário
    const newExpiresAt = new Date(Date.now() + milliseconds);
    selectedRole.expiresAt = newExpiresAt;
    await selectedRole.save();

    const guildRole = guild.roles.cache.get(selectedRole.roleID);
    const roleName = guildRole ? guildRole.name : "Cargo não encontrado";

    await interaction.update({
      content: t("tempRole.manage.edit.success", {
        locale: interaction.locale,
        replacements: {
          roleName,
          expiresAt: `<t:${Math.floor(newExpiresAt.getTime() / 1000)}:F>`,
        }
      }),
      components: [],
      embeds: [],
      ephemeral: true
    });
  }
});

module.exports = tempRoleEditModal;