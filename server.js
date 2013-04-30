#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
var policiecr = require('./lib/policiecr.js');
var mongodb = require('mongodb');



/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP;
        self.port      = process.env.OPENSHIFT_INTERNAL_PORT || 18080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };

    self.initializeMongoDb = function() {
        var mongoUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME || null;
        var mongoPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD || null;
        var mongoIp = process.env.OPENSHIFT_MONGODB_DB_HOST || "127.0.0.1";
        var mongoPort = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;

        var server = new mongodb.Server(mongoIp, mongoPort, {});
        self.mongoStorage = new mongodb.Db('pcr', server, {safe:false, auto_reconnect: true});
        self.mongoStorage.open(function(){
            if(mongoUser != null && mongoPass != null) {
                self.mongoStorage.authenticate(mongoUser, mongoPass, function(err, res) {});
            }
        });

    };


//
//    /**
//     *  Populate the cache.
//     */
//    self.populateCache = function() {
//        if (typeof self.zcache === "undefined") {
//            self.zcache = { 'index.html': '' };
//        }
//
//        //  Local cache for static content.
//        self.zcache['index.html'] = fs.readFileSync('./index.html');
//    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */

    self.renderPage = function(page, req, res) {
        res.set('Content-Type', 'text/html');
        var layout = fs.readFileSync('./public/templates/layout.html', 'utf-8');
        var pageTemplate = fs.readFileSync('./public/templates/pages/' + page + '.html', 'utf-8');
        res.send(layout.replace("{page}", pageTemplate));
    };

    self.createRoutes = function() {
        self.routes = { };

        // Routes for /health, /asciimo, /env and /
        self.routes['/health'] = function(req, res) {
            res.send('1');
        };

        self.routes['/lastsearch'] = function(req, res) {
            self.mongoStorage.collection("results", function (err, collection) {
                collection.find().limit(5).toArray(function (err, results) {
                    res.set('Content-Type', 'text/javascript');
                    var output = JSON.stringify(results);
                    res.send(output);
                });
        })};

        self.routes['/search'] = function (req, res) {
            var q = req.query["q"];
            var format = req.query["format"];
            if(typeof format === undefined) {
                format = "json";
            }

            new policiecr.PolicieCrClient().search(q, function (result) {

                if(typeof result.results !== "undefined") {
                    self.mongoStorage.collection("results", function (err, collection) {
                        result.results.forEach(function(entry) {
                            collection.count({"vin": entry.vin},function (err, count) {
                                if(count == 0) {
                                    collection.insert(entry);
                                }
                            });
                        });
                    });
                }

                if (format == "xml") {
                    res.set('Content-Type', 'text/xml');
                    var output = require('easyxml').render(result);
                    res.send(output);
                } else {
                    res.set('Content-Type', 'text/javascript');
                    var output = JSON.stringify(result);
                    res.send(output);
                }
            });
        }

        var pages = ["docs", "demo", "contact", "expo", "about", "moredata"];

        pages.forEach(function (entry) {
            self.routes['/' + entry] = function (req, res) {
                self.renderPage(entry, req, res);
            };
        });

        // special, homepage mapped to /
        self.routes['/'] = function (req, res) {
            self.renderPage('homepage', req, res);
        };
    };




    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

        self.app.use('/public', express.static(__dirname + '/public'));

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
//        self.populateCache();
        self.setupTerminationHandlers();

        self.initializeMongoDb();
        // Create the express server and routes.
        self.initializeServer();

    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

