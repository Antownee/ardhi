var nem = require("nem-sdk").default;
var async = require("async");
var exports = module.exports = {};

//Models
var lease = require('../models/lease');

var addresses = require('./address');
var nemUtils = require('../nem/core')

function connect(connector) {
    connector.connect().then(function () {
        var date = new Date();
        console.log(`${date.toLocaleString()} : Transaction watcher begun for ${connector.address}.`);
        nem.com.websockets.subscribe.account.transactions.confirmed(connector, function (res) {
            var msg = nem.utils.format.hexMessage(res.transaction.message);
            var a = nem.utils.format.nemValue(res.transaction.amount);
            var amnt = parseInt(a[0] + "." + a[1]);

            //Look up the message/code in the lease table. 
            //if it exists, and amount matches that saved in db, send money to leaserAddress
            async.waterfall([
                (cb) => {
                    //if message is null, ignore
                    lease.findOne({ leaseID: msg, cost: amnt }, (err, ls) => {
                        if (err) {
                            //throw
                            return cb(err);
                        }
                        if (ls) {
                            //ignore
                            //start sending the money from ardhi account to leaserAddress/farmer
                            return cb(null, ls);
                        }
                    });
                },
                (ls, cb) => {
                    //Send the money
                    sendMoney(ls, cb);
                },
                (ls, cb) => {
                    //Apostille lease and send the link as a message to farmer and the leasee
                    var ac = {
                        address: addresses.ardhiAddress,
                        pvt: addresses.ardhiMainPvtKey
                    };
                    nemUtils.apostilleLease(ls, ac, cb);
                },
                (obj, cb) => {
                    //Save path to lease object
                    lease.findOneAndUpdate({ leaseID: obj.leaseID }, { $set: { "leasePath": obj.path } }, (err, resl) => {
                        if (err) {
                            return cb(err);
                        }
                        return cb(null, resl);
                    });
                }
            ],
                (err, ls) => {
                    if (err) {
                        throw new Error(err);
                    }
                    //Generate download link
                    var dLink = `http://localhost:3000/get-lease/${ls.leaseID}`;
                    var message = ` Congratulations on a successful trade. 
                                    Follow the link below to access your Apostille notarised lease: ${dLink}`;
                    //For loop where it sends message to farmer and leasee
                    sendMessage(ls.leaseeAddress, message);
                    sendMessage(ls.leaserAddress, message);
                }
            );
        });
    }, function (err) {
        // If we are here connection failed 10 times (1/s).
        console.log(err);
        reconnectSockets();
    });
}

function reconnectSockets() {
    endpoint = nem.model.objects.create("endpoint")("http://bob.nem.ninja", 7778);
    connector = nem.com.websockets.connector.create(endpoint, testAddress);
    console.log(date.toLocaleString() + ': Trying to connect to: ' + endpoint.host);
    connect(connector);
}

function sendMessage(address, message) {
    var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);
    var common = nem.model.objects.create("common")("", addresses.ardhiMainPvtKey);
    var transferTransaction = nem.model.objects.create("transferTransaction")(address, 0, message);
    var transactionEntity = nem.model.transactions.prepare("transferTransaction")(common, transferTransaction, nem.model.network.data.testnet.id);
    nem.model.transactions.send(common, transactionEntity, endpoint)
        .then(
            (res) => {
                if (res.message == "SUCCESS" && res.code == 1) {
                    console.log(`Message sent to ${address}`);
                }
            },
            (err) => {
                console.log(err);
                throw new console.error((err));
            }
        );
}

function sendMoney(ls, cb) {
    var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);
    var common = nem.model.objects.create("common")("", addresses.ardhiMainPvtKey);
    var message = `You have received this payment from ${ls.leaseeAddress} as payment for the lease ID ${ls.leaseID}.`;
    var transferTransaction = nem.model.objects.create("transferTransaction")(ls.leaserAddress, ls.cost, message);
    var transactionEntity = nem.model.transactions.prepare("transferTransaction")(common, transferTransaction, nem.model.network.data.testnet.id);
    nem.model.transactions.send(common, transactionEntity, endpoint)
        .then((res) => {
            if (res.message == "SUCCESS" && res.code == 1) {
                console.log(`Funds sent to leaser/farmer: ${ls.leaserAddress}`);
            }
            return cb(null, ls);
        },
        (err) => {
            return cb(err);
        }
        );
}

exports.watchPayments = () => {
    var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.websocketPort);
    var connector = nem.com.websockets.connector.create(endpoint, addresses.ardhiAddress);
    connect(connector);
}