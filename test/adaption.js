var adaption = require('../lib/adaption');
var expect = require('chai').expect;
var ipaddr = require('ipaddr.js');

var event = {
  'event_type': 'purge',
  'label': 'staging/eu-west-1c/reassembler/reasscass',
  'ip_src': '10.80.93.80',
  'ip_dst': '10.196.167.18',
  'port_src': 8301,
  'port_dst': 57148,
  'ip_proto': 'tcp',
  'timestamp_start': '2017-05-31 12:58:46.641000',
  'timestamp_end': '2017-05-31 12:58:46.646000',
  'timestamp_arrival': '2017-05-31 13:03:48.204365',
  'packets': 6,
  'bytes': 11878
};

var visualizer_packet = {
  'env': 'staging',
  'src': 'reassembler/reasscass/c',
  'dst': 'konsul/konsul/a',
  'timestamp': '2017-05-31 13:03:48.204365',
  'packets': 6,
  'bytes': 11878
};

var ip_to_label = {
  '10.80.93.80': ['staging', 'eu-west-1c', 'reassembler', 'reasscass'],
  '10.196.167.18': ['staging', 'eu-west-1a', 'konsul', 'konsul'],
  '34.6.7.8': ['exact', 'match'],
};

var subnet_to_label = {
  'public/s3': [
    ipaddr.parseCIDR('34.0.0.0/8'),
  ],
};

describe('LookupService', function() {
  before(function() {
    this.service = new adaption.LookupService(ip_to_label, subnet_to_label);
  });

  describe('#lookup', function() {
    it('returns looked up ip when no match is found', function() {
      expect(this.service.lookup('1.2.3.4')).to.deep.equal(['1.2.3.4']);
    });

    it('looks up ip address in provided table', function() {
      expect(this.service.lookup('10.80.93.80')).to.deep.equal(['staging', 'eu-west-1c', 'reassembler', 'reasscass']);
    });

    it('matches addresses against provided net prefixes', function() {
      expect(this.service.lookup('34.5.6.7')).to.deep.equal(['public', 's3']);
    });

    it('prefers exact matches (without prefix-length) before prefixes', function() {
      expect(this.service.lookup('34.6.7.8')).to.deep.equal(['exact', 'match']);
    });

    it('returns copy of label', function() {
      this.service.lookup('34.6.7.8').splice(0, 1);
      expect(this.service.lookup('34.6.7.8')).to.deep.equal(['exact', 'match']);
    });
  });
});
