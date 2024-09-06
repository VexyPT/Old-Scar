const { ComponentType } = require("discord.js");
const { t } = require("../../utils");
const TempRole = require("../../models/TempRoleSettings.js");
const Component = require("../../utils/component.js");

const tempRoleManageRemove = new Component({
  customId: /tempRole_manage_remove_\w+/,
  componentType: ComponentType.Button,
  async run(interaction) {
    const selectedRoleId = interaction.customId.split('_').pop();
    const selectedRole = await TempRole.findById(selectedRoleId);
    const { guild, user } = interaction;

    if (!selectedRole) {
      return interaction.reply({ content: "Cargo temporário não encontrado.", ephemeral: true });
    }

    const guildRole = guild.roles.cache.get(selectedRole.roleID);
    try {
      const member = await guild.members.fetch(user.id);
      if (guildRole) {
        await member.roles.remove(guildRole);
      }

      await TempRole.findByIdAndDelete(selectedRoleId);

      await interaction.update({
        content: t("tempRole.manage.removedSuccess", { locale: interaction.locale, replacements: { roleName: guildRole.name, user } }),
        embeds: [],
        components: []
      });
    } catch (error) {
      await interaction.reply({
        content: t("tempRole.manage.removeFail", { locale: interaction.locale }),
        ephemeral: true
      });
    }
  }
});

module.exports = tempRoleManageRemove;
