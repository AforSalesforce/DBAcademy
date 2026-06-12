export interface NetLesson {
  id: string;
  title: string;
  content: string;
  tool?: 'subnet' | 'osi' | 'dns';
}

export interface NetModule {
  id: string;
  title: string;
  lessons: NetLesson[];
}

export const NET_CURRICULUM: NetModule[] = [
  {
    id: 'net-1',
    title: 'Module 1: Network Fundamentals',
    lessons: [
      {
        id: 'net-1-1',
        title: 'The OSI Model',
        content: `
# The OSI Model

The **Open Systems Interconnection (OSI) model** is a conceptual framework that divides network communication into **7 layers**, each with a specific responsibility.

## Why It Matters
It gives engineers a shared vocabulary. When a packet doesn't arrive, you diagnose from the bottom up: "Is Layer 1 (physical) connected? Is Layer 3 (network) routing correctly?"

## The 7 Layers

| # | Name | Examples |
|---|------|---------|
| 7 | Application | HTTP, DNS, SMTP, FTP |
| 6 | Presentation | SSL/TLS, JPEG, MPEG |
| 5 | Session | RPC, NetBIOS |
| 4 | Transport | TCP, UDP |
| 3 | Network | IP, ICMP |
| 2 | Data Link | Ethernet, Wi-Fi (802.11), ARP |
| 1 | Physical | Cables, fiber, radio signals |

## Data Flow
When you send an HTTP request, data travels **down** the layers (encapsulation), across the network, then **up** the layers on the receiver's side (de-encapsulation).

Each layer adds its own header (and sometimes trailer) to the data.

**Click a layer in the interactive model on the right to see more detail.**
        `,
        tool: 'osi',
      },
      {
        id: 'net-1-2',
        title: 'IP Addresses & Subnets',
        content: `
# IP Addresses & Subnets

An **IPv4 address** is a 32-bit number written as four octets: \`192.168.1.10\`.

## CIDR Notation
A subnet is written as \`IP/prefix\`. The prefix length tells you how many bits belong to the **network** part.

\`\`\`
10.0.0.0/24  →  255.255.255.0
              →  256 addresses (254 usable hosts)
\`\`\`

## Reserved Addresses
In any subnet, two addresses are reserved:
- **Network address** — all host bits are 0 (e.g., 192.168.1.0)
- **Broadcast address** — all host bits are 1 (e.g., 192.168.1.255)

Usable hosts = 2^(32 - prefix) - 2

## Private Ranges (RFC 1918)
| Range | Prefix | Use |
|-------|--------|-----|
| 10.0.0.0/8 | /8 | Large private networks |
| 172.16.0.0/12 | /12 | Medium networks |
| 192.168.0.0/16 | /16 | Home/small office |

**Try the Subnet Calculator on the right!**
        `,
        tool: 'subnet',
      },
      {
        id: 'net-1-3',
        title: 'DNS Resolution',
        content: `
# DNS Resolution

**DNS (Domain Name System)** translates human-readable names like \`example.com\` into IP addresses like \`93.184.216.34\`.

## Resolution Process

1. **Browser cache** — did I look this up recently?
2. **OS cache / /etc/hosts** — local override?
3. **Recursive resolver** (usually your ISP or 8.8.8.8)
4. **Root nameservers** — "who handles .com?"
5. **TLD nameservers** — "who handles example.com?"
6. **Authoritative nameserver** — "example.com = 93.184.216.34"

The answer is cached at each level for the **TTL** (time-to-live) duration.

## Record Types
| Type | Purpose | Example |
|------|---------|---------|
| A | IPv4 address | example.com → 93.184.216.34 |
| AAAA | IPv6 address | example.com → 2606:2800:... |
| CNAME | Alias | www.example.com → example.com |
| MX | Mail server | example.com → mail.example.com |
| TXT | Arbitrary text | SPF, DKIM, verification |

## Why DNS Can Be Slow
The first lookup for a domain takes 50–200 ms across 4–6 network round-trips. Caching eliminates subsequent trips for the TTL duration.
        `,
        tool: 'osi',
      },
    ],
  },
  {
    id: 'net-2',
    title: 'Module 2: Transport & Application',
    lessons: [
      {
        id: 'net-2-1',
        title: 'TCP vs UDP',
        content: `
# TCP vs UDP

Both are Layer 4 (Transport) protocols. They make very different tradeoffs.

## TCP — Transmission Control Protocol
- **Reliable** — guarantees delivery and ordering
- **Connection-oriented** — requires a 3-way handshake before data
- **Flow control** — receiver tells sender how fast to go
- **Use cases**: HTTP/HTTPS, databases, file transfer, email

### 3-Way Handshake
\`\`\`
Client → Server:  SYN
Server → Client:  SYN-ACK
Client → Server:  ACK
         ↓
     Connected!
\`\`\`

## UDP — User Datagram Protocol
- **Unreliable** — fire and forget
- **Connectionless** — no handshake overhead
- **No ordering guarantee** — packets can arrive out of order
- **Use cases**: DNS, video streaming, VoIP, online games, WebRTC

## When to Choose UDP
UDP wins when:
- Low latency matters more than perfect reliability
- The application handles retransmission itself (QUIC, game engines)
- Data is time-sensitive (stale audio is worse than no audio)
        `,
        tool: 'osi',
      },
      {
        id: 'net-2-2',
        title: 'HTTP & HTTPS',
        content: `
# HTTP & HTTPS

**HTTP (HyperText Transfer Protocol)** is the Layer 7 protocol that powers the web.

## Request / Response
\`\`\`http
GET /api/users HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer eyJ...

─────────────────────────────
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 128

{"users": [...]}
\`\`\`

## Methods
| Method | Use |
|--------|-----|
| GET | Retrieve resource |
| POST | Create resource |
| PUT | Replace resource |
| PATCH | Partial update |
| DELETE | Remove resource |

## Status Codes
- **2xx** — Success (200 OK, 201 Created, 204 No Content)
- **3xx** — Redirect (301 Moved, 302 Found, 304 Not Modified)
- **4xx** — Client error (400 Bad Request, 401 Unauthorized, 404 Not Found)
- **5xx** — Server error (500 Internal Server Error, 502 Bad Gateway)

## HTTPS
HTTP + TLS. The TLS handshake encrypts all data in transit. Modern sites **always** use HTTPS — browsers flag HTTP as "not secure."
        `,
        tool: 'osi',
      },
    ],
  },
];

export function getNetLessonById(moduleId: string, lessonId: string): NetLesson | undefined {
  return NET_CURRICULUM
    .find(m => m.id === moduleId)
    ?.lessons.find(l => l.id === lessonId);
}

export function netModulesForSidebar() {
  return NET_CURRICULUM.map(m => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map(l => ({ id: l.id, title: l.title, completed: false })),
  }));
}
