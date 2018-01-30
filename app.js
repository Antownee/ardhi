'use strict';
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nem = require("nem-sdk").default;
var session = require('express-session');
var fs = require('fs');
var nemUtils = require('./nem/watcher');
var express = require('express');
var pug = require('pug');
require('dotenv').config();
var cors = require('cors');
var app = express();


const utils = require("./utils");
const db = require("./db");
db.connectDB();

//Import routes
var index = require('./routes/index');
var admin = require('./routes/admin/admin');


app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public/front')));
app.use(express.static(path.join(__dirname, 'public/back')));

app.use(session({
    secret: 'work hard',
    resave: true,
    saveUninitialized: false
}));

//ROUTES
app.use('/', index);
app.use('/admin', admin);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    //res.render('error');
});

//Create a folder called leases if it doesn't exist already
let leasedir = './leases';
if (!fs.existsSync(leasedir)) {
    fs.mkdirSync(leasedir);
}

if (process.env.NODE_ENV === 'development') {
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        throw err;
        //Error page
    });
}

if (process.env.NODE_ENV === 'production') {
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        res.sendStatus(err.status || 500);
    });
}


app.listen(3000, () => {
    console.log(`Ardhi is listening on port ${3000}`);
});

//start account watcher
nemUtils.watchPayments();



