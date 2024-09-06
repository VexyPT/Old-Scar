const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
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
    description_localizations: {
        "pt-BR": "Adiciona um cargo temporário a um usuário"
    },
    options: [
        {
            name: "add",
            name_localizations: {
              "pt-BR": "adicionar"
            },
            description: "Add a temporary role",
            description_localizations: {
              "pt-BR": "Adiciona um cargo temporario"
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "User to assign the role",
                    description_localizations: {
                      "pt-BR": "Usuário para setar o cargo temporário"
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                  name: "role",
                  name_localizations: {
                    "pt-BR": "cargo"
                  },
                  description: "Role to add",
                  description_localizations: {
                    "pt-BR": "Cargo para adicionar"
                  },
                  type: ApplicationCommandOptionType.Role,
                  required: true
                },
                {
                  name: "duration",
                  name_localizations: {
                    "pt-BR": "tempo"
                  },
                  description: "Duration of the role (e.g., 5m, 3h, 1d, 1y)",
                  description_localizations: {
                    "pt-BR": "Em quanto tempo o cargo irá expirar (ex., 5m, 3h, 1d, 1y)"
                  },
                  type: ApplicationCommandOptionType.String,
                  required: true
                },
                {
                  name: "reason",
                  name_localizations: {
                    "pt-BR": "motivo"
                  },
                  description: "The reason to add this temprole",
                  description_localizations: {
                    "pt-BR": "Motivo de adicionar este cargo temporário"
                  },
                  type: ApplicationCommandOptionType.String,
                  required: false
                },
            ]
        },
        {
          name: "list",
          name_localizations: {
            "pt-BR": "listar"
          },
          description: "Show the active temporary roles",
          description_localizations: {
            "pt-BR": "Lista todos os cargos temporários do servidor"
          },
          type: ApplicationCommandOptionType.Subcommand
        },
        {
          name: "manage",
          name_localizations: {
            "pt-BR": "gerenciar"
          },
          description: "Manage a temprole",
          description_localizations: {
            "pt-BR": "Gerencia um cargo temporário de um membro"
          },
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "user",
              description: "select a user to manage the temprole",
              description_localizations: {
                "pt-BR": "Selecione um usuário para gerenciar"
              },
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
        const guildDB = await db.guilds.get(guild);
        const language = userdb.language;

        const embedError = new EmbedBuilder({
          color: color.danger
        });

        switch (options.getSubcommand()) {
            case "add": {
                const user = options.getUser("user", true);
                const role = options.getRole("role", true);
                const time = options.getString("duration", true);
                const reason = options.getString("reason", false) || t("tempRole.reason", { locale: language });

                if (reason.length > 50) {
                  embedError.setDescription(t("tempRole.reasonTooLong", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }
                
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

                const milliseconds = ms(time) || (time === "1y" ? parseInt(time) * 365 * 24 * 60 * 60 * 1000 : null);

                // Verifica se o tempo é menor que 5 minutos
                if (!milliseconds || milliseconds < 300000) {
                  embedError.setDescription(t("tempRole.minimumTimeRequirement", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                const premiumGuild = guildDB.premium;
                const maxDuration = premiumGuild ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

                // Verifica se o tempo excede o limite máximo
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

                const existingTempRole = await TempRole.findOne({ guildID: guild.id, userID: user.id, roleID: role.id });
                
                if (existingTempRole) {
                  embedError.setDescription(t("tempRole.alreadyTempRoleAssigned", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny,
                      role,
                      user
                    }
                  }));
                  return interaction.reply({ embeds: [embedError], ephemeral: true });
                }

                const userTempRolesCount = await TempRole.countDocuments({ guildID: guild.id, userID: user.id });
                const maxTempRoles = premiumGuild ? 15 : 3;

                if (userTempRolesCount >= maxTempRoles) {
                  embedError.setDescription(premiumGuild ? t("tempRole.maxTempRolesReachedPremium", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny
                    }
                  }) : t("tempRole.maxTempRolesReachedRegular", {
                    locale: language,
                    replacements: {
                      denyEmoji: e.deny,
                      hintEmoji: e.hint
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
                    staffID: member.id,
                    reason,
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
                      postEmoji: e.post,
                      reason,
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
                placeholder: t("tempRole.manage.select.placeholder", { locale: language }),
                options: tempRoles.map(role => {
                  const guildRole = guild.roles.cache.get(role.roleID);
                  const roleName = guildRole ? guildRole.name : t("tempRole.manage.select.noRole", { locale: language });

                  return {
                    label: roleName,
                    value: role.id
                  }
                })
              });

              const row = new ActionRowBuilder().addComponents(selectMenu);
              
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
                components: [row],
                ephemeral: true
              });
              
              break;
            }
            
        }
    }
};