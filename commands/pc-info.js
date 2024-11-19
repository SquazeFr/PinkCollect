module.exports = {
    name: 'pc-info',
    description: 'Affiche vos boosters et le temps restant avant de regagner un booster.',
    async execute(interaction, users) {
        const userId = interaction.user.id;

        if (!users[userId]) {
            users[userId] = { boosters: 1, collection: {} };
        }

        const user = users[userId];

        await interaction.reply(`Boosters disponibles : **${user.boosters}**\nTemps restant pour regagner un booster : **12h**.`);
    },
};
