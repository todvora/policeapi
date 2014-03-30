var request = require('request');
var cheerio = require('cheerio');
var czechUtils = require("./utils/czechUtils");

exports.client = function () {

    var self = this;

    var loadPage = function loadPage(url, callback) {
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            } else if (typeof error !== 'undefined') {
                throw new Error('error'+ error);
            } else {
                throw new Error('error: Web responded with HTTP code ' + response.statusCode);
            }
        })
    };

    self.setPageLoader = function(loader){
        loadPage = loader;
    };

    self.search = function (searchQuery, callback) {

        var searchUrl = constructSearchUrl(searchQuery);

        loadPage(searchUrl, function (body) {
            var $ = cheerio.load(body);
            var items = [];
            var rows = $('table#celacr tr');
            for (var i = 1; i < rows.length; i++) {
                var result = parseSearchRow($, rows[i]);
                items.push(result);
            }

            // not found any
            if (items.length == 0) {
                callback(formatDetails([]));
            }

            var details = [];
            for (var i = 0; i < items.length; i++) {
                getDetails(items, i, details, callback);
            }
        });
    };

    function constructSearchUrl(query) {
        return "http://aplikace.policie.cz/patrani-vozidla/default.aspx?__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=%2FwEPDwULLTEzNzIzMjY0MDMPZBYCZg9kFgICBw9kFgICAQ9kFgoCBA8PZBYCHgpvbmtleXByZXNzBTZyZXR1cm4gb25LZXlwcmVzcyhldmVudCwnY3RsMDBfQXBwbGljYXRpb25fY21kSGxlZGVqJylkAgYPD2QWAh8ABTZyZXR1cm4gb25LZXlwcmVzcyhldmVudCwnY3RsMDBfQXBwbGljYXRpb25fY21kSGxlZGVqJylkAhQPDxYEHgRUZXh0BRxDZWxrb3bDvSBwb8SNZXQgesOhem5hbcWvOiAxHgdWaXNpYmxlZ2RkAhUPDxYCHwJoZGQCGQ8PFgIfAQU%2FRGF0YWLDoXplIGJ5bGEgbmFwb3NsZWR5IGFrdHVhbGl6b3bDoW5hIDxiPjYuIHByb3NpbmNlIDIwMTI8L2I%2BZGRkE2qlXWNJcxoc8%2FLZOQEi5oKrGzs%3D&__EVENTVALIDATION=%2FwEWBQL80qOCBwLQsb3%2BBgK9peeFDwLv%2BPyjBAL4oIjjDVvi8FJppOBh8gjuF1u%2Ft7viEDtA&ctl00%24Application%24txtSPZ="
            + query + "&ctl00%24Application%24txtVIN=" + query
            + "&ctl00%24Application%24cmdHledej=Vyhledat&ctl00%24Application%24CurrentPage=1";
    };



    function translateKeys(info) {
        var result = {};
        for (var key in info) {
            var value = info[key];
            result[czechUtils.getKeyTranslation(key)] = value;
        }
        return result;
    };

    function parseSearchRow($, item) {
        var info = {};
        var fields = $(item).find('td');
        info.url = "http://aplikace.policie.cz/patrani-vozidla/" + $(fields[1]).find('a').attr('href');
        info.spz = $(fields[1]).text().trim();
        info.vin = $(fields[3]).text().trim();
        info.vyrobce = $(fields[4]).text().trim();
        info.typ = $(fields[5]).text().trim();
        info.druh = $(fields[6]).text().trim();
        return info;
    }

    function formatDetails(details) {
        var result = {
            "results": details,
            "count": details.length,
            "time": new Date().toISOString()
        };
        return result;

    }

    function getDetails(items, i, details, callback) {

        var baseInfo = items[i];

        loadPage(baseInfo.url, function(body){

            var $ = cheerio.load(body);
            var info = {};
            info['druh'] = baseInfo['druh'];
            var rows = $("table#searchTableResults tr");
            for (var i = 1; i < rows.length; i++) {
                var item = rows[i];
                var span = $(item).find('span');
                var key = $(span).attr("id").replace("ctl00_Application_lbl", "");
                var value = $(span).text().trim();
                info[key.toLowerCase()] = value;
            }
            info['url'] = baseInfo['url'];
            info['nahlaseno'] = czechUtils.getStandardizedDateStr(info['nahlaseno']);
            details.push(translateKeys(info));
            if (details.length == items.length) {
                callback(formatDetails(details));
            }
        });
    }
};