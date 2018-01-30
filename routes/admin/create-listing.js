var shortid = require('shortid');
var async = require('async');
var chance = require('chance');
var nem = require("nem-sdk").default;
var express = require('express');
var router = express.Router();

//Models
var listing = require('../../models/listings');
var nemUtils = require('../../nem/core');

var accountStuff = require('../../nem/address');

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');
var chance = new chance();


/* GET users listing. */
router.get('/', function (req, res, next) {
  var add = req.session.farmer.nemAddress;
  var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);
  nem.com.requests.account.namespaces.owned(endpoint, add)
    .then((resp) => {
      if (resp.data.length == 0) {
        //cant create listing.
        return res.render("../views/admin/create",
          {
            nserror: `Namespace does not exist. To enable namespace creation, `
          }
        );
      }
      else {
        return res.render("../views/admin/create",
          {
            nssuccess: `Namespace: ${resp.data[0].fqn}`
          }
        );
      }
    }, (err) => {
      return next(err);
    });
});

router.post('/', (req, res, next) => {
  //First check if there's a namespace to this account
  var add = req.session.farmer.nemAddress;
  //var add = accountStuff.testAddress;
  var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);
  nem.com.requests.account.namespaces.owned(endpoint, add)
    .then((resp) => {
      if (resp.data.length == 0) {
        //cant create listing.
        return res.render("../views/admin/create",
          {
            error: `Cannot create listing due to insufficient funds. 
                  Head over to the Account tab and top up your account to enable creation of new listings`
          }
        );
      }
      else {
        var ns = resp.data[0].fqn;
        createListing(ns, req, res);
      }
    }, (err) => {
      return next(err);
    });
});

function createListing(namespaceName, req, res) {
  async.waterfall([
    (cb) => {
      //Create mosaic 
      var add = req.session.farmer.nemAddress;
      nemUtils.createMosaic(add, namespaceName, `${chance.word({ length: 10 })}`, req.body.listingDescription, cb);
      //check if res is an error
    },
    (mosaicInfo, cb) => {

      //Save listing
      var lst = new listing({
        listingID: shortid.generate(),
        title: req.body.listingTitle,
        description: req.body.listingDescription,
        farmerID: req.session.farmer.farmerID,
        location: req.body.listingLocation,
        amount: req.body.listingAmount,
        mosaicID: mosaicInfo.transactionHash.data
      });

      lst.save((err) => {
        if (err) {
          return cb(err);
        }
        console.log("Listing created");
        return cb(null);
      });
    }
  ], (err, r) => {
    if (err) {
      return res.render("../views/admin/create", { error: "Slight error while trying to save. Try again later" });
    }
    return res.render("../views/admin/create", { success: "Successfuly saved!" });
  });
}


module.exports = router;