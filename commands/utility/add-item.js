const { SlashCommandBuilder } = require("discord.js");

let connection;

module.exports = {
    data: new SlashCommandBuilder().setName('add').setDescription('adds new item to db')
    .addStringOption(option =>
        option.setName('item')
        .setDescription('item to add')
        .setRequired(true)
    ),
    async execute(interaction){
        const item = interaction.options.getString('item');

        await interaction.reply('added item: ' + item);
        connection.query(`Insert INTO items (itemname) VALUES('${item}')`);
    },


};

(async () => {
    connection = await require('../../db.js');

})();