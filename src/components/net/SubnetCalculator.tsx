'use client';

import React, { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';

interface SubnetInfo {
  ip: string;
  prefix: number;
  networkAddr: string;
  broadcastAddr: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  subnetMask: string;
  wildcardMask: string;
  ipClass: string;
  binaryIp: string;
  binaryMask: string;
}

function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function numToIp(n: number): string {
  return [24, 16, 8, 0].map(shift => (n >>> shift) & 0xFF).join('.');
}

function ipClass(firstOctet: number): string {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D (Multicast)';
  return 'E (Reserved)';
}

function toBinary(ip: string): string {
  return ip.split('.')
    .map(o => parseInt(o, 10).toString(2).padStart(8, '0'))
    .join('.');
}

function calcSubnet(ipStr: string, prefix: number): SubnetInfo | null {
  const octets = ipStr.split('.');
  if (octets.length !== 4) return null;
  if (octets.some(o => isNaN(+o) || +o < 0 || +o > 255)) return null;
  if (prefix < 0 || prefix > 32) return null;

  const ipNum   = ipToNum(ipStr);
  const maskNum = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const netNum  = (ipNum & maskNum) >>> 0;
  const bcastNum = (netNum | (~maskNum >>> 0)) >>> 0;

  const totalAddresses = prefix === 32 ? 1 : prefix === 31 ? 2 : 2 ** (32 - prefix);
  const usableHosts = Math.max(0, totalAddresses - 2);

  return {
    ip: ipStr,
    prefix,
    networkAddr:   numToIp(netNum),
    broadcastAddr: numToIp(bcastNum),
    firstHost:     prefix >= 31 ? numToIp(netNum) : numToIp(netNum + 1),
    lastHost:      prefix >= 31 ? numToIp(bcastNum) : numToIp(bcastNum - 1),
    totalAddresses,
    usableHosts,
    subnetMask:   numToIp(maskNum),
    wildcardMask: numToIp(~maskNum >>> 0),
    ipClass:      ipClass(parseInt(octets[0], 10)),
    binaryIp:     toBinary(ipStr),
    binaryMask:   toBinary(numToIp(maskNum)),
  };
}

function Row({ label, value, mono = true }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-xs" style={{ color: '#5C6B8A' }}>{label}</span>
      <span
        className={`text-xs font-semibold ${mono ? 'font-mono' : ''}`}
        style={{ color: '#EDF1FA' }}>
        {value}
      </span>
    </div>
  );
}

export function SubnetCalculator() {
  const [ip, setIp] = useState('192.168.1.0');
  const [prefix, setPrefix] = useState(24);
  const [ipError, setIpError] = useState('');

  const info = useMemo(() => calcSubnet(ip, prefix), [ip, prefix]);

  const handleIpChange = (val: string) => {
    setIp(val);
    const octets = val.split('.');
    if (octets.length !== 4 || octets.some(o => isNaN(+o) || +o < 0 || +o > 255)) {
      setIpError('Invalid IPv4 address');
    } else {
      setIpError('');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4" style={{ background: '#07090F', color: '#EDF1FA' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(0,199,190,0.12)', border: '1px solid rgba(0,199,190,0.2)' }}>
          <Calculator className="w-4 h-4" style={{ color: '#00C7BE' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#EDF1FA' }}>Subnet Calculator</p>
          <p className="text-xs" style={{ color: '#5C6B8A' }}>IPv4 CIDR notation</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: '#5C6B8A' }}>
            IP Address
          </label>
          <input
            value={ip}
            onChange={e => handleIpChange(e.target.value)}
            placeholder="192.168.1.0"
            className="w-full px-3 py-2 rounded text-sm font-mono focus:outline-none"
            style={{
              background: '#111724',
              border: `1px solid ${ipError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: '#EDF1FA',
            }}
          />
          {ipError && <p className="text-[10px] mt-1" style={{ color: '#F87171' }}>{ipError}</p>}
        </div>
        <div className="shrink-0">
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: '#5C6B8A' }}>
            Prefix
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: '#5C6B8A' }}>/</span>
            <input
              type="number"
              min={0}
              max={32}
              value={prefix}
              onChange={e => setPrefix(Math.max(0, Math.min(32, parseInt(e.target.value) || 0)))}
              className="w-16 px-3 py-2 rounded text-sm font-mono text-center focus:outline-none"
              style={{
                background: '#111724',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#EDF1FA',
              }}
            />
          </div>
        </div>
      </div>

      {/* Prefix slider */}
      <div className="mb-4">
        <input
          type="range"
          min={1}
          max={32}
          value={prefix}
          onChange={e => setPrefix(parseInt(e.target.value))}
          className="w-full accent-teal-400"
          style={{ accentColor: '#00C7BE' }}
        />
        <div className="flex justify-between text-[9px] mt-0.5" style={{ color: '#3D4E6B' }}>
          <span>/1</span><span>/8</span><span>/16</span><span>/24</span><span>/32</span>
        </div>
      </div>

      {/* Results */}
      {info && !ipError ? (
        <div className="rounded-lg p-3" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#5C6B8A' }}>
            Results
          </p>

          <div className="mb-3 px-3 py-2 rounded text-center"
            style={{ background: 'rgba(0,199,190,0.06)', border: '1px solid rgba(0,199,190,0.15)' }}>
            <span className="text-lg font-mono font-bold" style={{ color: '#00C7BE' }}>
              {info.networkAddr}/{info.prefix}
            </span>
          </div>

          <Row label="Network Address"   value={info.networkAddr} />
          <Row label="Broadcast Address" value={info.broadcastAddr} />
          <Row label="First Usable Host" value={info.firstHost} />
          <Row label="Last Usable Host"  value={info.lastHost} />
          <Row label="Usable Hosts"      value={info.usableHosts.toLocaleString()} mono={false} />
          <Row label="Total Addresses"   value={info.totalAddresses.toLocaleString()} mono={false} />
          <Row label="Subnet Mask"       value={info.subnetMask} />
          <Row label="Wildcard Mask"     value={info.wildcardMask} />
          <Row label="IP Class"          value={info.ipClass} mono={false} />

          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5C6B8A' }}>Binary</p>
            <div className="font-mono text-[10px] leading-5" style={{ color: '#8899BB' }}>
              <div>IP:   <span style={{ color: '#EDF1FA' }}>{info.binaryIp}</span></div>
              <div>Mask: <span style={{ color: '#EDF1FA' }}>{info.binaryMask}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: '#5C6B8A' }}>Enter a valid IP address to see subnet info</p>
        </div>
      )}

      {/* Common subnets quick reference */}
      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#5C6B8A' }}>
          Quick Reference
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {['/24 — 254 hosts', '/23 — 510 hosts', '/22 — 1022 hosts', '/16 — 65534 hosts',
            '/28 — 14 hosts', '/30 — 2 hosts (point-to-point)', '/8 — Class A', '/0 — entire internet'].map(item => (
            <div key={item} className="px-2.5 py-1.5 rounded text-xs" style={{ background: '#111724', color: '#8899BB' }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
