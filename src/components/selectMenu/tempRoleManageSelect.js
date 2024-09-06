const { ComponentType, ButtonStyle, EmbedBuilder } = require("discord.js");
const { t, color, db, e, eId } = require("../../utils");
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

    const guildRole = guild.roles.cache.get(selectedRole.roleID);

    const embed = {
      color: color.default,
      title: t("tempRole.manage.details.title", { locale: language }),
      description: t("tempRole.manage.details.description", {
        locale: language,
        replacements: {
          brushEmoji: e.brush,
          role: guildRole,
          gearEmoji: e.gear,
          staffID: selectedRole.staffID,
          timeEmoji: e.time,
          expiresAt: Math.floor(selectedRole.expiresAt.getTime() / 1000)
        }
      })
    };

    const removeButton = {
      type: ComponentType.Button,
      customId: `tempRole_manage_remove_${selectedRole.id}`,
      label: t("tempRole.manage.remove.label", { locale: language }),
      emoji: eId.whiteTrash,
      style: ButtonStyle.Danger
    };

    const editButton = {
      type: ComponentType.Button,
      customId: `tempRole_manage_edit_${selectedRole.id}`,
      label: t("tempRole.manage.edit.buttonLabel", { locale: language }),
      emoji: eId.editPencil,
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