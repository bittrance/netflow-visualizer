#!/usr/bin/env node

const adaption = require('./adaption');
const argparse = require('argparse');
const classification = require('./classification');
const collection = require('./collection');
const fs = require('fs');
const lookup = require('./lookup');
const readline = require('readline');

const DEFAULT_EMIT_INTERVAL = 10 * 60 * 1000;
const DEFAULT_DELAY_TOLERANCE = 5 * 1000;

const parser = new argparse.ArgumentParser({
  version: '0.9.0',
  addHelp: true,
  description: 'Aggregate pmacct logs by time interval'
});
parser.addArgument([ '-i', '--interval' ], {
  help: 'Interval between emitting data in ms',
  type: 'int',
  defaultValue: DEFAULT_EMIT_INTERVAL,
});
parser.addArgument(['-t', '--tolerance'], {
  help: 'Maximum collector clock-skew in ms',
  type: 'int',
  defaultValue: DEFAULT_DELAY_TOLERANCE,
});

const args = parser.parseArgs(process.argv.slice(2));

stream = process.stdin;

function key_function(event) {
  return event['label_src'].join('/') + '/' + event['label_dst'].join('/');
}

function present_aggregate(aggregate) {
  console.log(`${aggregate.timestamp_emission},${aggregate.label_src.join('/')},${aggregate.label_dst.join('/')},${aggregate.packets},${aggregate.bytes}`);
}

lookup.makeTablesAsync('eu-west-1').then(function(tables) {
  const lookup_service = new adaption.LookupService(tables['ips'], tables['prefixes']);
  const labeller = classification.labellerFactory(lookup_service);
  const lineReader = readline.createInterface({input: stream});
  const collector = new collection.IntervallingCollector(null, args.interval, args.tolerance, key_function);
  collector.on('event', present_aggregate);
  lineReader.on('line', function (line) {
    var entry = JSON.parse(line);
    labeller(entry);
    collector.ingest(entry);
  });
  lineReader.on('close', function() {
    const aggregates = collector.dump();
    aggregates.forEach(present_aggregate);
  })
});
