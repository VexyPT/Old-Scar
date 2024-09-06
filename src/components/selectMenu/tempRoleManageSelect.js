const { ComponentType, ButtonStyle } = require("discord.js");
const { t, color, db } = require("../../utils");
const Component = require("../../utils/component.js");
const TempRole = require("../../models/TempRoleSettings.js");

const tempRoleManageSelect = new Component({
  customId: "tempRole_manage_select",
  componentType: ComponentType.StringSelect,
  async run(interaction) {
    const selectedRoleId = interaction.values[0];
    const selectedRole = await TempRole.findById(selectedRoleId);
    const { guild, user } = interaction;
    const userdb = await db.users.get(user);
    const language = userdb.language;

    if (!selectedRole) {
      return interaction.reply({ content: "O cargo temporário selecionado não foi encontrado.", ephemeral: true });
    }

    const guildRole = guild.roles.cache.get(selectedRole.roleID);
    const roleName = guildRole ? guildRole.name : "Cargo não encontrado";

    const embed = {
      color: color.default,
      title: t("tempRole.manage.details.title", { locale: language }),
      description: t("tempRole.manage.details.description", {
        locale: language,
        replacements: {
          roleName,
          staffID: selectedRole.staffID,
          expiresAt: `<t:${Math.floor(selectedRole.expiresAt.getTime() / 1000)}:F>`
        }
      })
    };

    const removeButton = {
      type: ComponentType.Button,
      customId: `tempRole_manage_remove_${selectedRole.id}`,
      label: t("tempRole.manage.remove.label", { locale: language }),
      style: ButtonStyle.Danger
    };

    const editButton = {
      type: ComponentType.Button,
      customId: `tempRole_manage_edit_${selectedRole.id}`,
      label: t("tempRole.manage.edit.label", { locale: language }),
      style: ButtonStyle.Primary
    };

    await interaction.update({
      embeds: [embed],
      components: [{ type: ComponentType.ActionRow, components: [removeButton, editButton] }],
      ephemeral: true
    });
  }
});

module.exports = tempRoleManageSelect;