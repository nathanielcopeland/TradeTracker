// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { createConnection } = require('mysql2');
const config = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let con = createConnection(config.mysql)

con.connect(err => {
    if(err) return console.log(err);

    console.log('MySQL has ben connected!');
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(config.client.token);
