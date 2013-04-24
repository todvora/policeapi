$(document).ready(function () {

    $(document).on("click", ".lastitem", function (event) {
        event.stopPropagation();
        event.preventDefault();
        $("#q").val($(this).text());
    });
    $.get('lastsearch', function (result) {
        var obj = JSON.parse(result);
        var output = "";
        $.each(obj, function (index, value) {
            output = output + '<a href="#" class="lastitem">' + value.vin + '</a>&nbsp;&nbsp;';
        });
        $("#lastsearch").html(output);
    });

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

    function syntaxHighlight(json) {
        if (typeof json != 'string') {
            json = JSON.stringify(json, undefined, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    var xml_special_to_escaped_one_map = {
        '&': '&amp;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;'
    };


    function encodeXml(string) {
        return string.replace(/([\&"<>])/g, function (str, item) {
            return xml_special_to_escaped_one_map[item];
        });
    };

    $("#submit").click(function () {
        var query = $("#q").val();
        var format = $('input:radio[name=format]:checked').val();
        $("#result").text("Loading...");
        var url = window.location.protocol + '//' + window.location.host + '/search?q=' + escapeHtml(query) + '&format=' + format;
        $("#url").html('API URL, which is used: <a href="' + url + '">' + url + '</a>');
        $.get(url,function (result) {
            if (format == "json") {
                var obj = JSON.parse(result);
                $("#result").html(syntaxHighlight(obj));
            } else {
                $("#result").html(encodeXml(result));
            }
        }, "text").fail(function (xhr, statusText) {
                $("#result").text("Error: " + statusText);
            });
    });
});