var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var landRequestSchema = new Schema({
    landRequestID: { type: String, unique: true },
    date: Date,
    listingID: String, //This is the requested piece of land,
    requestingAddress: String, //This is the person requesting the piece of land
    status: Boolean,
    amount: Number, //cost of lease (In XEM? Yes. Do conversion to KES on front end),
    farmerID: String
});


var landRequestModel = mongoose.model('landRequest', landRequestSchema);
module.exports = landRequestModel;