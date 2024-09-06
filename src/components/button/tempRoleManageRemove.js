const { ComponentType } = require("discord.js");
const { t, db } = require("../../utils");
const TempRole = require("../../models/TempRoleSettings.js");
const Component = require("../../utils/component.js");

const tempRoleManageRemove = new Component({
  customId: /tempRole_manage_remove_\w+/,
  componentType: ComponentType.Button,
  async run(interaction) {
    const selectedRoleId = interaction.customId.split('_').pop();
    const selectedRole = await TempRole.findById(selectedRoleId);
    const { guild } = interaction;
    const userdb = await db.users.get(interaction.user);
    const language = userdb.language;

    if (!selectedRole) {
      return interaction.reply({ content: "Cargo temporário não encontrado.", ephemeral: true });
    }

    const guildRole = guild.roles.cache.get(selectedRole.roleID);
    if (!guildRole) {
      return interaction.reply({ content: "Cargo não encontrado no servidor.", ephemeral: true });
    }

    try {
      const member = await guild.members.fetch(selectedRole.userID);
      if (!member) {
        return interaction.reply({ content: "Membro não encontrado no servidor.", ephemeral: true });
      }

      // Verifica se o cargo está realmente atribuído ao membro
      if (member.roles.cache.has(guildRole.id)) {
        await member.roles.remove(guildRole);
        await TempRole.findByIdAndDelete(selectedRoleId);
        await interaction.update({
          content: t("tempRole.manage.removedSuccess", { locale: language, replacements: { roleName: guildRole.name, user: member.user } }),
          embeds: [],
          components: []
        });
      } else {
        return interaction.reply({ content: "O membro não possui esse cargo.", ephemeral: true });
      }
    } catch (error) {
      console.error("Erro ao remover o cargo:", error);
      await interaction.reply({
        content: t("tempRole.manage.removeFail", { locale: language }),
        ephemeral: true
      });
    }
  }
});

module.exports = tempRoleManageRemove;