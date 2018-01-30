var express = require('express');
var _ = require('lodash');
var nem = require("nem-sdk").default;
var async = require('async');
var router = express.Router();

//Models
var listings = require("../../models/listings");
var requests = require("../../models/requests");

var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);


/* GET users listing. */
router.get('/', function (req, res, next) {
  async.waterfall([
    (cb) => {
      listings.find({ farmerID: req.session.farmer.farmerID }, (err, res) => {
        if (err) {
          return cb(err);
        }
        return cb(null, res);
      });
    },
    (lists, cb) => {
      requests.find({ farmerID: req.session.farmer.farmerID, status: false }, (err, reqs) => {
        if (err) {
          return cb(err);
        }
        return cb(null, { listings: lists, requests: reqs });
      });
    },
    (i, cb) => {
      var reqlists = [];
      var retObj = {
        listings: null,
        reqlists: null,
        listingscount: 0,
        reqlistscount: 0,
        balance: 0
      };

      if (i.requests.length === 0 && i.listings.length === 0) {
        return cb(null, retObj);
      }

      if (i.requests.length === 0 && i.listings.length > 0) {
        retObj.listings = i.listings;
        retObj.listingscount = i.listings.length;
        return cb(null, retObj);
      }

      _.forEach(i.requests, (val) => {
        var id = val.listingID;

        _.find(i.listings, (l) => {
          if (l.listingID == id) {
            return reqlists.push({
              request: val,
              listing: l
            });
          }
        });

      });

      if (i.requests) {
        retObj.reqlistscount = i.requests.length;
      }

      retObj.listings = i.listings;
      retObj.reqlists = reqlists;
      retObj.reqlistscount = i.requests.length || 0;
      retObj.listingscount = i.listings.length || 0;

      return cb(null, retObj);
    },
    (i, cb) => {
      nem.com.requests.account.data(endpoint, req.session.farmer.nemAddress)
        .then(
        (resl) => {
          var fmt = nem.utils.format.nemValue(resl.account.balance);
          i.balance = parseInt(fmt[0] + "." + fmt[1]);
          return cb(null, i);
        }, (err) => {
          return cb(err);
        });

    }
  ], (err, results) => {
    if (err) {
      throw new Error(err);
    }
    if (!results) {
      return res.render("../views/admin/index");
    }
    //Get the final objects and display on home page reqs and lists
    //Listings count, request count and account balance
    return res.render("../views/admin/index", { results: results });
  });
});

module.exports = router;