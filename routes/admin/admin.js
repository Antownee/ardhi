var async = require('async');
var shortid = require('shortid')
var express = require('express');
var router = express.Router();

//Models
var request = require('../../models/requests');
var nemAccount = require('../../models/nem-account');
var lease = require('../../models/lease');
var farmer = require('../../models/farmer');

var nemUtils = require('../../nem/core');
var accountStuff = require('../../nem/address'); //test account

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

router.use((req, res, next) => {
    if (!req.session.farmer) {
        //redirect to login page
        return res.redirect('/login');
    }
    return next();
});

var dashboardRouter = require('./dashboard');
router.use('/', dashboardRouter);

var landLeasedRouter = require('./requests');
router.use('/requests', landLeasedRouter);

var createListingRouter = require('./create-listing');
router.use('/create', createListingRouter);

var postedlistingsRouter = require('./land-posted');
router.use('/posted', postedlistingsRouter);

var accountRouter = require('./account');
router.use('/account', accountRouter);

router.get('/accept/:id', (req, res, next) => {
    //get the request ID from the path
    var requestID = req.params.id;

    async.waterfall([
        (cb) => {
            //Fetch request
            var add = accountStuff.dev ? accountStuff.testAddress : req.session.farmer.nemAddress;

            request.findOne({ landRequestID: requestID }, (err, reqs) => {
                if (err) {
                    return cb(err);
                }

                var i = {
                    leaseeAddress: reqs.requestingAddress,
                    amount: reqs.amount,
                    farmerAddress: add,
                    name: req.session.farmer.username
                };

                return cb(null, i);
            });
        },
        (info, cb) => {
            //Listing detauls
            //Create new lease object and a unique code
            var l = new lease({
                leaseID: shortid.generate(),
                leaseeAddress: info.leaseeAddress, 
                leaserAddress: info.farmerAddress, 
                duration: 5, //years
                commencementDate: Date.now(),
                size: 0.5, //acres
                cost: info.amount //XEM
            });

            l.save((err, ret)=>{
                if(err){
                    return cb(err);
                }
                console.log('Lease successfully saved.');
                return cb(null, ret)
            })
        },
        (lease, cb) => {
            nemAccount.findOne({ address: lease.leaserAddress }, (err, acc) => {
                if (err) {
                    return cb(err);
                }
                var pvt = accountStuff.dev ? accountStuff.testAddressPrivateKey : acc.privateKey;
                return cb(null, lease,pvt);
            });
        },
        (lease,pvt, cb) => {
            
            nemUtils.acceptRequest(lease, pvt, cb);
        },
        (result, cb) => {
            //update request table
            request.findOneAndUpdate(
                { landRequestID: requestID },
                { $set: { status: true } },
                (err) => {
                    if (err) {
                        return cb(err);
                    }
                    console.log("Request accepted.")
                    return cb(null);
                });
        }
    ], (err, result) => {
        if (err) {
            return next(err);
        }

        var f = result;
        return res.redirect('/admin');
    });
});

router.get('/createns', (req, res, next) => {
    var f = req.session.farmer.username;
    var acc = null;
    var frmer = null;
    var balance = 0;


    async.waterfall([
        (cb) => {
            nemAccount.findOne({ address: req.session.farmer.nemAddress }, (err, na) => {
                if (err) {
                    return cb(err);
                }
                acc = na;
                return cb(null, na);
            });
        },
        (na, cb) => {
            farmer.findOne({ nemAddress: req.session.farmer.nemAddress }, (err, frmr) => {
                if (err) {
                    return cb(err);
                }
                frmer = frmr;
                return cb(null, { account: na, farmer: frmr });
            });
        },
        (rs, cb) => {
            nemUtils.createNamespace(rs.farmer, rs.account.privateKey, rs.account.address, cb);
        }
    ],
        (err, resl) => {
            var result = {
                balance: balance,
                farmer: frmer,
                account: acc,
            };

            if (err) {
                result.nscreateerror = "Unable to create namespace. Try again later.";
                return res.render('admin/create.pug', result);
            }
            result.nscreatesuccess = "Namespace successfully created!";
            return res.render('admin/create.pug', result);
        });
});



module.exports = router;