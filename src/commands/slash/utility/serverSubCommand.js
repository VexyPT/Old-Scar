const { EmbedBuilder, ActionRowBuilder, ComponentType,
    StringSelectMenuBuilder, ButtonBuilder,
    ButtonStyle, ApplicationCommandType,
    ApplicationCommandOptionType,
    formatEmoji } = require("discord.js");
const { e, eId, db, t, color } = require("../../../utils");

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
        }
    ],
    devOnly: false,
    premium: false,
    async execute(interaction) {
        const { options, guild, client, user } = interaction;
        const language = (await db.users.get(user)).language;

        if (!guild) {
            return interaction.reply({
                content: t("permissions.permissions.permissions.permissions.permissions.permissions.permissions.permissions.guildOnly", {
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
        }
    }
}
