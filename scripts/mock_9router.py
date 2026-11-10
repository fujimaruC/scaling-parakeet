#!/usr/bin/env python3
"""Synthetic loopback-only 9Router. Never proxies to a provider or logs inputs."""
import argparse,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'collectors/local/src'))
from academic_os.synthetic_router import make_mock_server

def main():
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=20128);p.add_argument('--scenarios',default='valid');a=p.parse_args()
 scenarios=a.scenarios.split(',')
 if set(scenarios)-{'valid','malformed','invalid-schema','429','500','503'}:p.error('Unknown synthetic scenario')
 server,_=make_mock_server(a.port,scenarios)
 print('SYNTHETIC_LOOPBACK_READY '+str(server.server_port),flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:pass
 finally:server.server_close()
if __name__=='__main__':main()
