var ipaddr = require('ipaddr.js');

EC2_DNS = ipaddr.parseCIDR('172.16.0.23/32');
EC2_CLASSIC_NET = ipaddr.parseCIDR('10.0.0.0/8');

function labeller_factory(lookup_service) {
  return function(entry) {
    entry['label_src'] = lookup_service.lookup(entry['ip_src']);
    entry['label_dst'] = lookup_service.lookup(entry['ip_dst']);
    var env = entry['label'].split('/')[0];
    var src = ipaddr.parse(entry['ip_src']);
    var dst = ipaddr.parse(entry['ip_dst']);
    if(src.kind() == 'ipv4' && dst.kind() == 'ipv4') {
      if(entry['ip_proto'] == 'udp' && entry['port_src'] == 8301 && entry['port_dst'] == 8301) {
        entry['label_src'].splice(1, 2, 'konsul', 'gossip');
        entry['label_dst'].splice(1, 2, 'konsul', 'gossip');
      } else if(src.match.apply(src, EC2_DNS)) {
        entry['label_src'] = [env, 'ec2', 'dns'];
      } else if(dst.match.apply(dst, EC2_DNS)) {
        entry['label_dst'] = [env, 'ec2', 'dns'];
      }
    }
  };
}

module.exports.labeller_factory = labeller_factory;
