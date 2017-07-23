const adaption = require('./adaption');
const classification = require('./classification');
const fs = require('fs');
const lookup = require('./lookup');
const readline = require('readline');
const collection = require('./collection');

const EMIT_INTERVAL = 10 * 60 * 1000;
const DELAY_TOLERANCE = 5 * 1000;

stream = process.stdin;

function key_function(event) {
  return event['label_src'].join('/') + '/' + event['label_dst'].join('/');
}

function present_aggregate(aggregate) {
  console.log(aggregate);
}

lookup.makeTablesAsync('eu-west-1').then(function(tables) {
  const lookup_service = new adaption.LookupService(tables['ips'], tables['prefixes']);
  const labeller = classification.labeller_factory(lookup_service);
  const lineReader = readline.createInterface({input: stream});
  const collector = new collection.IntervallingCollector(null, EMIT_INTERVAL, DELAY_TOLERANCE, key_function);
  collector.on('event', present_aggregate);
  lineReader.on('line', function (line) {
    var entry = JSON.parse(line);
    labeller(entry);
    collector.ingest(entry);
  });
});
