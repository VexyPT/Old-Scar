module.exports = {
  name: "join",
  description: "idk",
  devOnly: true,
  async execute(message)  {

    const { client } = message;

    client.emit("guildMemberAdd", message.member);
    message.react("✅");

  }
}