var fs = require("fs");
var path = require("path");

var policiecr = require("../../lib/policiecr");


describe('jasmine-node', function () {

    var client = new policiecr.client();

    // mock for page loading - load only static files provided with test
    client.setPageLoader(function (url, callback) {

        var filename = "list.html";
        if (url.indexOf("Detail.aspx?id=987654321") !== -1) {
            filename = "./detail.html";
        }

        filename = path.resolve(__dirname, filename);
        fs.readFile(filename, function (err, data) {
            if (err) throw err;
            callback(data);
        });
    });


    it("should parse stolen vehicles page", function (done) {
        client.search("WUAMMM4F58N901800", function (results) {
            expect(results.count).toEqual(1);
            expect(results.results[0].class).toEqual("osobní vozidlo");
            expect(results.results[0].manufacturer).toEqual("AUDI");
            expect(results.results[0].type).toEqual("RS 6");
            expect(results.results[0].color).toEqual("červená metalíza");
            expect(results.results[0].regno).toEqual("9Q91234");
            expect(results.results[0].rpw).toEqual("CZ");
            expect(results.results[0].vin).toEqual("WUAMMM4F58N901800");
            expect(results.results[0].engine).toEqual("ABC123DEF");
            expect(results.results[0].productionyear).toEqual("2008");
            expect(results.results[0].stolendate).toEqual("1.3.2012");
            expect(results.results[0].url).toEqual("http://aplikace.policie.cz/patrani-vozidla/Detail.aspx?id=987654321");
            done();
        });
    });
});