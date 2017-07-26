const EventEmitter = require('events');

function aggregate(aggregations, key, event) {
  if(aggregations[key]) {
    aggregations[key]['bytes'] += event['bytes'];
    aggregations[key]['packets'] += event['packets'];
  } else {
    aggregations[key] = Object.assign({}, event);
    aggregations[key]['key'] = key;
  }
}

function add_emission_time(aggregation, emission_time) {
  aggregation['timestamp_emission'] = new Date(emission_time)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '000');
}

class IntervallingCollector extends EventEmitter {
  constructor(start_time, emit_interval, delay_tolerance, key_function) {
    super();
    this.emit_interval = emit_interval;
    this.delay_tolerance = delay_tolerance;
    this.previous_emission_time = start_time;
    this.current_aggregation = {};
    this.next_aggregation = {};
    this.key_function = key_function;
  }

  ingest(event) {
    const ts = Date.parse(event['timestamp_arrival'] + 'Z');
    if(!this.previous_emission_time) {
      this.previous_emission_time = ts;
    }

    if(ts < this.previous_emission_time) {

    } else if(ts > this.previous_emission_time + this.emit_interval + this.delay_tolerance) {
      aggregate(this.next_aggregation, this.key_function(event), event);
    } else {
      aggregate(this.current_aggregation, this.key_function(event), event);
    }

    if(ts > this.previous_emission_time + this.emit_interval + this.delay_tolerance) {
      while(ts > this.previous_emission_time + this.emit_interval) {
        this.previous_emission_time += this.emit_interval;
      }
      for(var key in this.current_aggregation) {
        add_emission_time(this.current_aggregation[key], this.previous_emission_time);
        this.emit('event', this.current_aggregation[key]);
      }
      this.current_aggregation = this.next_aggregation;
      this.next_aggregation = {};
    }
  }

  dump() {
    const values = [];
    for(var key in this.current_aggregation) {
      add_emission_time(this.current_aggregation[key], this.previous_emission_time);
      values.push(this.current_aggregation[key]);
    }
    return values;
  }
}

module.exports.IntervallingCollector = IntervallingCollector
