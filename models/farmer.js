var mongoose = require("mongoose");
var bcrypt = require("bcrypt")
var Schema = mongoose.Schema;

var farmerSchema = new Schema({
  farmerID: { type: String, unique: true },
  username: String,
  password: String,
  nemAddress: String,
  namespace: [],
  mosaicsOwned: [], //Pieces of land he owns (Save the mosaic ID)
  mosaicsLeased: [] //Pieces of land he has leased (Save the mosaic ID)
});

farmerSchema.pre('save', function (next) {
  var farmer = this;
  bcrypt.hash(farmer.password, 10, function (err, hash) {
    if (err) {
      return next(err);
    }
    farmer.password = hash;
    next();
  });
});

farmerSchema.statics.authenticate = function (username, password, callback) {

  farmerModel.findOne({ username: username })
    .exec(function (err, farmer) {
      if (err) {
        return callback(err)
      } else if (!farmer) {
        var err = new Error('User not found.');
        err.status = 401;
        return callback(err);
      }
      bcrypt.compare(password, farmer.password, function (err, result) {
        if (result === true) {
          return callback(null, farmer);
        } else {
          return callback();
        }
      })
    });
}

var farmerModel = mongoose.model('Farmer', farmerSchema);
module.exports = farmerModel;