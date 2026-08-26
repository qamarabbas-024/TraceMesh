'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Globe, Zap, Radio, Terminal } from 'lucide-react';

const INITIAL_ACTIVITIES = [
  { id: '1', text: 'Passive DNS synchronization: 142 new resolution records ingested', type: 'dns' },
  { id: '2', text: 'Shodan scanner online: 4 global honeypots correlated', type: 'shodan' },
  { id: '3', text: 'AlienVault OTX pulse verified: threat cluster ASN-13335 active', type: 'otx' },
  { id: '4', text: 'crt.sh Certificate Transparency: Wildcard SAN detected', type: 'cert' },
  { id: '5', text: 'AbuseIPDB reputation telemetry: 0% confidence malicious rating', type: 'abuse' },
  { id: '6', text: 'Darknet Graph Engine (Ahmia): Indexed onion service nodes', type: 'darknet' },
];

export function ActivityTicker() {
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);

  useEffect(() => {
    const interval = setInterval(() => {
      const liveEvents = [
        'BGP Autonomous System routing table updated',
        'TLS Cipher suite fingerprint: TLS 1.3 ECDHE-RSA-AES256-GCM',
        'Tor relay descriptor signature validated',
        'GitHub intelligence: Public commit email verified',
        'IPinfo geolocation coordinates locked: Precision ~5km',
      ];
      const randomEvent = liveEvents[Math.floor(Math.random() * liveEvents.length)];
      setActivities((prev) => [
        { id: String(Date.now()), text: randomEvent, type: 'live' },
        ...prev.slice(0, 7),
      ]);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-bg-surface/90 border-t border-accent-cyan-dim/30 py-1.5 px-4 font-mono text-[10px] text-text-secondary flex items-center justify-between gap-3 overflow-hidden backdrop-blur-md">
      {/* Left Label */}
      <div className="flex items-center gap-1.5 text-accent-cyan font-bold shrink-0 uppercase tracking-widest">
        <Radio className="w-3 h-3 text-status-success animate-pulse" />
        <span>THREAT STREAM //</span>
      </div>

      {/* Scrolling Activity Items */}
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee hover:pause">
          <div className="flex items-center gap-6">
            {activities.map((act) => (
              <span key={act.id} className="flex items-center gap-1.5 text-text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                <span>{act.text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right System Telemetry Load */}
      <div className="hidden md:flex items-center gap-3 shrink-0 text-text-muted">
        <span>MEM: <strong className="text-accent-cyan">42MB</strong></span>
        <span>LAT: <strong className="text-status-success">12ms</strong></span>
        <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan font-bold">
          LIVE
        </span>
      </div>
    </div>
  );
}
