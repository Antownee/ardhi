const mongoose = require("mongoose");
const mongoUri = "mongodb://127.0.0.1/ardhi";

var exports = module.exports = {};

mongoose.Promise = global.Promise;

exports.connectDB = (() => {
    mongoose.connect(mongoUri, { useMongoClient: true });

    mongoose.connection.on('connected', () => {
        console.log('MongoDB connection established. ' + mongoUri);
    });

    mongoose.connection.on('error', (err) => {
        console.log(`MongoDB Connection Error. ${err} Please make sure that MongoDB is running.`);
        process.exit(1);
    });

})