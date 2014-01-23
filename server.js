#!/bin/env node

var express = require('express');
var fs = require('fs');

var mongodb = require('mongodb');
var mustache = require('mustache');

var policiecr = require('./lib/policiecr.js');
var outputFormat = require("./lib/utils/OutputFormat");

var MyApp = function () {

    //  Scope.
    var self = this;

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function () {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP;
        self.port = process.env.OPENSHIFT_INTERNAL_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        }
        ;
    };

    self.initializeMongoDb = function () {
        var mongoUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME || null;
        var mongoPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD || null;
        var mongoIp = process.env.OPENSHIFT_MONGODB_DB_HOST || "127.0.0.1";
        var mongoPort = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;

        var server = new mongodb.Server(mongoIp, mongoPort, {});
        self.mongoStorage = new mongodb.Db('pcr', server, {safe: false, auto_reconnect: true});
        self.mongoStorage.open(function () {
            if (mongoUser != null && mongoPass != null) {
                self.mongoStorage.authenticate(mongoUser, mongoPass, function (err, res) {
                });
            }
        });

    };

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function (sig) {
        if (typeof sig === "string") {
            console.log('%s: Received %s - terminating app ...',
                Date(Date.now()), sig);
            process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()));
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function () {
        //  Process on exit and signals.
        process.on('exit', function () {
            self.terminator();
        });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
            'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function (element, index, array) {
                process.on(element, function () {
                    self.terminator(element);
                });
            });
    };

    /**
     *  Create the routing table entries + handlers for the application.
     */

    self.renderPage = function (page, req, res, data) {

        res.set('Content-Type', 'text/html');
        var layout = fs.readFileSync('./public/templates/layout.html', 'utf-8');
        var pageTemplate = fs.readFileSync('./public/templates/pages/' + page + '.html', 'utf-8');

        if (typeof data !== 'undefined') {
            pageTemplate = mustache.to_html(pageTemplate, data);
        }

        res.send(layout.replace("{page}", pageTemplate));
    };

    self.createRoutes = function () {
        self.routes = { };

        self.routes['/list'] = function (req, res) {
            var page = req.query["page"];
            if (typeof page === "undefined") {
                page = 1;
            }
            var limit = 200; // entries per page
            page = page - 1;
            var skip = page * limit;

            self.mongoStorage.collection("results", function (err, collection) {
                collection.count(function (err, count) {
                    // sort by create time desc
                    collection.find().sort({'_id' : -1}).limit(limit).toArray(function (err, results) {
                        var data = {};
                        data['total'] = Math.min(limit, count);
                        data['results'] = results;
                        self.renderPage("list", req, res, data);
                    });
                });
            });
        };

        self.routes['/lastsearch'] = function (req, res) {
            self.mongoStorage.collection("results", function (err, collection) {
                collection.find().limit(5).toArray(function (err, results) {
                    res.set('Content-Type', 'text/javascript');
                    var output = JSON.stringify(results);
                    res.send(output);
                });
            })
        };

        self.routes['/search'] = function (req, res) {
            var q = req.query["q"];
            var contentType = detectContentType(req);

            try {
                new policiecr.client().search(q, function (result) {

                    if (typeof result.results !== "undefined") {
                        self.mongoStorage.collection("results", function (err, collection) {
                            result.results.forEach(function (entry) {
                                collection.count({"vin": entry.vin}, function (err, count) {
                                    if (count == 0) {
                                        collection.insert(entry);
                                    }
                                });
                            });
                        });
                    }
                    sendData(res, result, contentType);

                });
            } catch (err) {
                sendData(res, {'error': err}, contentType)
            }
        }

        var detectContentType = function (req) {
            var format = req.query["format"];

            if (format == "xml") {
                return outputFormat.contentType.XML;
            } else if (format == "json") {
                return outputFormat.contentType.JSON;
            }

            return outputFormat.contentType.JSON;
        }

        var sendData = function (res, data, contentType) {
            res.set('Content-Type', contentType);
            res.send(outputFormat.getFormatedData(data, contentType));
        };

        var pages = ["docs", "contact", "expo", "about", "moredata"];

        pages.forEach(function (entry) {
            self.routes['/' + entry] = function (req, res) {
                self.renderPage(entry, req, res);
            };
        });

        // special, homepage mapped to /
        self.routes['/'] = function (req, res) {
            self.renderPage('homepage', req, res);
        };

        self.routes['/demo'] = function (req, res) {
            var q = req.query["q"];

            self.renderPage('demo', req, res, {'query': q});
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function () {
        self.createRoutes();
        self.app = express();

        self.app.use('/public', express.static(__dirname + '/public'));

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the application.
     */
    self.initialize = function () {
        self.setupVariables();
        self.setupTerminationHandlers();

        self.initializeMongoDb();
        // Create the express server and routes.
        self.initializeServer();

    };


    /**
     *  Start the server
     */
    self.start = function () {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function () {
            console.log('%s: Node server started on %s:%d ...',
                Date(Date.now()), self.ipaddress, self.port);
        });
    };

};


/**
 *  main():  Main code.
 */
var myApp = new MyApp();
myApp.initialize();
myApp.start();

