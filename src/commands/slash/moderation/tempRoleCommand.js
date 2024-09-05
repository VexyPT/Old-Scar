const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType
} = require("discord.js");
const ms = require("ms");
const TempRole = require("../../../models/TempRoleSettings.js");
const { t, e, eId, db, color } = require("../../../utils");

module.exports = {
    name: "temprole",
    name_localizations: {
        "pt-BR": "cargo-temporario"
    },
    description: "Adds a temporary role to a user",
    options: [
        {
            name: "add",
            description: "Add a temporary role",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "User to assign the role",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "duration",
                    description: "Duration of the role (e.g., 5m, 3h, 1d, 1y)",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: "role",
                    description: "Role to add",
                    type: ApplicationCommandOptionType.Role,
                    required: true
                }
            ]
        },
        {
          name: "list",
          description: "Show the active temporary roles",
          type: ApplicationCommandOptionType.Subcommand
        },
        {
          name: "manage",
          description: "Manage a temprole",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "user",
              description: "select a user to manage the temprole",
              type: ApplicationCommandOptionType.User,
              required: true
            }
          ]
        }
    ],
    devOnly: false,
    async execute(interaction) {
        const { options, member, guild } = interaction;
        const userdb = await db.users.get(interaction.user);
        const language = userdb.language;

        const embedError = new EmbedBuilder({
          color: color.danger
        });

        switch (options.getSubcommand()) {
            case "add": {
                const user = options.getUser("user", true);
                const role = options.getRole("role", true);
                const time = options.getString("duration", true);
                const botMember = await guild.members.fetch(interaction.client.user.id);

                if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                  embedError.setDescription(t("permissions.meMissingManageRolesPermission", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                  embedError.setDescription(t("permissions.botMissingManageRolesPermission", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                const milliseconds = ms(time) || (time == "1y" ? parseInt(time) * 365 * 24 * 60 * 60 * 1000 : null);
                if (!milliseconds || milliseconds <= 0) {
                  embedError.setDescription(t("tempRole.invalidTime", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                const premiumUser = userdb.premium;
                const maxDuration = premiumUser ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

                if (milliseconds > maxDuration) {
                  embedError.setDescription(t("tempRole.durationExceedsLimit", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                const expiresAt = new Date(Date.now() + milliseconds);

                if (!guild.roles.cache.get(role.id).editable) {
                  embedError.setDescription(t("tempRole.notEditable", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                const memberToAssign = await guild.members.fetch(user.id);
                if (memberToAssign.roles.cache.has(role.id)) {
                  embedError.setDescription(t("tempRole.alreadyHaveTheRole", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny,
                      user
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                await memberToAssign.roles.add(role);

                const tempRole = new TempRole({
                    userID: user.id,
                    roleID: role.id,
                    guildID: guild.id,
                    expiresAt,
                    staffID: member.id
                });

                await tempRole.save();

                interaction.client.emit('tempRoleUpdate');

                const embedSuccess = new EmbedBuilder({
                  color: color.default,
                  title: t("tempRole.success.title", { locale: language }),
                  description: t("tempRole.success.description", { locale: language,
                    replacements: {
                      roleEmoji: e.brush,
                      role,
                      memberEmoji: e.member,
                      user,
                      timeEmoji: e.time,
                      expiresAt: Math.floor(expiresAt.getTime() / 1000)
                    }
                  }),
                });

                await interaction.reply({ embeds: [embedSuccess], ephemeral: true });

                break;
            }

            case "list": {
                if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    embedError.setDescription(t("permissions.meMissingManageRolesPermission", {
                      locale: language,
                      replacements: {
                        denyEmoji: e.deny
                      }
                    }));
                    return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                const roles = await TempRole.find({ guildID: guild.id });

                if (!roles.length) {
                  embedError.setDescription(t("tempRole.noActiveRoles", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                const perPage = 5;
                const totalPages = Math.ceil(roles.length / perPage);
                let currentPage = 0;

                const generatedEmbed = (page) => {
                  const start = page * perPage;
                  const end = start + perPage;

                  const roleList = roles.slice(start, end).map(role => {
                    return t("tempRole.list", {
                      locale: language,
                      replacements: {
                        roleUserID: role.userID,
                        roleID: role.roleID,
                        expiresAt: Math.floor(role.expiresAt.getTime() / 1000)
                      }
                    });
                  }).join("\n");

                  return new EmbedBuilder({
                    color: color.default,
                    title: t("tempRole.listed.title", { locale: language }),
                    description: roleList || t("tempRole.listed.descriptionNotRole", { locale: language }),
                    footer: {
                      text: t("tempRole.listed.footer", {
                        locale: language,
                        replacements: { currentPage: page + 1, totalPages }
                      })
                    }
                  });
                }  

                const buttons = new ActionRowBuilder().addComponents(
                  new ButtonBuilder({
                    customId: "tempRole_previous",
                    emoji: eId.leftArrow,
                    style: ButtonStyle.Secondary,
                    disabled: currentPage === 0
                  }),
                  new ButtonBuilder({
                    customId: "tempRole_next",
                    emoji: eId.rightArrow,
                    style: ButtonStyle.Secondary,
                    disabled: currentPage === totalPages -1
                  }),
                );

                const message = await interaction.reply({
                  embeds: [generatedEmbed(currentPage)],
                  components: [buttons],
                  fetchReply: true,
                  ephemeral: true
                });

                const collector = message.createMessageComponentCollector({ time: 120000 });

                collector.on("collect", async i => {
                  
                  if (i.customId === "previous" && currentPage > 0) {
                    currentPage--;
                  } else if (i.customId === "next" && currentPage < totalPages -1) {
                    currentPage++;
                  }

                  await i.update({
                    embeds: [generatedEmbed(currentPage)],
                    components: [
                      new ActionRowBuilder().addComponents(
                        new ButtonBuilder({
                          customId: "tempRole_previous",
                          emoji: eId.leftArrow,
                          style: ButtonStyle.Secondary,
                          disabled: currentPage === 0
                        }),
                        new ButtonBuilder({
                          customId: "tempRole_next",
                          emoji: eId.rightArrow,
                          style: ButtonStyle.Secondary,
                          disabled: currentPage === totalPages -1
                        }),
                      )
                    ]
                  });
                });

                collector.on('end', () => {
                  message.edit({ components: [] });
                });

                break;
            }

            case "manage": {
              const user = options.getUser("user", true);
            
              if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                embedError.setDescription(t("permissions.meMissingManageRolesPermission", {
                  locale: language,
                  replacements: {
                    denyEmoji: e.deny
                  }
                }));
                return interaction.reply({ embeds: [embedError], ephemeral: true });
              }
            
              const tempRoles = await TempRole.find({ guildID: guild.id, userID: user.id });
            
              if (!tempRoles.length) {
                embedError.setDescription(t("tempRole.noRolesForUser", {
                  locale: language,
                  replacements: {
                    denyEmoji: e.deny,
                    user
                  }
                }));
                return interaction.reply({ embeds: [embedError], ephemeral: true });
              }
            
              const selectMenu = new StringSelectMenuBuilder({
                customId: "tempRole_manage_select",
                placeholder: t("tempRole.manage.manageSelect.placeholder", { locale: language }),
                options: tempRoles.map(role => {
                  const guildRole = guild.roles.cache.get(role.roleID);
                  const roleName = guildRole ? guildRole.name : "Cargo não encontrado";
            
                  return {
                    label: roleName,
                    value: role.id
                  };
                })
              });
            
              const actionRow = new ActionRowBuilder().addComponents(selectMenu);
            
              const embed = new EmbedBuilder({
                color: color.default,
                title: t("tempRole.manage.title", { locale: language }),
                description: t("tempRole.manage.description", {
                  locale: language,
                  replacements: { user }
                })
              });
            
              await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                ephemeral: true
              });
            
              const collector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 120000
              });
            
              collector.on('collect', async i => {
            
                const selectedRoleId = i.values[0];
                const selectedRole = tempRoles.find(role => role.id === selectedRoleId);
            
                if (!selectedRole) {
                  return i.reply({ content: t("tempRole.manage.invalidRole", { locale: language }), ephemeral: true });
                }
            
                const actionButtons = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId(`tempRole_manage_remove_${selectedRole.id}`)
                    .setLabel(t("tempRole.manage.manageRemove.label", { locale: language }))
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setCustomId(`tempRole_manage_edit_${selectedRole.id}`)
                    .setLabel(t("tempRole.manage.manageEdit.label", { locale: language }))
                    .setStyle(ButtonStyle.Primary)
                );
            
                const roleEmbed = new EmbedBuilder({
                  color: color.default,
                  title: t("tempRole.manage.manageSelected.title", { locale: language }),
                  description: t("tempRole.manage.manageSelected.description", {
                    locale: language,
                    replacements: {
                      roleID: selectedRole.roleID,
                      expiresAt: Math.floor(selectedRole.expiresAt.getTime() / 1000)
                    }
                  })
                });
            
                await i.update({
                  embeds: [roleEmbed],
                  components: [actionButtons]
                });
            
                const buttonCollector = i.channel.createMessageComponentCollector({
                  componentType: ComponentType.Button,
                  time: 120000
                });
            
                buttonCollector.on('collect', async buttonInteraction => {
                  const customId = buttonInteraction.customId;
            
                  if (customId.startsWith("tempRole_manage_remove_")) {
                    const selectedRoleId = customId.split("_").pop();
                    await TempRole.findByIdAndDelete(selectedRoleId);
            
                    const memberToRemoveRole = await guild.members.fetch(user.id);
                    const roleToRemove = guild.roles.cache.get(tempRoles.find(role => role.id === selectedRoleId)?.roleID);
            
                    if (roleToRemove) {
                      try {
                        await memberToRemoveRole.roles.remove(roleToRemove);
                      } catch {
                        const embedError = new EmbedBuilder({
                          color: color.danger,
                          description: t("tempRole.manage.invalidRole", {
                            locale: language,
                            replacements: {
                              denyEmoji: e.deny
                            }
                          }),
                        });
                
                        await buttonInteraction.update({
                          embeds: [embedError],
                          components: []
                        });
                      }
                    }
            
                    const embedSuccess = new EmbedBuilder({
                      color: color.success,
                      description: t("tempRole.manage.removedSuccess.description", {
                        locale: language,
                        replacements: {
                          checkEmoji: e.check,
                          roleToRemove,
                          user
                        }
                      }),
                    });
            
                    await buttonInteraction.update({
                      embeds: [embedSuccess],
                      components: []
                    });
                  } else if (customId.startsWith("tempRole_manage_edit_")) {
                    const selectedRoleId = customId.split("_").pop();
                    const modal = new ModalBuilder()
                      .setCustomId(`tempRole_manage_edit_modal_${selectedRoleId}`)
                      .setTitle(t("tempRole.manage.manageEdit.modalTitle", { locale: language }));
            
                    const timeInput = new TextInputBuilder()
                      .setCustomId("tempRole_manage_edit_time")
                      .setLabel(t("tempRole.manage.manageEdit.modalTimeLabel", { locale: language }))
                      .setStyle(TextInputStyle.Short)
                      .setPlaceholder("e.g., 5m, 3h, 1d, 1y")
                      .setRequired(true);
            
                    const timeInputRow = new ActionRowBuilder().addComponents(timeInput);
            
                    modal.addComponents(timeInputRow);
            
                    try {
                      await buttonInteraction.showModal(modal);
                    } catch (error) {
                      console.error("Error showing modal:", error);
                      await buttonInteraction.reply({ content: "Ocorreu um erro ao abrir o modal.", ephemeral: true });
                    }
                  }
                });
            
                buttonCollector.on('end', () => {
                  i.editReply({ components: [] });
                });
              });
            
              collector.on('end', () => {
                interaction.editReply({ components: [] });
              });

              interaction.client.on("interactionCreate", async modalInteraction => {
                if (!modalInteraction.isModalSubmit()) return;
            
                const customId = modalInteraction.customId;
            
                if (customId.startsWith("tempRole_manage_edit_modal_")) {
                  const selectedRoleId = customId.split("_").pop();
                  const newTime = modalInteraction.fields.getTextInputValue("tempRole_manage_edit_time");
                
                  const milliseconds = ms(newTime) || (time == "1y" ? parseInt(time) * 365 * 24 * 60 * 60 * 1000 : null);
                  if (!milliseconds || milliseconds <= 0) {
                    embedError.setDescription(t("tempRole.invalidTime", {
                      locale: language,
                      replacements: {
                        denyEmoji: e.deny
                      }
                    }));
                    return interaction.reply({ embeds: [embedError], ephemeral: true });
                  }

                  const premiumUser = userdb.premium;
                  const maxDuration = premiumUser ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

                  if (milliseconds > maxDuration) {
                    embedError.setDescription(t("tempRole.durationExceedsLimit", {
                      locale: language,
                      replacements: {
                        denyEmoji: e.deny
                      }
                    }));
                    return interaction.reply({ embeds: [embedError], ephemeral: true });
                  }
            
                  const tempRole = await TempRole.findById(selectedRoleId);
            
                  if (!tempRole) {
                    return modalInteraction.reply({ content: "Cargo temporário não encontrado.", ephemeral: true });
                  }
            
                  const expiresAt = new Date(Date.now() + milliseconds);
                  tempRole.expiresAt = expiresAt;
                  await tempRole.save();
                  interaction.client.emit('tempRoleUpdate');
            
                  await modalInteraction.reply({
                    content: `Cargo temporário atualizado para expirar em <t:${Math.floor(expiresAt.getTime() / 1000)}:F>.`,
                    ephemeral: true
                  });
                }
              });

              break;
            }
            
        }
    }
};