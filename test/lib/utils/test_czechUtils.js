var utils = require("../../../lib/utils/czechUtils");

exports.testVehiclePropertyTranslations = function (test) {

    test.equal(utils.getKeyTranslation("vyrobce"), "manufacturer");


    test.equal(utils.getKeyTranslation("--unknownKey--"), "--unknownKey--");


    test.throws(function () {
        utils.getKeyTranslation();
    });

    test.throws(function () {
        utils.getKeyTranslation(null);
    });

    test.done();
}

exports.getStandardizedDateStr = function (test) {
    test.equal(utils.getStandardizedDateStr("1. ledna 2013"), "1.1.2013");
    test.equal(utils.getStandardizedDateStr("1.   ledna   2013"), "1.1.2013");
    test.equal(utils.getStandardizedDateStr("31.prosince 2013"), "31.12.2013");
    test.done();
}