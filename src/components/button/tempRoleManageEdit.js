const { ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { t } = require("../../utils");
const TempRole = require("../../models/TempRoleSettings.js");
const Component = require("../../utils/component.js");

const tempRoleManageEdit = new Component({
  customId: /tempRole_manage_edit_\w+/,
  componentType: ComponentType.Button,
  async run(interaction) {
    const selectedRoleId = interaction.customId.split('_').pop();
    const selectedRole = await TempRole.findById(selectedRoleId);

    if (!selectedRole) {
      return interaction.reply({ content: "Cargo temporário não encontrado.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`tempRole_edit_modal_${selectedRole.id}`)
      .setTitle(t("tempRole.manage.edit.modal.title", { locale: interaction.locale }));

    const timeInput = new TextInputBuilder()
      .setCustomId("timeInput")
      .setLabel(t("tempRole.manage.edit.modal.time.label", { locale: interaction.locale }))
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder(t("tempRole.manage.edit.modal.time.placeholder", { locale: interaction.locale }));

    modal.addComponents(new ActionRowBuilder().addComponents(timeInput));

    await interaction.showModal(modal);
  }
});

module.exports = tempRoleManageEdit;