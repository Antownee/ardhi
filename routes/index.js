var express = require('express');
var router = express.Router();
var shortid = require("shortid");
var async = require('async');
var pug = require('pug');
var nemHelpers = require('../nem/core');
var leaseRequest = require('../models/requests');
var pdf = require('html-pdf');
var fs = require('fs');

//Models
var farmer = require('../models/farmer');
var listing = require('../models/listings');
var lease = require('../models/lease');

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');
var compiledLease = pug.compileFile('./views/lease.pug');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.render('../views/front/index');
});

router.get('/get-lease/:id', (req, res, next) => {
  var leaseID = req.params.id;

  lease.findOne({ leaseID: leaseID }, (err, ls) => {
    if (err) {
      return next(err);
    }
    var leaseFile = fs.readFileSync(`./leases/${ls.leasePath}`);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=' + ls.leasePath,
      'Content-Length': leaseFile.length
    });
    return res.end(leaseFile);
  });
});

router.get('/apostille', (req, res, next) => {
  nemHelpers.apostilleLease();
});

router.get('/lease', (req, res, next) => {
  res.render('../views/lease', {
    leaseID: "5656TYTYTU",
    leaseeAddress: "TAXKYHNSK3ZMPQGZOQWY7YSGTQRX7LLPJ66DGXYM", // guy leasing
    leaserAddress: "TB4OGTZNA7EUQWGEPBNSK55PWWU2X767SJIJGNUF", // farm owner
    duration: 1, //years
    commencementDate: "12/3/2018",
    size: 5, //acre
    cost: 5000
  });
})

router.get("/pdf", (req, res, next) => {
  var leaseHtml = compiledLease({
    leaseID: "5656TYTYTU",
    leaseeAddress: "TAXKYHNSK3ZMPQGZOQWY7YSGTQRX7LLPJ66DGXYM", // guy leasing
    leaserAddress: "TB4OGTZNA7EUQWGEPBNSK55PWWU2X767SJIJGNUF", // farm owner
    duration: 1, //years
    commencementDate: "12/3/2018",
    size: 5, //acre
    cost: 5000
  });
  var h = leaseHtml;
  pdf.create(leaseHtml, {
    "format": "Legal",
    "base": 'http://localhost:' + 3000,
    "orientation": "landscape",
  }).toFile('./leases/lease_test.pdf', function (err, pth) {
    if (err) return next(err);
    res.sendStatus(200);
  });
})

router.get('/login', function (req, res, next) {
  res.render("../views/login");
  next();
});

router.post('/login', function (req, res, next) {
  farmer.authenticate(req.body.username, req.body.password, (error, frmr) => {
    if (error || !frmr) {
      return res.render("../views/login", { message: "Wrong email or password." });
    } else {
      req.session.farmer = frmr;
      return res.redirect("/admin");
    }
  });
});

router.post('/signup', (req, res, next) => {
  async.waterfall([
    (cb) => {
      nemHelpers.genAddress(req, cb);
    }
  ], (err, resp) => {
    if (err) {
      return res.render("../views/login", { message: "Unable to create account. Try again later" });
    }
    //Bring up modal with the private key and address
    return res.redirect("/admin");

  });
});

router.get('/logout', function (req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});

router.get('/listings', (req, res, next) => {
  listing.find({}, (err, lsts) => {
    if (err) {
      throw new Error(err);
    }
    return res.render('../views/front/listings', { listings: lsts });
  });
});

router.post('/post-request', (req, res, next) => {
  var ra = req.body.requestingAddress;
  var li = req.body.listingID;
  var am = parseInt(req.body.amount);
  ra = ra.replace(/-/g,"");


  async.waterfall([
    (cb) => {
      //First get farmer who owns the land
      listing.findOne({ listingID: li }, (err, lst) => {
        if (err) {
          return cb(err);
        }
        return cb(null, lst);
      });
    },
    (lst, cb) => {
      //Save that farmerID
      var reqs = new leaseRequest({
        landRequestID: `${shortid.generate()}`,
        date: Date.now(),
        listingID: li, //This is the requested piece of land,
        requestingAddress: ra,
        status: false, //not accepted,
        amount: am,
        farmerID: lst.farmerID
      });

      reqs.save((err) => {
        if (err) {
          return cb(err);
        }
        return cb(null);
      });
    }
  ], (err) => {
    if (err) {
      return res.sendStatus(500);
    }
    console.log("Request successfully saved");
    return res.sendStatus(200);
  });



  //Save to request table

});

module.exports = router;