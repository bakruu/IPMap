from scapy.all import sniff, IP
import threading
import time
from geoip import GeoIP

class PacketSniffer:
    def __init__(self, callback):
        self.callback = callback
        self.geoip = GeoIP()
        self.running = False
        self.seen_ips = set()
        self.ignored_ips = {
            '208.95.112.1', # ip-api.com
            '127.0.0.1',
            '0.0.0.0'
        }

    def process_packet(self, packet):
        if IP in packet:
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            
            if src_ip in self.ignored_ips or dst_ip in self.ignored_ips:
                return
            
            # Simple filter to ignore local traffic (approximate)
            # You might want to improve this to detect actual local interface IP
            if src_ip.startswith("127.") or src_ip.startswith("192.168.") or src_ip.startswith("10."):
                target_ip = dst_ip
                direction = "outbound"
            else:
                target_ip = src_ip
                direction = "inbound"

            if target_ip not in self.seen_ips:
                # Check if target_ip is private before querying
                if target_ip.startswith("127.") or target_ip.startswith("192.168.") or target_ip.startswith("10."):
                    return

                # self.seen_ips.add(target_ip) # Uncomment to only show unique IPs once
                location = self.geoip.get_location(target_ip)
                if location:
                    data = {
                        'src': src_ip,
                        'dst': dst_ip,
                        'direction': direction,
                        'location': location
                    }
                    self.callback(data)

    def start(self):
        self.running = True
        # filter="ip" captures all IP traffic. 
        # store=0 avoids keeping packets in memory.
        thread = threading.Thread(target=self._sniff_thread)
        thread.daemon = True
        thread.start()

    def _sniff_thread(self):
        print("Starting packet sniffer...")
        try:
            sniff(filter="ip", prn=self.process_packet, store=0)
        except Exception as e:
            print(f"Sniffer error: {e}")
            print("Make sure Npcap is installed and you are running as Administrator.")

    def stop(self):
        self.running = False
