const { Client, GatewayIntentBits } = require('discord.js');

// Initialisation du client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Événement lorsque le bot est prêt
client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
});

// Connexion au bot
client.login('MTMwODE1MzM0Nzg5OTAwMjk5NQ.GmWVHb.9IxazH0fgIFi_7Kyr1BlVfahBrnlWtNVyPISPI');
