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
    description: "Adds a temporary role to a user",
    descriptionLocalizations: [
      {
        "pt-BR": "Adiciona um cargo temporário"
      }
    ],
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
                  name: "role",
                  nameLocalizations: [
                    {
                      "pt-BR": "cargo"
                    }
                  ],
                  description: "Role to add",
                  type: ApplicationCommandOptionType.Role,
                  required: true
                },
                {
                    name: "duration",
                    description: "Duration of the role (e.g., 5m, 3h, 1d, 1y)",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
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

                const premiumGuild = guildDB.premium;
                const maxDuration = premiumGuild ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

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
                    emoji: e.gear,
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