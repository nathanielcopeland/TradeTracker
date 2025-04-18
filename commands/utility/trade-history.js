const { SlashCommandBuilder } = require("discord.js");
const { SaleType } = require("../../models/sale-type.js");
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const  Chart  = require("chart.js");
require('chartjs-adapter-moment');

let connection;

const width = 400; //px
        const height = 400; //px
        const backgroundColour = 'white'; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour});

module.exports = {
    data: new SlashCommandBuilder().setName('chart').setDescription('gets item from db').addStringOption(option =>
        option.setName('item')
        .setDescription('item to add')
        .setRequired(true)
    ),
    async execute(interaction){
       
        
        
        //get the data from the db trades, price is the dataset, and the x axis is the date of the trade
        
        const item = interaction.options.getString('item');

        // let itemAvailable = connection.query(`select * from items where itemname like '%${item}%'`);
        let itemAvailable = await new Promise((resolve, reject) => {
            connection.query(`select * from items where itemname like '%${item}%'`, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    console.error('hey:', results);
                    resolve(results);
                }
            });
        });

        if(itemAvailable.length == 1){
        let trades = await new Promise((resolve, reject) => {
            connection.query(`select * from trades t join items i on i.id = t.itemid where itemid = ${itemAvailable[0].id}`, (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    console.error('hey:', results);
                    resolve(results);
                }
            });
        });

        console.log(trades);

        //push trades.price to an array
        let inbPrices = [];
        let insPrices = [];
        let sellProfit = [];
        let dates = [];

        for(let i = 0; i < trades.length; i++){

            //push price where saletype = 0
            if(trades[i].type == SaleType.InstantBuy){
                inbPrices.push({ y: trades[i].price, x: new Date(trades[i].datetime).toISOString() });
                sellProfit.push(trades[i].price - (trades[i].price * 0.02));
                insPrices.push(null);
            } else {
                insPrices.push(trades[i].price);
                inbPrices.push({y: null, x: new Date(trades[i].datetime).toISOString()});
                sellProfit.push(null);
            }

            dates.push(new Date(trades[i].datetime).toISOString());
        }

        (async () => {
            const configuration = {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                    {
                        label: 'Instant Buy/ sell price',
                        backgroundColor: 'rgb(0, 255, 0)',
                        borderColor: 'rgb(0, 255, 0)',
                        data: inbPrices,
                    },
                    {
                        label: 'Instant Sell/ buy price',
                        backgroundColor: 'rgb(0, 0, 255)',
                        borderColor: 'rgb(0, 0, 255)',
                        data: insPrices,
                    },
                    {
                        label: 'Sell price with tax',
                        backgroundColor: 'rgb(255, 0, 0)',
                        borderColor: 'rgb(255, 0, 0)',
                        data: sellProfit,
                    }]
                },
                options: {
                    spanGaps: true,
                    scales: {
                        x: {
                            type: 'time', // Use a time scale for the x-axis
                            time: {
                                unit: 'day', // Display labels for each day
                            },
                            title: {
                                display: true,
                                text: 'Date', // Label for the x-axis
                            },
                            ticks: {
                                major: {
                                    font: {
                                        style: 'bold',
                                    },
                                    color: '#FF0000',
                                },
                            },
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Price', // Label for the y-axis
                            },
                        },
                    },
                },
            };
            const image = await chartJSNodeCanvas.renderToBuffer(configuration);

            await interaction.reply({ files: [{ name: 'chart.png', attachment: image }] });
        })();


    }

        //await interaction.reply('found item: ' + itemAvailable[0].itemname + ' with id: ' + itemAvailable[0].id + ' and description: ' + itemAvailable[0].description);
    },



};

(async () => {
    connection = await require('../../db.js');

})();