var policiecr = require('../../lib/policiecr');


exports.setUp = function (callback) {

    this.service = new policiecr.PolicieCrClient();
    callback();
};

exports.testKeyTranslations = function (test) {
    test.expect(1);
    console.log(policiecr);
    test.equal(policiecr.fixDate("1. ledna 1970"), "1.1.1970");






    test.done();


};