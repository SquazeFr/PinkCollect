const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'pc-open',
    description: 'Ouvre un booster pour recevoir une carte !',
    async execute(interaction, users, cards, saveUsers) {
        const userId = interaction.user.id;

        if (!users[userId]) {
            users[userId] = { boosters: 1, collection: {} };
        }

        const user = users[userId];

        if (user.boosters <= 0) {
            return interaction.reply('Vous n’avez pas de boosters disponibles !');
        }

        user.boosters -= 1;
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        const cardName = randomCard.name;

        if (!user.collection[cardName]) {
            user.collection[cardName] = 0;
        }
        user.collection[cardName] += 1;

        saveUsers();

        const embed = new MessageEmbed()
            .setTitle('🎉 Booster Ouvert !')
            .setDescription(`Vous avez obtenu : **${cardName}**`)
            .addField('Rareté', randomCard.rarity, true)
            .setColor('#FFD700');

        if (randomCard.special) {
            embed.addField('Spécial', randomCard.special, true);
        }

        await interaction.reply({ embeds: [embed] });
    },
};
