const http = require('http');

module.exports = function(node, callback) {
  http.get(node.x.url, function(res) {
    var html = '';
    res.on('data', function(chunk) {
      html += chunk;
    });
    res.on('end', function() {
      callback(null, html);
    });
  }).on('error', function(err) {
    callback(err, null);
  });
};
