var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var accountSchema = new Schema({
    address: { type: String, unique: true },
    privateKey: String
});


var accountModel = mongoose.model('Account', accountSchema);
module.exports = accountModel;