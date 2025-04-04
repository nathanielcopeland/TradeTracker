const config = require('./config.json');
const { createConnection } = require('mysql2');

let con = createConnection(config.mysql)

module.exports = createConnection(config.mysql);

// con.connect(err => {
//     if(err) return console.log(err);

//     console.log('MySQL has ben connected!');
// });

