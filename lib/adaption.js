var ipaddr = require('ipaddr.js');

class LookupService {
  constructor(ip_to_label, subnet_to_label) {
    this.ip_to_label = ip_to_label;
    this.subnet_to_label = subnet_to_label;
  }

  lookup(ipstr) {
    var label = this.ip_to_label[ipstr];
    if(label) return label.slice();
    var ip = ipaddr.parse(ipstr);
    return ipaddr.subnetMatch(ip, this.subnet_to_label, ipstr, true).split('/');
  }
}

module.exports.LookupService = LookupService
