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
                .setRequired(true)
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

        // Query to calculate profit for the specified item
        let profitResult = await new Promise((resolve, reject) => {
            connection.query(
                `SELECT 
                    i.itemname,
                    SUM(CASE WHEN t.type = ${SaleType.NonInstantBuy} THEN t.price ELSE 0 END) AS total_purchases,
                    SUM(CASE WHEN t.type = ${SaleType.InstantBuy} THEN t.price ELSE 0 END) AS total_sales,
                    SUM(CASE WHEN t.type = ${SaleType.InstantBuy} THEN t.price ELSE 0 END) - 
                    SUM(CASE WHEN t.type = ${SaleType.NonInstantBuy} THEN t.price ELSE 0 END) AS profit
                FROM trades t
                JOIN items i ON t.itemid = i.id
                WHERE t.userid = ${userId[0].id} AND i.itemname LIKE '%${item}%'
                GROUP BY t.itemid`,
                (error, results) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        if (profitResult.length === 0) {
            await interaction.reply('No trades found for the specified item.');
            return;
        }

        const { itemname, total_purchases, total_sales, profit } = profitResult[0];

        //sales - (sales * 0.02)
        // Calculate profit considering the 2% fee for sales
        const adjusted_sales = total_sales - (total_sales * 0.02);


        let adjustedProfit = adjusted_sales - total_purchases;
        adjustedProfit = formatProfit(adjustedProfit); // Format profit for better readability
        //format profit 6 zeros becomes M, 3 zeros becomes K
        await interaction.reply(
            `Profit for item "${itemname}":\n` +
            `- Total Purchases: ${total_purchases}\n` +
            `- Total Sales: ${adjusted_sales}\n` +
            `- Net Profit: ${adjustedProfit }\n`
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
function formatProfit(profit) {
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