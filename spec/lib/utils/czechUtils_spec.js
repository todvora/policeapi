var utils = require("../../../lib/utils/czechUtils");

describe('jasmine-node', function () {
    it("should translate czech labels to english", function (done) {
        expect(utils.getKeyTranslation("vyrobce")).toEqual("manufacturer");
        expect(utils.getKeyTranslation("--unknownKey--")).toEqual("--unknownKey--");
        expect(utils.getKeyTranslation("vyrobce")).toEqual("manufacturer");
        done();
    });

    it("should throw exception on invalid label params", function (done) {
        var noparam = function () {
            return utils.getKeyTranslation();
        };
        var nullparam = function () {
            return utils.getKeyTranslation(null);
        };

        expect(noparam).toThrow();
        expect(nullparam).toThrow();
        done();
    });

    it("should standardize czech dates", function (done) {
        expect(utils.getKeyTranslation(utils.getStandardizedDateStr("1. ledna 2013"))).toEqual("1.1.2013");
        expect(utils.getKeyTranslation(utils.getStandardizedDateStr("1.   ledna   2013"))).toEqual("1.1.2013");
        expect(utils.getKeyTranslation(utils.getStandardizedDateStr("31.prosince 2013"))).toEqual("31.12.2013");

        // no czech month name, date should not be modified
        expect(utils.getKeyTranslation(utils.getStandardizedDateStr("31.12.2013"))).toEqual("31.12.2013");
       done();
    });
});