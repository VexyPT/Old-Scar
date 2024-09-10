const { ActionRowBuilder, RoleSelectMenuBuilder } = require("discord.js")

module.exports = {
  name: "roles",
  devOnly: true,
  async execute(message) {

    const roleSelectMenu = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder({
        customId: "tempRole",
        placeholder: "Teste",
        maxValues: 1
      })
    );

    await message.reply({
      components: [roleSelectMenu]
    });

  }
}