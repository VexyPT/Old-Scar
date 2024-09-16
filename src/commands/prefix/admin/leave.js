module.exports = {
  name: "leave",
  description: "idk",
  devOnly: true,
  async execute(message)  {

    const { client } = message;

    client.emit("guildMemberRemove", message.member);
    message.react("✅");

  }
}