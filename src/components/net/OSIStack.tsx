'use client';

import React, { useState } from 'react';

interface LayerInfo {
  number: number;
  name: string;
  shortDesc: string;
  protocols: string[];
  pdu: string;
  detail: string;
  color: string;
}

const LAYERS: LayerInfo[] = [
  {
    number: 7,
    name: 'Application',
    shortDesc: 'User-facing protocols',
    protocols: ['HTTP/HTTPS', 'DNS', 'SMTP', 'FTP', 'SSH', 'WebSocket'],
    pdu: 'Data',
    detail: `The Application layer is where user-facing protocols live. It provides the interface between applications and the underlying network services.

**HTTP/HTTPS** powers the web. **DNS** translates domain names to IPs. **SMTP** handles email delivery.

This layer doesn't handle routing or reliability — it relies on lower layers for that. It defines the *semantics* of the data exchange (what a request means, what a response looks like).`,
    color: '#7C3AED',
  },
  {
    number: 6,
    name: 'Presentation',
    shortDesc: 'Encoding, encryption, compression',
    protocols: ['SSL/TLS', 'MIME', 'ASCII', 'JPEG', 'MPEG'],
    pdu: 'Data',
    detail: `The Presentation layer translates data between the network format and the application format.

Responsibilities:
- **Encryption/decryption** — TLS operates here before handing data to HTTP
- **Compression** — GZIP compresses data before transmission
- **Encoding** — converts between character sets (UTF-8, ASCII)
- **Data serialization** — JSON, XML, Protocol Buffers

In practice, in modern TCP/IP stacks this layer is often folded into the application layer.`,
    color: '#2563EB',
  },
  {
    number: 5,
    name: 'Session',
    shortDesc: 'Connection management',
    protocols: ['RPC', 'NetBIOS', 'SOCKS'],
    pdu: 'Data',
    detail: `The Session layer establishes, manages, and terminates sessions between applications.

A "session" is a persistent two-way connection. It handles:
- **Session establishment** — authentication, authorisation
- **Synchronisation** — checkpoints so long transfers can resume
- **Dialog control** — half-duplex vs full-duplex communication

In modern web applications, sessions are usually managed at the Application layer (cookies, JWT tokens).`,
    color: '#0891B2',
  },
  {
    number: 4,
    name: 'Transport',
    shortDesc: 'Reliable delivery, port addressing',
    protocols: ['TCP', 'UDP', 'QUIC', 'SCTP'],
    pdu: 'Segment (TCP) / Datagram (UDP)',
    detail: `The Transport layer provides end-to-end communication between processes (identified by **port numbers**).

**TCP** (Transmission Control Protocol):
- Reliable, ordered delivery
- Flow control and congestion control
- 3-way handshake before data transfer
- Use for HTTP, databases, file transfer

**UDP** (User Datagram Protocol):
- No reliability guarantees — fire and forget
- No connection setup — lower latency
- Use for DNS, video streaming, gaming, VoIP

**QUIC** (HTTP/3): UDP-based with reliability built in at the application level.`,
    color: '#059669',
  },
  {
    number: 3,
    name: 'Network',
    shortDesc: 'Routing, logical addressing',
    protocols: ['IPv4', 'IPv6', 'ICMP', 'OSPF', 'BGP'],
    pdu: 'Packet',
    detail: `The Network layer handles **logical addressing** (IP addresses) and **routing** packets across multiple networks.

**IP addresses** identify devices globally. Routers operate at Layer 3 — they examine the destination IP in each packet and forward it toward the destination.

**Routing protocols** (OSPF, BGP) let routers share topology information and build routing tables automatically.

**ICMP** (Internet Control Message Protocol) handles diagnostics — it's what \`ping\` and \`traceroute\` use.

Unlike Layer 2 (which operates within one network segment), Layer 3 enables communication across the entire internet.`,
    color: '#D97706',
  },
  {
    number: 2,
    name: 'Data Link',
    shortDesc: 'Node-to-node, MAC addressing',
    protocols: ['Ethernet', 'Wi-Fi (802.11)', 'ARP', 'PPP'],
    pdu: 'Frame',
    detail: `The Data Link layer handles **node-to-node** data transfer on the same network segment. It uses **MAC addresses** (hardware-burned 48-bit IDs) rather than IP addresses.

**Ethernet frames** contain the source MAC, destination MAC, and a payload (usually an IP packet).

**ARP** (Address Resolution Protocol) translates IP addresses to MAC addresses on a local network: "Who has 192.168.1.1? Tell me your MAC address."

**Switches** operate at Layer 2 — they forward frames based on MAC address tables built from observed traffic.

This layer also handles **error detection** (CRC checksums), though not correction.`,
    color: '#DC2626',
  },
  {
    number: 1,
    name: 'Physical',
    shortDesc: 'Bits over the wire',
    protocols: ['Ethernet PHY', 'Wi-Fi RF', 'Fiber optic', 'USB'],
    pdu: 'Bit',
    detail: `The Physical layer transmits raw **bits** over a physical medium — electrical signals, light pulses, or radio waves.

It defines:
- **Connectors** (RJ45, SFP, USB-C)
- **Transmission media** (copper cable, fiber, air)
- **Signal encoding** — how 0s and 1s are represented as voltage levels or light pulses
- **Bit rate** — bandwidth in bits per second
- **Duplex** — half (one direction at a time) vs full (both simultaneously)

This layer has no concept of "addresses" or "packets" — it's purely about getting bits from point A to point B reliably.`,
    color: '#7F1D1D',
  },
];

export function OSIStack() {
  const [activeLayer, setActiveLayer] = useState<number | null>(null);

  const active = activeLayer !== null ? LAYERS.find(l => l.number === activeLayer) : null;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#07090F', color: '#EDF1FA' }}>

      {/* Left: Stack visualization */}
      <div className="flex flex-col justify-center p-4 overflow-y-auto" style={{ width: '45%', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#5C6B8A' }}>
          OSI Model — click a layer
        </p>

        {/* Sender label */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px]" style={{ color: '#5C6B8A' }}>Sender</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[10px]" style={{ color: '#5C6B8A' }}>Encapsulation ↓</span>
        </div>

        {LAYERS.map(layer => (
          <button
            key={layer.number}
            onClick={() => setActiveLayer(activeLayer === layer.number ? null : layer.number)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left transition-all cursor-pointer group"
            style={{
              background: activeLayer === layer.number
                ? `${layer.color}20`
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${activeLayer === layer.number ? layer.color + '40' : 'rgba(255,255,255,0.06)'}`,
            }}>

            {/* Layer number badge */}
            <span
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: layer.color + '30', color: layer.color }}>
              {layer.number}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: activeLayer === layer.number ? '#EDF1FA' : '#8899BB' }}>
                  {layer.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#5C6B8A' }}>
                  {layer.pdu}
                </span>
              </div>
              <p className="text-xs truncate" style={{ color: '#5C6B8A' }}>{layer.shortDesc}</p>
            </div>

            <span className="text-[10px] font-mono truncate max-w-[100px] hidden sm:block" style={{ color: '#3D4E6B' }}>
              {layer.protocols.slice(0, 2).join(', ')}
            </span>
          </button>
        ))}

        {/* Receiver label */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px]" style={{ color: '#5C6B8A' }}>De-encapsulation ↑</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[10px]" style={{ color: '#5C6B8A' }}>Receiver</span>
        </div>
      </div>

      {/* Right: Detail panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {active ? (
          <div>
            {/* Layer header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: active.color + '20', color: active.color, border: `1px solid ${active.color}30` }}>
                {active.number}
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: '#EDF1FA' }}>
                  Layer {active.number}: {active.name}
                </p>
                <p className="text-sm" style={{ color: '#5C6B8A' }}>{active.shortDesc}</p>
              </div>
            </div>

            {/* Protocols */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#5C6B8A' }}>
                Key Protocols & Technologies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {active.protocols.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded-full text-xs font-mono"
                    style={{ background: active.color + '15', color: active.color, border: `1px solid ${active.color}25` }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* PDU */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
              style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs" style={{ color: '#5C6B8A' }}>PDU (Protocol Data Unit):</span>
              <span className="text-xs font-semibold font-mono" style={{ color: '#EDF1FA' }}>{active.pdu}</span>
            </div>

            {/* Detail text */}
            <div className="text-sm leading-relaxed space-y-3" style={{ color: '#8899BB' }}>
              {active.detail.split('\n\n').map((para, i) => (
                <p key={i} style={{ color: para.startsWith('**') ? '#EDF1FA' : '#8899BB' }}>
                  {para.split(/\*\*(.*?)\*\*/g).map((chunk, j) =>
                    j % 2 === 1
                      ? <strong key={j} style={{ color: '#EDF1FA' }}>{chunk}</strong>
                      : chunk
                  )}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,199,190,0.08)', border: '1px solid rgba(0,199,190,0.15)' }}>
              <span className="text-2xl">🌐</span>
            </div>
            <div>
              <p className="font-semibold mb-1" style={{ color: '#EDF1FA' }}>Click any layer</p>
              <p className="text-sm" style={{ color: '#5C6B8A' }}>
                Select a layer to see its role, protocols, and how it fits in the stack.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
