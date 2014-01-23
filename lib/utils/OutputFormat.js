
exports.contentType = {
    XML: "text/xml",
    JSON: "text/javascript"
};

exports.getFormatedData = function(data, contentType) {
    if (exports.contentType.XML == contentType) {
        var output = '<?xml version="1.0" encoding="UTF-8"?>';
        output = output + '\n' + require('easyxml').render(data);
        return output;
    } else {
        return JSON.stringify(data);
    }
};
