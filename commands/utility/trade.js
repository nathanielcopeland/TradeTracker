const { SlashCommandBuilder } = require("discord.js");
const { SaleType } = require("../../models/sale-type.js");
let connection;

// Define the 'get' command
const getCommand = {
    data: new SlashCommandBuilder()
        .setName('get')
        .setDescription('Gets an item from the database')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to search for')
                .setRequired(true)
        ),
    async execute(interaction) {
        const item = interaction.options.getString('item');

        let itemAvailable = await new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM items WHERE itemname LIKE '%${item}%'`, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (itemAvailable.length === 0) {
            await interaction.reply('No item found');
            return;
        }

        await interaction.reply(`Found item: ${itemAvailable[0].itemname}`);
    },
};

// Define the 'inb' command
const inbCommand = {
    data: new SlashCommandBuilder()
        .setName('inb')
        .setDescription('Adds an INB trade to the database')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to add')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('price')
                .setDescription('Price of the item')
                .setRequired(true)
        ),
    async execute(interaction) {
        const item = interaction.options.getString('item');
        const price = interaction.options.getString('price');

        let itemAvailable = await new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM items WHERE itemname LIKE '%${item}%'`, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (itemAvailable.length === 0) {
            await interaction.reply('No item found');
            return;
        }

        let userId = await new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM users WHERE discordid = ${interaction.user.id}`, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (userId.length === 0) {
            await insertUserIfNotExists(interaction.user.id);
        }

        connection.query(`INSERT INTO trades (userid, itemid, price, type, datetime) VALUES (${userId[0].id}, ${itemAvailable[0].id}, ${price}, ${SaleType.InstantBuy}, NOW())`, (error) => {
            if (error) {
                console.error('Error executing query:', error);
            }
        });

        await interaction.reply(`Trade added for item: ${itemAvailable[0].itemname}`);
    },
};

// Define the 'nib' command
const nibCommand = {
    data: new SlashCommandBuilder()
        .setName('nib')
        .setDescription('Adds a NIB trade to the database')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to add')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('price')
                .setDescription('Price of the item')
                .setRequired(true)
        ),
    async execute(interaction) {
        const item = interaction.options.getString('item');
        const price = interaction.options.getString('price');

        let itemAvailable = await new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM items WHERE itemname LIKE '%${item}%'`, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (itemAvailable.length === 0) {
            await interaction.reply('No item found');
            return;
        }

        let userId = await new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM users WHERE discordid = ${interaction.user.id}`, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (userId.length === 0) {
            await insertUserIfNotExists(interaction.user.id);
        }

        connection.query(`INSERT INTO trades (userid, itemid, price, type, datetime) VALUES (${userId[0].id}, ${itemAvailable[0].id}, ${price}, ${SaleType.NonInstantBuy}, NOW())`, (error) => {
            if (error) {
                console.error('Error executing query:', error);
            }
        });

        await interaction.reply(`Trade added for item: ${itemAvailable[0].itemname}`);
    },
};

const profit = {
    data: new SlashCommandBuilder()
        .setName('profit')
        .setDescription('Calculates profit from trades')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to calculate profit for')
                .setRequired(false) // Make the item option optional
        ),
    async execute(interaction) {
        const item = interaction.options.getString('item');

        // Get the user ID from the database
        let userId = await new Promise((resolve, reject) => {
            connection.query(`SELECT id FROM users WHERE discordid = ${interaction.user.id}`, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (userId.length === 0) {
            await interaction.reply('User not found in the database.');
            return;
        }

        // Query to calculate combined profit for all items or a specific item
        let profitQuery = `
            SELECT 
                SUM(CASE WHEN t.type = ${SaleType.NonInstantBuy} THEN t.price ELSE 0 END) AS total_purchases,
                SUM(CASE WHEN t.type = ${SaleType.InstantBuy} THEN t.price ELSE 0 END) AS total_sales
            FROM trades t
            JOIN items i ON t.itemid = i.id
            WHERE t.userid = ${userId[0].id}
        `;

        // Add item filter if an item is provided
        if (item) {
            profitQuery += ` AND i.itemname LIKE '%${item}%'`;
        }

        let profitResult = await new Promise((resolve, reject) => {
            connection.query(profitQuery, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (profitResult.length === 0 || !profitResult[0].total_purchases && !profitResult[0].total_sales) {
            await interaction.reply(item ? `No trades found for the item "${item}".` : 'No trades found.');
            return;
        }

        const { total_purchases, total_sales } = profitResult[0];

        // Calculate adjusted sales considering the 2% fee
        const adjusted_sales = total_sales - (total_sales * 0.02);
        const adjustedProfit = adjusted_sales - total_purchases;

        // Build the response message
        const response = item
            ? `Combined profit for item "${item}":\n`
            : `Combined profit for all items:\n`;

        await interaction.reply(
            response +
            `- Total Purchases: ${formatGpToDiscord(total_purchases)}\n` +
            `- Total Sales (after 2% fee): ${formatGpToDiscord(adjusted_sales)}\n` +
            `- Net Profit: ${formatGpToDiscord(adjustedProfit)}`
        );
    },
};

// Helper function to insert a user if they don't exist
async function insertUserIfNotExists(userId) {
    return new Promise((resolve, reject) => {
        connection.query(`INSERT IGNORE INTO users (discordid) VALUES (${userId})`, (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

//method to format profit
function formatGpToDiscord(profit) {
    if (profit >= 1000000) {
        return `${(profit / 1000000).toFixed(2)}M`;
    } else if (profit >= 1000) {
        return `${(profit / 1000).toFixed(2)}K`;
    } else {
        return profit.toString();
    }
}

// Export all commands as an array
module.exports = [getCommand, inbCommand, nibCommand, profit];

// Initialize the database connection
(async () => {
    connection = await require('../../db.js');
})();