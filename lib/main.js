var adaption = require('./adaption');
var classification = require('./classification');
var fs = require('fs');
var lookup = require('./lookup');
var readline = require('readline');

stream = process.stdin

lookup.makeTablesAsync('eu-west-1').then(function(tables) {
  var lookup_service = new adaption.LookupService(tables['ips'], tables['prefixes']);
  var labeller = classification.labeller_factory(lookup_service);
  var lineReader = readline.createInterface({input: stream});
  lineReader.on('line', function (line) {
    var entry = JSON.parse(line);
    labeller(entry);
    console.log(entry);
  });
});
