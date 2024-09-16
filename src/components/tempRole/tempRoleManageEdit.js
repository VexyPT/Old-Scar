const { ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ActionRowBuilder } = require("discord.js");
const { t, db, color, e } = require("../../utils/index.js");
const TempRole = require("../../models/TempRoleSettings.js");
const Component = require("../../utils/component.js");

const tempRoleManageEdit = new Component({
  customId: /tempRole_manage_edit_\w+/,
  componentType: ComponentType.Button,
  async run(interaction) {
    const selectedRoleId = interaction.customId.split('_').pop();
    const selectedRole = await TempRole.findById(selectedRoleId);
    const userdb = await db.users.get(interaction.user);
    const language = userdb.language

    const embedError = new EmbedBuilder({
      color: color.danger
    });

    if (!selectedRole) {
      embedError.setDescription(t("tempRole.invalidRole", {
        locale: language,
        replacements: {
          denyEmoji: e.deny
        }
      }));

      return interaction.reply({ embeds: [embedError], ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`tempRole_edit_modal_${selectedRole.id}`)
      .setTitle(t("tempRole.manage.edit.modalTitle", { locale: language }));

    const timeInput = new TextInputBuilder()
      .setCustomId("timeInput")
      .setLabel(t("tempRole.manage.edit.modalLabel", { locale: language }))
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder(t("tempRole.manage.edit.modalPlaceHolder", { locale: language }));

    modal.addComponents(new ActionRowBuilder().addComponents(timeInput));

    await interaction.showModal(modal);
  }
});

module.exports = tempRoleManageEdit;