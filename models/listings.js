var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var listingSchema = new Schema({
    listingID: { type: String, unique: true },
    title: String,
    description: String,
    farmerID: String,
    location: String,
    amount: Number,
    mosaicID: String
});


var listingModel = mongoose.model('LandListing', listingSchema);
module.exports = listingModel;