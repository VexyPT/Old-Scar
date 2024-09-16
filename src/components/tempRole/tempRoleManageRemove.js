const { ComponentType, EmbedBuilder } = require("discord.js");
const { t, db, color, e } = require("../../utils/index.js");
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
    if (!guildRole) {
      embedError.setDescription(t("tempRole.roleNotFound", {
        locale: language,
        replacements: {
          denyEmoji: e.deny
        }
      }));

      return interaction.reply({ embeds: [embedError], ephemeral: true });
    }

    try {
      const member = await guild.members.fetch(selectedRole.userID);
      if (!member) {
        embedError.setDescription(t("tempRole.noMemberFounded", {
          locale: language,
          replacements: {
            denyEmoji: e.deny
          }
        }));
  
        return interaction.reply({ embeds: [embedError], ephemeral: true });
      }

      // Verifica se o cargo está realmente atribuído ao membro
      if (member.roles.cache.has(guildRole.id)) {
        await member.roles.remove(guildRole);
        await TempRole.findByIdAndDelete(selectedRoleId);
        embedError.setColor(color.success);
        embedError.setDescription(t("tempRole.manage.removedSuccess.description", {
          locale: language,
          replacements: {
            checkEmoji: e.check,
            roleName: guildRole.name,
            role: guildRole,
            user: member.user
          }
        }));

        await interaction.update({
          embeds: [embedError], //irónico
          components: []
        });

      } else {
        
        const embedFirst = new EmbedBuilder({
          color: color.warning,
          description: t("tempRole.memberDoNotHaveTheRole", {
            locale: language,
            replacements: {
              user: member,
              denyEmoji: e.deny
            }
          })
        });

        await interaction.reply({ embeds: [embedFirst], ephemeral: true });

        const embedRemoving = new EmbedBuilder({
          color: color.info,
          description: t("tempRole.removingFromDatabase", {
            locale: language,
            replacements: {
              loadingEmoji: e.loading
            }
          })
        });

        await interaction.editReply({ embeds: [embedRemoving] });

        await TempRole.findByIdAndDelete(selectedRoleId);

        const embedSuccess = new EmbedBuilder({
          color: color.success,
          description: t("tempRole.removedFromDatabase", {
            locale: language,
            replacements: {
              checkEmoji: e.check
            }
          })
        });

        return interaction.editReply({ embeds: [embedSuccess] });
      }
    } catch (error) {
      embedError.setDescription(t("tempRole.manage.remove.fail", {
        locale: language,
        replacements: {
          user: member,
          denyEmoji: e.deny
        }
      }));

      return interaction.reply({ embeds: [embedError], components: [], ephemeral: true });
    }
  }
});

module.exports = tempRoleManageRemove;