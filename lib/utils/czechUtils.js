var vehiclePropertiesDictionary = {
    "druh": "class",
    "vyrobce": "manufacturer",
    "typ": "type",
    "barva": "color",
    "spz": "regno",
    "mpz": "rpw",
    "motor": "engine",
    "rokvyroby": "productionyear",
    "nahlaseno": "stolendate"
}


exports.getKeyTranslation = function (originalName) {

    if(typeof originalName === "undefined" || originalName == null) {
        throw new Error("key name must be defined");
    }

    // test if found in dictionary
    if(vehiclePropertiesDictionary.hasOwnProperty(originalName)) {
        return vehiclePropertiesDictionary[originalName];
    } else {
        return originalName;
    }
};

exports.getStandardizedDateStr = function(date) {
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