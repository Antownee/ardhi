var async = require('async');
var nem = require("nem-sdk").default;
var express = require('express');
var router = express.Router();
var cors = require('cors');

var nemUtils = require('../../nem/core');
var nemAccount = require('../../models/nem-account');
var farmer = require('../../models/farmer');


var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);

router.get('/', (req, res, next) => {
    //get account details and show them
    async.waterfall([
        (cb) => {
            //Get account
            nemAccount.findOne({ address: req.session.farmer.nemAddress }, (err, na) => {
                if (err) {
                    return cb(err);
                }
                return cb(null, na);
            });
        },
        (na, cb) => {
            farmer.findOne({ nemAddress: req.session.farmer.nemAddress }, (err, frmr) => {
                if (err) {
                    return cb(err);
                }
                return cb(null, { account: na, farmer: frmr });
            });
        },
        (rs, cb) => {
            nem.com.requests.account.data(endpoint, req.session.farmer.nemAddress)
                .then(
                (resl) => {
                    var fmt = nem.utils.format.nemValue(resl.account.balance);
                    rs.balance = parseInt(fmt[0] + "." + fmt[1]);
                    return cb(null, rs);
                }, (err) => {
                    return cb(err);
                });
        }
    ],
        (err, result) => {
            if (err) {
                return next(err);
            }
            return res.render('admin/account.pug', result);
        });
});

router.get('/createns', cors(), (req, res, next) => {
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
                result.nserror = err.message;
                return res.render('admin/account.pug', result);
            }
            result.nssuccess = "namespace successfully created!";
            return res.render('admin/account.pug', result);
        });
});

module.exports = router;