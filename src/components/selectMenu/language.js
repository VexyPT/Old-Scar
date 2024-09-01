const { ComponentType } = require("discord.js");
const { t, db, e } = require("../../utils/index.js");
const Component = require("../../utils/component.js"); 

const languageSelect = new Component({
    customId: "selectLanguage",
    componentType: ComponentType.StringSelect,
    async run(interaction) {
        const { user } = interaction;
        const selectedLanguage = interaction.values[0];
        const userdb = await db.users.get(user);

        if (userdb.language !== selectedLanguage) {
            
            (userdb).language = selectedLanguage;
            await userdb.save();

            await interaction.update({
                content: t("setlanguage.success", { locale: userdb.language, replacements: { checkEmoji: e.check } }),
                embeds: [],
                components: []
            });
        } else {
            await interaction.reply({
                content: t("setlanguage.sameLanguage", { locale: userdb.language, replacements: { denyEmoji: e.deny } }),
                ephemeral: true
            });
        }
    }
});

module.exports = languageSelect;