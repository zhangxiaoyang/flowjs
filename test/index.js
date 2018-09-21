const should = require('chai').should();
const Whale = require('../whale.js');

describe('test', function() {

  it('calculator', function(done) {
    var whale = (new Whale('./template')).use('calculator');
    whale.run({ value: 2 }, function(err) {
      should.equal(err, null);
      should.equal(whale.session.y, 6);
      done();
    });
  });

  it('parallel', function(done) {
    var whale = (new Whale('./template')).use('parallel');
    whale.run({ urls: [
      'http://httpbin.org/get?test=whale',
      'http://httpbin.org/get?test=.js',
    ] }, function(err) {
      should.equal(err, null);
      should.equal(whale.session.y, 'whale.js');
      done();
    });
  });
});
