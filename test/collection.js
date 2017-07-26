var expect = require('chai').expect;
var collection = require('../lib/collection');

var START_TIME = 1000000;
var EMIT_INTERVAL = 3600;
var DELAY_TOLERANCE = 60;

function date_input_format(epoch_time) {
  return new Date(epoch_time)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '000');
}

function make_event(delta, start_time) {
  if(!start_time) start_time = START_TIME;
  if(!delta) delta = 0;
  return {
    'event_type': 'purge',
    'label': 'staging/eu-west-1b/reassembler/reasscass',
    'ip_src': '10.99.173.121',
    'ip_dst': '10.193.160.41',
    'port_src': 8301,
    'port_dst': 8301,
    'ip_proto': 'udp',
    'timestamp_start': '2017-05-31 13:05:34.719000',
    'timestamp_end': '2017-05-31 13:11:13.609000',
    'timestamp_arrival': date_input_format(start_time + delta),
    'packets': 7,
    'bytes': 1093,
    'label_src': [ 'src' ],
    'label_dst': [ 'dst' ]
  };
}

function make_another_event(delta) {
  var event = make_event(delta);
  event['packets'] = 5;
  event['bytes'] = 1001;
  event['label_src'] = 'other_src';
  return event;
}

function key_function(event) {
  return event['label_src'] + '/' + event['label_dst'];
}

describe('Collector', function() {
  beforeEach(function() {
    this.emitted = emitted = [];
    this.collector = new collection.IntervallingCollector(START_TIME, EMIT_INTERVAL, DELAY_TOLERANCE, key_function);
    this.collector.on('event', function(aggregate) { emitted.push(aggregate); });
  });

  it('emits nothing before interval + tolerance has passed', function() {
    this.collector.ingest(make_event());
    this.collector.ingest(make_event(EMIT_INTERVAL + DELAY_TOLERANCE));
    expect(this.emitted).to.deep.equal([]);
  });

  it('emits aggregate when ingestion time > interval + tolerance', function() {
    this.collector.ingest(make_event());
    this.collector.ingest(make_event(EMIT_INTERVAL + DELAY_TOLERANCE));
    this.collector.ingest(make_event(EMIT_INTERVAL + DELAY_TOLERANCE + 1));
    expect(this.emitted.length).to.equal(1);
    expect(this.emitted[0]).to.include({
      'packets': 7 * 2,
      'bytes': 1093 * 2,
      'timestamp_emission': date_input_format(START_TIME + EMIT_INTERVAL)
    });
  });

  it('ignores events older than those already emitted', function(done) {
    this.collector.ingest(make_event(EMIT_INTERVAL + DELAY_TOLERANCE + 1));
    this.collector.ingest(make_another_event(EMIT_INTERVAL - 1));
    this.collector.ingest(make_another_event(EMIT_INTERVAL));
    this.collector.ingest(make_event(EMIT_INTERVAL * 2 + DELAY_TOLERANCE + 1));
    for(var n in this.emitted) {
      if(this.emitted[n]['key'] == 'other_src/dst') {
        expect(this.emitted[n]).to.include({'packets': 5});
        done();
      }
    }
  });

  it('learns start time from first ingested event if not given', function() {
    const start_time = new Date().getTime();
    const emitted = [];
    const collector = new collection.IntervallingCollector(null, EMIT_INTERVAL, DELAY_TOLERANCE, key_function);
    collector.on('event', function(aggregate) { emitted.push(aggregate); });
    collector.ingest(make_event(0, start_time));
    collector.ingest(make_event(EMIT_INTERVAL + EMIT_INTERVAL, start_time));
    expect(emitted.length).to.equal(1);
    expect(emitted[0]).to.include({'key': 'src/dst', 'bytes': 1093});
  });

  it('emits aggregate even when separate key has ingestion time > interval + tolerance', function() {
    this.collector.ingest(make_event());
    this.collector.ingest(make_event(EMIT_INTERVAL + DELAY_TOLERANCE));
    this.collector.ingest(make_another_event(EMIT_INTERVAL + DELAY_TOLERANCE + 1));
    expect(this.emitted.length).to.equal(1);
    expect(this.emitted[0]).to.include({'key': 'src/dst', 'bytes': 1093 * 2});
  });

  it('emits subsequent aggregate when ingestion time > 2 * interval + tolerance', function() {
    this.collector.ingest(make_event());
    this.collector.ingest(make_event(EMIT_INTERVAL + DELAY_TOLERANCE + 1));
    this.emitted.length = 0;
    this.collector.ingest(make_event(EMIT_INTERVAL * 2 + DELAY_TOLERANCE + 1));
    expect(this.emitted.length).to.equal(1);
    expect(this.emitted[0]).to.include({'key': 'src/dst', 'bytes': 1093});
  });

  it('emits multiple aggregates when some key has ingestion time > interval + tolerance', function() {
    this.collector.ingest(make_event());
    this.collector.ingest(make_another_event());
    this.collector.ingest(make_event(EMIT_INTERVAL + DELAY_TOLERANCE));
    this.collector.ingest(make_another_event(EMIT_INTERVAL + DELAY_TOLERANCE + 1));
    expect(this.emitted.length).to.equal(2);
    for(var n in this.emitted) {
      if(this.emitted[n]['key'] == 'src/dst') {
        expect(this.emitted[n]).to.include({'key': 'src/dst', 'bytes': 1093 * 2});
      } else if(this.emitted[n]['key'] == 'other_src/dst') {
        expect(this.emitted[n]).to.include({'key': 'other_src/dst', 'bytes': 1001});
      }
      else {
        expect.fail('Unexpected key ' + this.emitted[n]['key']);
      }
    }
  });

  it('handles gaps in input > emit_interval', function() {
    this.collector.ingest(make_event());
    this.collector.ingest(make_event(EMIT_INTERVAL * 10));
    expect(this.emitted.length).to.equal(1);
    this.emitted.length = 0;
    this.collector.ingest(make_event(EMIT_INTERVAL * 10 + 1));
    expect(this.emitted.length).to.equal(0);
  });

  it('allows dumping its ongoing aggregations', function() {
    this.collector.ingest(make_event());
    this.collector.ingest(make_another_event());
    const aggregates = this.collector.dump();
    expect(aggregates.length).to.equal(2);
    expect(aggregates[0]).to.include({'key': 'src/dst'});
    expect(aggregates[1]).to.include({'key': 'other_src/dst'});
  });
});
