module.exports = function(node, callback) {
  var js = 'var v = ' + node.x.v1 + node.x.op + node.x.v2;
  eval(js);
  callback(null, v);
};
