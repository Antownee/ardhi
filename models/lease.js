var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var leaseSchema = new Schema({
    leaseID: { type: String, unique: true },
    leaseeAddress: String, // guy leasing
    leaserAddress: String, // farm owner
    duration: Number, //years
    commencementDate: Date,
    size: Number, //acres
    cost: Number, //XEM,
    leasePath: String
});


var leaseModel = mongoose.model('Lease', leaseSchema);
module.exports = leaseModel;