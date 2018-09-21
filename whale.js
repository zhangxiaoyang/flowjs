const fs = require('fs');
const _ = require('lodash');
const JSONPath = require('jsonpath');
const assert = require('assert');

/*
 * Whale
 * Initialize whale
 */
var Whale = module.exports = function(template_root) {
  this.template_root = template_root;
};

/*
 * Whale
 * Select whale graph
 */
Whale.prototype.use = function(graph_name) {
  var graph_t = require(this.template_root + '/graph/' + graph_name);
  var fx_path = this.template_root + '/fx';
  var fx = {};
  fs.readdirSync(fx_path).map(function(x) {
    var fx_name = x.replace(/\.js$/, '');
    fx[fx_name] = require(fx_path + '/' + fx_name);
  });
  this.session = {
    $fx: fx,
  };
  this.T = new WhaleTemplateResolver(this.session);
  this.graph = this.T.resolveGraph(graph_t);
  return this;
};

/*
 * Whale
 * Run the whale
 * Graph(Layers) > Node(Items) > Item
 */
Whale.prototype.run = function(input, callback) {
  var self = this;
  self.session['x'] = input;

  function runLayerLoop(layer_num) {
    var is_finish_all_layers = layer_num >= self.graph.length;
    if(is_finish_all_layers) {
      callback(null);
      return;
    }

    var nodes = self.graph[layer_num];
    var node_finish_count = 0;
    for(var node_num = 0; node_num < nodes.length; node_num++) {
      function runNodeAsync(node_num) {
        var node = nodes[node_num];
        node['x'] = _.isUndefined(node['x'])
          ? ''
          : self.T.resolveItem(node['x'], node.$getLocals(), node.$getGlobals());
        node['fx'](node, function(err, y_tmp) {
          if(err) return callback(err);

          node.$setLocals('fx', y_tmp);
          node['y'] = _.isUndefined(node['y'])
            ? y_tmp // No need to resolve value
            : self.T.resolveItem(node['y'], node.$getLocals(), node.$getGlobals());
          node.$setLocals('y', node['y']);
          node.$setGlobals('y', node['y']); // Overwrite to globals

          node_finish_count++;
          if(node_finish_count >= nodes.length) {
            runLayerLoop(layer_num + 1);
          }
        });
      }

      runNodeAsync(node_num);
    }
  }

  runLayerLoop(0);
};

/*
 * WhaleTemplateResolver
 * Init WhaleTemplateResolver with a created session
 */
var WhaleTemplateResolver = function(session) {
  this.session = session;
};

/*
 * WhaleTemplateResolver
 * Resolve whale graph_t to graph
 */
WhaleTemplateResolver.prototype.resolveGraph = function(graph_t) {
  var graph = [];
  var layers_t = graph_t;
  for(var i = 0; i < layers_t.length; i++) {
    var nodes_t = layers_t[i];

    var layer = [];
    for(var j = 0; j < nodes_t.length; j++) {
      var node_t = nodes_t[j];
      var node = this.resolveNode(node_t);
      layer.push(node);
    }
    graph.push(layer);
  }
  return graph;
};

/*
 * WhaleTemplateResolver
 * Resolve whale node_t to node
 */
WhaleTemplateResolver.prototype.resolveNode = function(node_t) {
  var self = this;

  var fx_predefined = _.isString(node_t['fx']);
  var node_id = 'node_' + (new Date()).getTime() + '_' + Math.floor(Math.random()*1000);
  node_id = node_t['id'] || node_id;

  var node = {
    id: node_t['id'],
    x: node_t['x'], // Defer resolving
    y: node_t['y'], // Defer resolving
    fx: (fx_predefined
      ? self.session['$fx'][node_t['fx']] // Use pre-defined fx
      : node_t['fx'] // Use user-defined fx
    ) || function(n, c) { c(null, null); },
    $setLocals: function(k, v) {
      if(!self.session[node_id]) {
        self.session[node_id] = {};
      }
      self.session[node_id][k] = v;
    },
    $setGlobals: function(k, v) {
      if(!_.isUndefined(self.session[k])) {
        console.warn('Globals is overwritten: [' + k + '] ' + self.session[k] + '->' + v);
      }
      self.session[k] = v;
    },
    $getLocals: function() {
      return self.session[node_id];
    },
    $getGlobals: function() {
      return self.session;
    },
  };
  return node;
};

/*
 * WhaleTemplateResolver
 * Resolve whale item_t to item
 */
WhaleTemplateResolver.prototype.resolveItem = function(item_t, locals, globals) {
  var $q = function() {
    var _locals = arguments[0];
    var _jsonpath = arguments[1];
    var _default_value = arguments[2];
    var _v = JSONPath.value.apply(JSONPath, [_locals, _jsonpath]);
    return _.isUndefined(_v) ? _default_value : _v;
  };

  var js = 'var item = ' + item_t.
    replace(/\$\$\(\'\'\)/g, '$q(globals, \"$\")').
    replace(/\$\$\(/g, '$q(globals, \'$.\' + ').
    replace(/\$\(\'\'\)/g, '$q(locals, \"$\")').
    replace(/\$\(/g, '$q(locals, \'$.\' + ');

  try {
    eval(js);
    return item;
  } catch(err) {
    console.log(err.stack);
    process.exit(1);
  }
};
