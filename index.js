const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Charge les variables d'environnement depuis .env
// Crée une instance du client avec les permissions nécessaires
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
// Utilisation des variables d'environnement
const token = process.env.DISCORD_TOKEN; // Token du bot
const clientId = process.env.CLIENT_ID; // ID du client
const guildId = process.env.GUILD_ID; // ID du serveur
// Liste des cartes avec images locales
const cards = [
    { name: 'Carte Commune 1', rarity: 'Commune', image: path.join(__dirname, 'img', 'Claquette derank.png') },
    { name: 'Carte Commune 2', rarity: 'Commune', image: path.join(__dirname, 'img', 'Claquette derank.png') },
    { name: 'Carte Rare 1', rarity: 'Rare', image: path.join(__dirname, 'img', 'Claquette derank.png') },
    { name: 'Carte Rare 2', rarity: 'Rare', image: path.join(__dirname, 'img', 'Claquette derank.png') },
    { name: 'Carte Épique 1', rarity: 'Épique', image: path.join(__dirname, 'img', 'Claquette derank.png') },
    { name: 'Carte Légendaire 1', rarity: 'Légendaire', image: path.join(__dirname, 'img', 'Claquette derank.png') },
    // Ajouter d'autres cartes ici...
];
// Fichier de stockage pour la collection et les cooldowns
const dataFilePath = path.join(__dirname, 'data.json');
// Charger les données
let data = loadData();
// Lorsque le bot est prêt
client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}!`);
});
// Gérer les interactions (commandes)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const { commandName } = interaction;
    const userId = interaction.user.id;
    // Commande /pc-open
    if (commandName === 'pc-open') {
        const canOpenBooster = checkBoosterCooldown(userId);
        if (canOpenBooster) {
            const card = openBooster(userId);
            await interaction.reply({
                content: `Booster ouvert ! Tu as obtenu : ${card.name} (${card.rarity})`,
                files: [card.image], // Image de la carte
            });
        } else {
            const timeRemaining = getTimeRemaining(userId);
            await interaction.reply(`Tu dois attendre encore **${timeRemaining}** avant de pouvoir ouvrir un autre booster.`);
        }
    }
    // Commande /pc-collect
    else if (commandName === 'pc-collect') {
        const collection = getCollection(userId);
        if (collection.length === 0) {
            return await interaction.reply('Tu n\'as pas encore de cartes.');
        }
        let currentCardIndex = collection.length - 1; // Dernière carte obtenue
        const currentCard = collection[currentCardIndex];
        // Création des boutons de navigation
        const leftButton = new ButtonBuilder()
            .setCustomId('left')
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Primary);
        const rightButton = new ButtonBuilder()
            .setCustomId('right')
            .setLabel('➡️')
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(leftButton, rightButton);
        // Afficher le nombre total de cartes et la carte sur laquelle l'utilisateur se trouve
        const totalCards = collection.length;
        const currentCardPosition = currentCardIndex + 1;
        // Envoi du message avec la dernière carte et les boutons
        await interaction.reply({
            content: `Ta dernière carte : ${currentCard.name} (${currentCard.rarity})\n` +
                `Carte ${currentCardPosition}/${totalCards}`,
            files: [currentCard.image], // Image de la dernière carte
            components: [row],
        });
        // Écouter les interactions sur les boutons
        const filter = (buttonInteraction) => buttonInteraction.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 30000, // Temps limite de 30 secondes
        });
        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'left') {
                // Naviguer à gauche (carte précédente)
                if (currentCardIndex > 0) {
                    currentCardIndex--;
                    const previousCard = collection[currentCardIndex];
                    await buttonInteraction.update({
                        content: `Carte précédente : ${previousCard.name} (${previousCard.rarity})\n` +
                            `Carte ${currentCardIndex + 1}/${totalCards}`,
                        files: [previousCard.image],
                        components: [row],
                    });
                } else {
                    await buttonInteraction.reply({
                        content: 'Il n\'y a pas de carte précédente.',
                        ephemeral: true, // Message visible uniquement pour l'utilisateur
                    });
                }
            } else if (buttonInteraction.customId === 'right') {
                // Naviguer à droite (carte suivante)
                if (currentCardIndex < collection.length - 1) {
                    currentCardIndex++;
                    const nextCard = collection[currentCardIndex];
                    await buttonInteraction.update({
                        content: `Carte suivante : ${nextCard.name} (${nextCard.rarity})\n` +
                            `Carte ${currentCardIndex + 1}/${totalCards}`,
                        files: [nextCard.image],
                        components: [row],
                    });
                } else {
                    await buttonInteraction.reply({
                        content: 'Il n\'y a pas de carte suivante.',
                        ephemeral: true, // Message visible uniquement pour l'utilisateur
                    });
                }
            }
        });
        collector.on('end', () => {
            // Désactive les boutons après 30 secondes
            leftButton.setDisabled(true);
            rightButton.setDisabled(true);
            interaction.editReply({
                content: 'Les boutons de navigation ont expiré.',
                components: [row],
            });
        });
    }
    // Commande /pco-reset-cooldown
    else if (commandName === 'pco-reset-cooldown') {
        if (!interaction.member.roles.cache.some(role => role.name === 'Staff')) {
            return await interaction.reply("Tu n'as pas les permissions nécessaires pour utiliser cette commande.");
        }
        const targetUser = interaction.options.getUser('user');
        resetCooldown(targetUser.id);
        await interaction.reply(`Le cooldown pour ${targetUser.tag} a été réinitialisé.`);
    }
});
// Charger les données depuis le fichier JSON
function loadData() {
    if (fs.existsSync(dataFilePath)) {
        const rawData = fs.readFileSync(dataFilePath);
        return JSON.parse(rawData);
    }
    return { users: {} }; // Structure par défaut
}
// Récupérer la collection de cartes pour un utilisateur
function getCollection(userId) {
    return data.users[userId]?.collection || [];
}
// Vérifier si un utilisateur peut ouvrir un booster (cooldown)
function checkBoosterCooldown(userId) {
    const userCooldown = data.users[userId]?.cooldown || 0;
    const currentTime = Date.now();
    return currentTime > userCooldown;
}
// Obtenir le temps restant pour un utilisateur avant de pouvoir ouvrir un booster
function getTimeRemaining(userId) {
    const userCooldown = data.users[userId]?.cooldown || 0;
    const currentTime = Date.now();
    const timeLeft = userCooldown - currentTime;
    return timeLeft > 0 ? msToTime(timeLeft) : '0s';
}
// Convertir le temps en millisecondes en format lisible (ex: "12h 30m")
function msToTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}
// Réinitialiser le cooldown pour un utilisateur
function resetCooldown(userId) {
    data.users[userId].cooldown = 0;
    saveData();
}
// Ouvrir un booster pour un utilisateur (réinitialise son cooldown)
function openBooster(userId) {
    const card = getRandomCard();
    if (!data.users[userId]) {
        data.users[userId] = { collection: [], cooldown: 0 };
    }
    data.users[userId].cooldown = Date.now() + 3 * 60 * 60 * 1000; // Cooldown de 3h après avoir ouvert un booster
    data.users[userId].collection.push(card); // Ajoute la carte à la collection de l'utilisateur
    saveData();
    return card;
}
// Récupérer une carte aléatoire
function getRandomCard() {
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
}
// Sauvegarder les données dans le fichier JSON
function saveData() {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}
// Se connecter avec le token
client.login(token);