var expect = require('chai').expect;
var classification = require('../lib/classification');
var ipaddr = require('ipaddr.js');

var entry = {
  'label': 'staging/eu-west-1c/reassembler/reasscass',
  'ip_src': '10.80.93.80',
  'ip_dst': '10.196.167.18',
  'port_src': 8301,
  'port_dst': 8301,
  'ip_proto': 'udp',
  'timestamp_arrival': '2017-05-31 13:03:48.204365',
  'packets': 6,
  'bytes': 11878
};

describe('#classifier', function() {
  beforeEach(function() {
    var LSMock = function() {}
    LSMock.prototype.lookup = function(ip_str) { return ['eu-west-1a', 'mock']; }
    this.labeller = classification.labeller_factory(new LSMock());
    this.entry = JSON.parse(JSON.stringify(entry));
  });

  it('uses lookup for non-special entries', function() {
    this.entry['ip_proto'] = 'tcp'
    this.labeller(this.entry);
    expect(this.entry['label_src']).to.deep.equal(['eu-west-1a', 'mock']);
    expect(this.entry['label_dst']).to.deep.equal(['eu-west-1a', 'mock']);
  });

  it('returns general gossip label for any udp/8301 traffic', function() {
    this.labeller(this.entry);
    expect(this.entry['label_src']).to.deep.equal(['eu-west-1a', 'konsul', 'gossip']);
    expect(this.entry['label_dst']).to.deep.equal(['eu-west-1a', 'konsul', 'gossip']);
  });
});
