//utility methods
var farmer = require("./models/farmer");

var exports = module.exports = {}


exports.testSave = ((ID, name) => {
    var f = new farmer({
        farmerID: ID,
        name: name
    });

    f.save((err) => {
        if (err) {
            // return console.log("Error encountered");
            throw new Error(err);
        }
        return console.log("Success");
    });
});


