const { EmbedBuilder, ActionRowBuilder, ComponentType,
    StringSelectMenuBuilder, ButtonBuilder,
    ButtonStyle, ApplicationCommandType,
    ApplicationCommandOptionType,
    formatEmoji } = require("discord.js");
const { e, eId, db, t, color } = require("../../../utils");
const MemberCount = require("../../../models/MemberCountSettings.js");

module.exports = {
    name: "server",
    description: "Get information about the server",
    description_localizations: {
      "pt-BR": "Obtenha informações sobre o servidor",
    },
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "badges",
            description: "Get the server badges",
            description_localizations: {
              "pt-BR": "Obtenha as badges do servidor",
            },
            type: ApplicationCommandOptionType.Subcommand
        },
        {
          name: "statistics",
          name_localizations: {
            "pt-BR": "estatísticas"
          },
          description: "Shows server statistics",
          description_localizations: {
            "pt-BR": "Mostra estatísticas do servidor."
          },
          type: ApplicationCommandOptionType.Subcommand
        }
    ],
    async execute(interaction) {
        const { options, guild, client, user } = interaction;
        const language = (await db.users.get(user)).language;

        if (!guild) {
            return interaction.reply({
                content: t("permissions.guildOnly", {
                    locale: language,
                    replacements: {
                        denyEmoji: e.deny
                    }
                }),
                ephemeral: true
            });
        }

        switch (options.getSubcommand()) {
            case "badges": {
                const emojis = {
                    "Staff": eId.discordStaff,
                    "PremiumEarlySupporter": eId.earlySupporter,
                    "Hypesquad": eId.hypeSquadEvents,
                    "BugHunterLevel1": eId.bugHunter1,
                    "HypeSquadOnlineHouse1": eId.bravery,
                    "HypeSquadOnlineHouse2": eId.brilliance,
                    "HypeSquadOnlineHouse3": eId.balance,
                    "Partner": eId.partner,
                    "ActiveDeveloper": eId.activeDeveloper,
                    "BugHunterLevel2": eId.bugHunter2,
                    "CertifiedModerator": eId.moderatorAluri,
                    "VerifiedDeveloper": eId.earlyVerifiedDev,
                };

                const badgeColors = {
                    "Staff": "Blurple",
                    "Partner": "Blurple",
                    "CertifiedModerator": "Orange",
                    "Hypesquad": "Gold",
                    "HypeSquadOnlineHouse1": "Purple",
                    "HypeSquadOnlineHouse2": "#f17a65",
                    "HypeSquadOnlineHouse3": "#42d0b9",
                    "BugHunterLevel1": "Green",
                    "BugHunterLevel2": "Gold",
                    "ActiveDeveloper": "#2da864",
                    "VerifiedDeveloper": "Blurple",
                    "PremiumEarlySupporter": "Blurple"
                };

                const badgeNames = {
                    "Staff": t("badges.staff", { locale: language }),
                    "Partner": t("badges.partner", { locale: language }),
                    "CertifiedModerator": t("badges.certifiedModerator", { locale: language }),
                    "Hypesquad": t("badges.hypesquadEvents", { locale: language }),
                    "HypeSquadOnlineHouse1": t("badges.bravery", { locale: language }),
                    "HypeSquadOnlineHouse2": t("badges.brilliance", { locale: language }),
                    "HypeSquadOnlineHouse3": t("badges.balance", { locale: language }),
                    "BugHunterLevel1": t("badges.bugHunter1", { locale: language }),
                    "BugHunterLevel2": t("badges.bugHunter2", { locale: language }),
                    "ActiveDeveloper": t("badges.activeDeveloper", { locale: language }),
                    "VerifiedDeveloper": t("badges.earlyVerifiedDev", { locale: language }),
                    "PremiumEarlySupporter": t("badges.earlySupporter", { locale: language }),
                };

                const members = await guild.members.fetch();
                const counts = {};
                const membersWithBadges = [];

                members.forEach(member => {
                    const userFlags = member.user.flags?.toArray() || [];
                    if (userFlags.length > 0) {
                        userFlags.forEach(flag => {
                            counts[flag] = (counts[flag] || 0) + 1;
                        });
                        membersWithBadges.push(member);
                    }
                });

                const embedDescription = Object.entries(emojis).map(([badge, emojiId]) => {
                    return `${formatEmoji(emojiId || "")} ${badgeNames[badge]}: \`${counts[badge] || 0}\``;
                }).join("\n") || `${t("serverBadges.noBadgesFound", { locale: language })}`;

                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${t("serverBadges.embedTitle", { locale: language, replacements: { guildName: guild.name } })}`, iconURL: client.user?.displayAvatarURL() || "" })
                    .setColor(color.default)
                    .setThumbnail(guild.iconURL() || "")
                    .setDescription(embedDescription);

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("badges")
                        .setPlaceholder("Badges")
                        .addOptions(Object.entries(emojis).map(([badge, emojiId]) => ({
                            label: `${badgeNames[badge]} (${counts[badge] || 0})`,
                            emoji: emojiId || "",
                            value: badge
                        })))
                );

                const msg = await interaction.reply({ embeds: [embed], components: [row] });

                const collector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, customId: "badges", time: 8 * 60 * 1000 });

                collector.on("collect", async (i) => {
                    const selectedBadge = i.values[0];
                    await i.deferUpdate();

                    const membersList = membersWithBadges.filter(member => {
                        return member.user.flags?.has(selectedBadge);
                    }).map(member => `<@${member.user.id}> - \`${member.user.username} | (${member.user.id})\` `);

                    const itemsPerPage = 10;
                    let currentPage = 0;
                    const totalPages = Math.ceil(membersList.length / itemsPerPage);

                    const getEmbed = async (page) => {
                        const start = page * itemsPerPage;
                        const end = start + itemsPerPage;
                        const pageMembers = membersList.slice(start, end).map(member => `> ${member}`).join("\n") || t("serverBadges.noMembersFound", { locale: language });
                        return new EmbedBuilder()
                            .setTitle(`${formatEmoji(emojis[selectedBadge])} ${badgeNames[selectedBadge]} (${counts[selectedBadge] || 0})`)
                            .setDescription(pageMembers)
                            .setColor(badgeColors[selectedBadge] || color.default)
                            .setFooter({
                                text: t("serverBadges.pages", {
                                    locale: language,
                                    replacements: {
                                        currentPage: page + 1,
                                        totalPages: totalPages
                                    }
                                })
                            });
                    };

                    const buttons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("ServerBadges_prev")
                            .setEmoji(eId.leftArrow)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId("ServerBadges_next")
                            .setEmoji(eId.rightArrow)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === totalPages - 1)
                    );

                    const embedResponse = await getEmbed(currentPage);
                    const message = await i.followUp({ embeds: [embedResponse], components: [buttons], ephemeral: true });

                    const buttonCollector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

                    buttonCollector.on("collect", async (buttonInteraction) => {
                        if (buttonInteraction.customId === "ServerBadges_prev" && currentPage > 0) {
                            currentPage--;
                        } else if (buttonInteraction.customId === "ServerBadges_next" && currentPage < totalPages - 1) {
                            currentPage++;
                        }

                        const newEmbedResponse = await getEmbed(currentPage);
                        const newButtons = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("ServerBadges_prev")
                                .setEmoji(eId.leftArrow)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId("ServerBadges_next")
                                .setEmoji(eId.rightArrow)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPage === totalPages - 1)
                        );

                        await buttonInteraction.update({ embeds: [newEmbedResponse], components: [newButtons] });
                    });
                });

                collector.on("end", async () => {
                    if (msg.editable) {
                        await msg.edit({ components: [] });
                    }
                });

                break;
            }

            case "statistics": {
              const { guild, user } = interaction;
              const guildID = guild.id;
              const language = (await db.users.get(user)).language;
              const guildSettings = await db.guilds.get(guild);

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const startDate = new Date(today);
              const endDate = new Date(today);

              await interaction.deferReply({ ephemeral: true });

              try {
                  const todayStats = await db.memberCounts.get(guildID, startDate, endDate);

                  const embed = new EmbedBuilder({
                      color: color.default,
                      title: "Estatísticas do Servidor",
                      description: `### Nas últimas 24 horas\n-# **Entradas:** \`${todayStats.totalJoins}\`\n-# **Saídas:** \`${todayStats.totalLeaves}\`\n-# **Diferença:** \`${todayStats.totalJoins - todayStats.totalLeaves}\``
                  });

                  const buttons = new ActionRowBuilder().addComponents(
                      new ButtonBuilder({
                          customId: "todayStats",
                          label: "Hoje",
                          style: ButtonStyle.Secondary,
                          disabled: true
                      }),
                      new ButtonBuilder({
                          customId: "7daysStats",
                          label: "Últimos 7 dias",
                          style: ButtonStyle.Secondary
                      }),
                      new ButtonBuilder({
                          customId: "30daysStats",
                          label: "Últimos 30 dias",
                          emoji: guildSettings.premium ? eId.blueStars : eId.premium,
                          style: guildSettings.premium ? ButtonStyle.Secondary : ButtonStyle.Primary,
                          disabled: !guildSettings.premium
                      }),
                      new ButtonBuilder({
                          customId: "yearStats",
                          label: "Último ano",
                          emoji: guildSettings.premium ? eId.blueStars : eId.premium,
                          style: guildSettings.premium ? ButtonStyle.Secondary : ButtonStyle.Primary,
                          disabled: !guildSettings.premium
                      })
                  );

                  const message = await interaction.editReply({
                      embeds: [embed],
                      components: [buttons]
                  });

                  // Collector para responder aos botões
                  const filter = (i) => i.user.id === user.id; // Apenas o usuário que executou o comando pode interagir
                  const collector = message.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

                  collector.on('collect', async (i) => {
                    let startDate, endDate;
                
                    switch (i.customId) {
                        case 'todayStats':
                            startDate = new Date();
                            endDate = new Date();
                            startDate.setHours(0, 0, 0, 0);
                            endDate.setHours(23, 59, 59, 999);
                            break;
                        case '7daysStats':
                            endDate = new Date();
                            startDate = new Date();
                            startDate.setDate(startDate.getDate() - 7);
                            startDate.setHours(0, 0, 0, 0);
                            break;
                        case '30daysStats':
                            endDate = new Date();
                            startDate = new Date();
                            startDate.setDate(startDate.getDate() - 30);
                            startDate.setHours(0, 0, 0, 0);
                            break;
                        case 'yearStats':
                            endDate = new Date();
                            startDate = new Date();
                            startDate.setFullYear(startDate.getFullYear() - 1);
                            startDate.setHours(0, 0, 0, 0);
                            break;
                        default:
                            return;
                    }
                
                    try {
                        // Realiza a consulta ao banco de dados e calcula os totais
                        const memberCounts = await MemberCount.find({
                            guildID: interaction.guild.id,
                            date: { $gte: startDate, $lte: endDate }
                        });
                
                        const totalJoins = memberCounts.reduce((sum, count) => sum + count.joins, 0);
                        const totalLeaves = memberCounts.reduce((sum, count) => sum + count.leaves, 0);
                
                        const description = `### Nas últimas 24 horas\n-# **Entradas:** \`${totalJoins}\`\n-# **Saídas:** \`${totalLeaves}\`\n-# **Diferença:** \`${totalJoins - totalLeaves}\``;
                
                        const updatedEmbed = new EmbedBuilder()
                            .setTitle('Estatísticas do Servidor')
                            .setDescription(description || 'Nenhum dado disponível para o período selecionado.');
                
                        // Atualiza os botões, desativando o que foi selecionado
                        const updatedButtons = new ActionRowBuilder().addComponents(
                            new ButtonBuilder({
                                customId: "todayStats",
                                label: "Hoje",
                                style: ButtonStyle.Secondary,
                                disabled: i.customId === "todayStats"
                            }),
                            new ButtonBuilder({
                                customId: "7daysStats",
                                label: "Últimos 7 dias",
                                style: ButtonStyle.Secondary,
                                disabled: i.customId === "7daysStats"
                            }),
                            new ButtonBuilder({
                                customId: "30daysStats",
                                label: "Últimos 30 dias",
                                emoji: guildSettings.premium ? eId.blueStars : eId.premium,
                                style: guildSettings.premium ? ButtonStyle.Secondary : ButtonStyle.Primary,
                                disabled: !guildSettings.premium || i.customId === "30daysStats"
                            }),
                            new ButtonBuilder({
                                customId: "yearStats",
                                label: "Último ano",
                                emoji: guildSettings.premium ? eId.blueStars : eId.premium,
                                style: guildSettings.premium ? ButtonStyle.Secondary : ButtonStyle.Primary,
                                disabled: !guildSettings.premium || i.customId === "yearStats"
                            })
                        );
                
                        // Atualiza a resposta com os novos dados
                        await i.update({
                            embeds: [updatedEmbed],
                            components: [updatedButtons],
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Erro ao buscar estatísticas:', error);
                        await i.editReply({ content: 'Houve um erro ao buscar as estatísticas.', ephemeral: true });
                    }
                });

                  collector.on('end', collected => {
                      // Quando o coletor expira, desabilitamos os botões
                      const disabledButtons = new ActionRowBuilder().addComponents(
                          buttons.components.map(button => button.setDisabled(true))
                      );

                      interaction.editReply({ 
                          components: [disabledButtons]
                      });
                  });

              } catch (error) {
                  console.error(`Erro ao buscar contagem de membros para o servidor ${guildID}:`, error);
                  await interaction.editReply({
                      content: "Houve um erro ao buscar as estatísticas do servidor.",
                      ephemeral: true
                  });
              }

              break;
            }
        }
    }
}
