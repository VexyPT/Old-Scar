const { ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
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
        }
    ],
    devOnly: false,
    async execute(interaction) {
        const { options, member, guild } = interaction;
        const userdb = await db.users.get(interaction.user);
        const language = userdb.language;

        switch (options.getSubcommand()) {
            case "add": {
                const user = options.getUser("user");
                const role = options.getRole("role");
                const time = options.getString("duration");
                const botMember = await guild.members.fetch(interaction.client.user.id);

                if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return interaction.reply({
                        content: t("permissions.meMissingManageRolesPermission", {
                            locale: language,
                            replacements: {
                              denyEmoji: e.deny
                            }
                        }),
                        ephemeral: true
                    });
                }

                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                  return interaction.reply({
                      content: t("permissions.botMissingManageRolesPermission", {
                          locale: language,
                          replacements: {
                            denyEmoji: e.deny
                          }
                      }),
                      ephemeral: true
                  });
              }

                // Ajuste para lidar com "1y" e definir limites
                const milliseconds = ms(time) || (time == "1y" ? parseInt(time) * 365 * 24 * 60 * 60 * 1000 : null);
                if (!milliseconds || milliseconds <= 0) {
                    return interaction.reply({
                        content: t("tempRole.invalidTime", {
                            locale: language,
                            replacements: {
                              denyEmoji: e.deny
                            }
                        }),
                        ephemeral: true
                    });
                }

                const premiumUser = userdb.premium
                const maxDuration = premiumUser ? 366 * 24 * 60 * 60 * 1000 : 31 * 24 * 60 * 60 * 1000;

                if (milliseconds > maxDuration) {
                    return interaction.reply({
                        content: t("tempRole.durationExceedsLimit", {
                            locale: language,
                            replacements: {
                              denyEmoji: e.deny
                            }
                        }),
                        ephemeral: true
                    });
                }

                const expiresAt = new Date(Date.now() + milliseconds);

                // Verificar se o cargo é gerenciável
                if (!guild.roles.cache.get(role.id).editable) {
                  return interaction.reply({
                    content: t("tempRole.notEditable", {
                        locale: language,
                        replacements: {
                          denyEmoji: e.deny
                        }
                    }),
                    ephemeral: true
                  });
                }

                // Verificar se o cargo já existe no usuário
                const memberToAssign = await guild.members.fetch(user.id);
                if (memberToAssign.roles.cache.has(role.id)) {
                  return interaction.reply({
                    content: t("tempRole.alreadyHaveTheRole", {
                      locale: language,
                      replacements: {
                        denyEmoji: e.deny,
                        user
                      }
                    }),
                    ephemeral: true
                  });
                }

                await memberToAssign.roles.add(role);

                const tempRole = new TempRole({
                    userID: user.id,
                    roleID: role.id,
                    guildID: guild.id,
                    expiresAt
                });

                await tempRole.save();

                // Emitir o evento para que o sistema de verificação atualize
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

                await interaction.reply({ embeds: [embedSuccess] });

                break;
            }

            case "list": {
                const roles = await TempRole.find({ guildID: guild.id });

                if (!roles.length) {
                    return interaction.reply('No active temporary roles found.');
                }

                const list = roles.map(role => {
                    return `<@${role.userID}> - <@&${role.roleID}> expires in <t:${Math.floor(role.expiresAt.getTime() / 1000)}:R>`;
                }).join("\n");

                await interaction.reply(list);

                break;
            }
        }
    }
};