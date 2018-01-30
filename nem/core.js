var nem = require("nem-sdk").default;
var async = require('async');
var shortid = require('shortid');
var pdf = require('html-pdf');
var pug = require('pug');
var fs = require('fs');
var Chance = require('chance');
var exports = module.exports = {};

//Models
var nemAccount = require("../models/nem-account");
var farmer = require("../models/farmer");

//test account
var chance = new Chance();
var accountStuff = require('./address');

//Vital variables
var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);
var compiledLease = pug.compileFile('./views/lease.pug');

//Create address
exports.genAddress = ((req, callback) => {
    var genAddress = "";
    var genPrvKey = "";
    async.waterfall([
        (cb) => {
            //Save account
            var rBytes = nem.crypto.nacl.randomBytes(32); //Generate random bytes
            genPrvKey = nem.utils.convert.ua2hex(rBytes); //create backup
            console.log("rHex(PrvKey): " + genPrvKey + "\n");
            // generate the keypair
            var keyPair = nem.crypto.keyPair.create(genPrvKey);
            var pubKey = keyPair.publicKey.toString();
            console.log("public key: " + pubKey + "\n");

            genAddress = nem.model.address.toAddress(pubKey, nem.model.network.data.testnet.id);

            var acc = new nemAccount({
                address: genAddress, //add
                privateKey: genPrvKey//rHex
            });

            acc.save((err) => {
                if (err) {
                    throw new Error(err);
                }
                console.log(`Successful saved ${genAddress}`);
            });

            return cb(null);
        },
        (cb) => {
            //Save farmer
            var f = new farmer({
                farmerID: `FRMR-${shortid.generate()}`,
                username: req.body.username,
                password: req.body.password,
                nemAddress: genAddress
            });

            f.save((err) => {
                if (err) {
                    return cb(err)
                }
                console.log(`Successfully saved ${f.username}`);
                req.session.farmer = f;
                return cb(null, f);
            });
        }
    ], (err, res) => {
        if (err) {
            return callback(err);
        }
        return callback(null, { address: genAddress, prv: genPrvKey, farmer: res });
    });
});

exports.createNamespace = ((farmer, genPrvKey, genAddress, callback) => {
    async.waterfall([
        (cb) => {
            var common = nem.model.objects.create("common")("", genPrvKey);

            var namespaceTransaction = nem.model.objects.create("namespaceProvisionTransaction")(farmer.username + chance.word({ length: 3 })); //create
            var transactionEntity = nem.model.transactions.prepare("namespaceProvisionTransaction")
                (common, namespaceTransaction, nem.model.network.data.testnet.id); //prepare
            nem.model.transactions.send(common, transactionEntity, endpoint)
                .then(
                (res) => {
                    console.log(res);
                    if (res.message == "FAILURE_INSUFFICIENT_BALANCE") {
                        return cb(new Error("FAILURE_INSUFFICIENT_BALANCE"))
                    }
                    cb(null);
                },
                (err) => {
                    cb(err);
                });
        }
    ],
        (err) => {
            if (err) {
                return callback(err);
            }
            return callback(null);
        });
});


exports.createMosaic = ((address, namespaceName, mosaicName, mosaicDescription, mcb) => {
    //Find account, get private key, pass it into common object then create mosaic
    async.waterfall([
        //Fetch account
        (cb) => {
            nemAccount.findOne({ address: address }, (err, res) => {
                if (err) {
                    return cb(err);
                }
                //var pvt = accountStuff.dev ? accountStuff.testAddressPrivateKey : res.privateKey;
                return cb(null, res.privateKey);
            });
        },
        //Create mosaic
        (pvt, cb) => {
            //var common = nem.model.objects.create("common")("", pvt); 
            var common = nem.model.objects.create("common")("", pvt); //change this to pvt
            var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);

            let mosaicTransaction = {
                "mosaicName": mosaicName,
                "namespaceParent": {
                    owner: address,
                    fqn: namespaceName,
                },
                "mosaicDescription": mosaicDescription,
                "properties": {
                    "initialSupply": 1,
                    "divisibility": 0,
                    "transferable": true,
                    "supplyMutable": true
                },
                "levy": {
                    "mosaic": null,
                    "address": address,
                    "feeType": 1,
                    "fee": 5
                },
                "isMultisig": false,
                "multisigAccount": ""
            };



            var transactionEntity = nem.model.transactions.prepare("mosaicDefinitionTransaction")
                (common, mosaicTransaction, nem.model.network.data.testnet.id); //prepare
            nem.model.transactions.send(common, transactionEntity, endpoint)
                .then((res) => {
                    if (res.code == 1 || res.message == "SUCCESS") {
                        console.log(`Successfully created mosaic. Hash: ${res.transactionHash.data}`);
                        return cb(null, res);
                    }
                }, (err) => {
                    cb(err);
                });
        }
    ],
        (err, res) => {
            if (err) {
                console.error(err);
                return mcb(err);
            }
            console.log("complete");
            return mcb(null, res);
        });
});

//Transfer mosaics to an address
function transferMosaics(leaserAddress) {
    var common = nem.model.objects.create("common")("", testAddressPrivateKey); //change this to pvt
    var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);

    //Address of leaser -> replace address with leaserAddress
    //var transferTransaction = nem.model.objects.create("transferTransaction")(leaserAddress, 0, "Here's the land transfer");
    var transferTransaction = nem.model.objects.create("transferTransaction")("TBCI2A67UQZAKCR6NS4JWAEICEIGEIM72G3MVW5S", 0, "Here's the land transfer");
    var mosaicDefinitionMetaDataPair = nem.model.objects.get("mosaicDefinitionMetaDataPair");

    //frankfrank = namespace fionagallagher = mosaic
    var mosaicAttachment2 = nem.model.objects.create("mosaicAttachment")("frankfrank", "fionagallagher", 7); // 7 frankfrank.fionagallagher (divisibility is 0 for this mosaic) hence 134
    transferTransaction.mosaics.push(mosaicAttachment2);

    nem.com.requests.namespace.mosaicDefinitions(endpoint, mosaicAttachment2.mosaicId.namespaceId).then(function (res) {

        //fionagallagher name of mosaic we are transferring
        var neededDefinition = nem.utils.helpers.searchMosaicDefinitionArray(res.data, ["fionagallagher"]);

        // Get full name of mosaic to use as object key
        var fullMosaicName = nem.utils.format.mosaicIdToName(mosaicAttachment2.mosaicId);

        // Check if the mosaic was found
        if (undefined === neededDefinition[fullMosaicName]) return console.error("Mosaic not found !");

        // Set eur mosaic definition into mosaicDefinitionMetaDataPair
        mosaicDefinitionMetaDataPair[fullMosaicName] = {};
        mosaicDefinitionMetaDataPair[fullMosaicName].mosaicDefinition = neededDefinition[fullMosaicName];

        // Prepare the transfer transaction object
        var transactionEntity = nem.model.transactions.prepare("mosaicTransferTransaction")(common, transferTransaction, mosaicDefinitionMetaDataPair, nem.model.network.data.testnet.id);

        // Serialize transfer transaction and announce
        nem.model.transactions.send(common, transactionEntity, endpoint);
    },
        function (err) {
            console.error(err);
        });
}


//Subscribe to sockets
exports.watchPayments = ((address) => {
    //watch for incoming transactions. once someone pays the farmer account, match it with the request: Address and price of land THEN initiate mosaic transfer
    var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.websocketPort);
    var add = accountStuff.dev ? accountStuff.testAddress : address;
    var connector = nem.com.websockets.connector.create(endpoint, add);

    connectWatchTransactions(connector);
});



exports.acceptRequest = ((lease, pvt, cb) => {
    //This is simply sending a message to the person interested in leasing the land affirming them that land is available for leasing and to proceed with payment
    sendMessage(lease, pvt, cb);
});


function sendMessage(lease, farmerPvt, cb) {
    var ardhiAddress = accountStuff.ardhiAddress;
    var message = `The lease request that you lodged on Ardhi has been accepted. 
                   To proceed, kindly send ${lease.cost} XEM to ${ardhiAddress} as well as 
                   the code ${lease.leaseID} in the message field to facilitate the processing of the lease agreement.`;
    var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);
    var common = nem.model.objects.create("common")("", farmerPvt);
    var transferTransaction = nem.model.objects.create("transferTransaction")(lease.leaseeAddress, 0, message);
    var transactionEntity = nem.model.transactions.prepare("transferTransaction")(common, transferTransaction, nem.model.network.data.testnet.id);
    nem.model.transactions.send(common, transactionEntity, endpoint)
        .then((res) => {
            var f = res;
            if (res.message == "SUCCESS" && res.code == 1) {
                console.log("Message sent to leasee");
                return cb(null, res);
            }
        },
        (err) => {
            console.log(err);
            return cb(err.data);
        }
        );
}

exports.apostilleLease = ((lease, ardhiAccount, callback) => {
    async.waterfall([
        (cb) => {
            //Create a pdf of the lease with the user details
            var leaseHtml = compiledLease({
                leaseID: lease.leaseID,
                leaseeAddress: lease.leaseeAddress, // guy leasing
                leaserAddress: lease.leaserAddress, // farm owner
                duration: lease.duration, //years
                commencementDate: lease.commencementDate,
                size: lease.size, //acre
                cost: lease.cost
            });
            pdf.create(leaseHtml, {
                "format": "A4",
                "base": 'http://localhost:' + 3000,
                "orientation": "landscape",
            }).toBuffer(function (err, buffer) {
                if (err) {
                    return cb(err);
                }
                return cb(null, buffer);
            });
        },
        (buf, cb) => {
            // First get account private key
            //Ardhi will apostille this lease
            var pvtKey = accountStuff.dev ? accountStuff.testAddressPrivateKey : ardhiAccount.pvt;
            var common = nem.model.objects.create("common")("", ardhiAccount.pvt);

            var apostille = nem.model.apostille.create(common, `ARDHI-${lease.leaseID}.pdf`, buf, "Test Apostille", nem.model.apostille.hashing["SHA256"], false, {}, true, nem.model.network.data.testnet.id);

            nem.model.transactions.send(common, apostille.transaction, endpoint)
                .then((res) => {
                    var f = res;
                    if (res.message == "SUCCESS" && res.code == 1) {
                        var dateString = new Date().toLocaleDateString().replace(/\//g, '-'); //replace / with -
                        var fileName = apostille.data.file.name.replace(/\.[^/.]+$/, "") + " -- Apostille TX " + res.transactionHash.data + ` -- Date ${dateString}` + "." + apostille.data.file.name.split('.').pop();
                        //save buffer
                        console.log(`Apostille successful. Hash: ${res.transactionHash.data}.
                                    File name: ${fileName}`);
                        return cb(null, { name: fileName, file: buf });
                    }
                },
                (err) => {
                    console.log(err);
                    return cb(err.data);
                }
                );
        },
        (fileInfo, cb) => {
            fs.writeFile("leases/" + fileInfo.name, fileInfo.file, (err) => {
                if (err) return cb(err);
                return cb(null, fileInfo.name);
            });
        }
    ], ((err, pth) => {
        if (err) {
            return callback(err);
        }
        var obj = {
            path: pth,
            leaseID: lease.leaseID
        };
        return callback(null, obj);
    }));
});


