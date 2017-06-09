var AWS  = require('aws-sdk');
var Promise = require('bluebird');
var http  = require('http');
var https = require('https');
var ipaddr = require('ipaddr.js');
var url = require('url');

var https_requestAsync = Promise.method(function(options) {
  return new Promise(function(resolve, reject) {
    https.request(options, function(res) {
      var str = '';
      res.on('data', function(chunk) { str += chunk; });
      res.on('end', function() { resolve(JSON.parse(str)); });
    })
    .on('error', reject)
    .end();
  });
});

function one_reservation(acc, res) {
  res['Instances'].forEach(function(instance) {
    var tags = instance['Tags'].reduce(function(tacc, tag) {
      tacc[tag['Key']] = tag['Value'];
      return tacc;
    }, {});
    acc[instance['PrivateIpAddress']] = [
      instance['Placement']['AvailabilityZone'],
      tags['Service'],
      tags['Role']
    ];
  });
  return acc;
}

function one_interface(acc, intf) {
  if(intf['Attachment']['InstanceOwnerId'] == 'amazon-elb') {
    acc[intf['PrivateIpAddress']] = [
      intf['AvailabilityZone'],
      'elb',
      intf['Description'].replace('ELB ', '')
    ];
  }
  return acc;
}

function one_prefix(acc, prefix_entry) {
  var key = prefix_entry['region'].toLowerCase() + '/' + prefix_entry['service'].toLowerCase();
  if(acc[key] == undefined) {
    acc[key] = []
  }
  acc[key].push(ipaddr.parseCIDR(prefix_entry['ip_prefix']));
  return acc;
}

function makeTablesAsync(region) {
  var public_ips_request = new url.URL('https://ip-ranges.amazonaws.com/ip-ranges.json');
  var ec2 = Promise.promisifyAll(new AWS.EC2({'region': region}));

  return Promise.all([
    ec2.describeInstancesAsync(null),
    ec2.describeNetworkInterfacesAsync(null),
    https_requestAsync(public_ips_request),
  ]).then(function(results) {
    var reservations = results[0]['Reservations'];
    var interfaces = results[1]['NetworkInterfaces'];
    var public_prefixes = results[2]['prefixes'];
    var lookup_table = {};
    var prefix_table = {};
    reservations.reduce(one_reservation, lookup_table);
    interfaces.reduce(one_interface, lookup_table);
    public_prefixes.reduce(one_prefix, prefix_table);

    return {
      'ips': lookup_table,
      'prefixes': prefix_table
    };
  });
}

module.exports.makeTablesAsync = makeTablesAsync;
