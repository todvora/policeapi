var request = require('request');
var cheerio = require('cheerio');


var keyTranslations = {
    "druh": "class",
    "vyrobce": "manufacturer",
    "typ": "type",
    "barva": "color",
    "spz": "regno",
    "mpz": "rpw",
    "motor": "engine",
    "rokvyroby": "productionyear",
    "nahlaseno": "stolendate"
};

var PolicieCrClient = function () {

    var self = this;

    function fixDate(date) {
        date = date.replace("ledna", "1.");
        date = date.replace("února", "2.");
        date = date.replace("března", "3.");
        date = date.replace("dubna", "4.");
        date = date.replace("května", "5.");
        date = date.replace("června", "6.");
        date = date.replace("července", "7.");
        date = date.replace("srpna", "8.");
        date = date.replace("září", "9.");
        date = date.replace("října", "10.");
        date = date.replace("listopadu", "11.");
        date = date.replace("prosince", "12.");
        date = date.replace(/\s/g, "");
        return date;
    }

    function translateKeys(info) {
        var result = {};
        for (var key in info) {
            console.log(key);
            var value = info[key];
            if(typeof keyTranslations[key] !== 'undefined') {
                result[keyTranslations[key]] = value;
            } else {
                result[key] = value;
            }
        }
        console.log(result);
        return result;
    }

    function parseSearchRow(item) {
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
        request(baseInfo.url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                $ = cheerio.load(body);
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
                info['nahlaseno'] = fixDate(info['nahlaseno']);
                details.push(translateKeys(info));
                if (details.length == items.length) {
                    callback(formatDetails(details));
                }
            } else if (error) {
                callback({"error": error.toString()});
            }
        });
    }


    self.search = function (q, callback) {
        var url = "http://aplikace.policie.cz/patrani-vozidla/default.aspx?__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=%2FwEPDwULLTEzNzIzMjY0MDMPZBYCZg9kFgICBw9kFgICAQ9kFgoCBA8PZBYCHgpvbmtleXByZXNzBTZyZXR1cm4gb25LZXlwcmVzcyhldmVudCwnY3RsMDBfQXBwbGljYXRpb25fY21kSGxlZGVqJylkAgYPD2QWAh8ABTZyZXR1cm4gb25LZXlwcmVzcyhldmVudCwnY3RsMDBfQXBwbGljYXRpb25fY21kSGxlZGVqJylkAhQPDxYEHgRUZXh0BRxDZWxrb3bDvSBwb8SNZXQgesOhem5hbcWvOiAxHgdWaXNpYmxlZ2RkAhUPDxYCHwJoZGQCGQ8PFgIfAQU%2FRGF0YWLDoXplIGJ5bGEgbmFwb3NsZWR5IGFrdHVhbGl6b3bDoW5hIDxiPjYuIHByb3NpbmNlIDIwMTI8L2I%2BZGRkE2qlXWNJcxoc8%2FLZOQEi5oKrGzs%3D&__EVENTVALIDATION=%2FwEWBQL80qOCBwLQsb3%2BBgK9peeFDwLv%2BPyjBAL4oIjjDVvi8FJppOBh8gjuF1u%2Ft7viEDtA&ctl00%24Application%24txtSPZ="
                + q + "&ctl00%24Application%24txtVIN=" + q
                + "&ctl00%24Application%24cmdHledej=Vyhledat&ctl00%24Application%24CurrentPage=1";
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                $ = cheerio.load(body);
                var items = [];
                var rows = $('table#celacr tr');
                for (var i = 1; i < rows.length; i++) {
                    var result = parseSearchRow(rows[i]);
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
            } else if(typeof error !== 'undefined'){
                callback({'error': error});
            } else {
                callback({'error': 'Web responded with HTTP code ' + response.statusCode})
            }
        })
    }

};


exports.PolicieCrClient = PolicieCrClient;
