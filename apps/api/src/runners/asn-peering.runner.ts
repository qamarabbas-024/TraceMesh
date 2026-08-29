import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';
import * as dns from 'dns/promises';

export interface AsnInfo {
  asn: number;
  asnName: string;
  country: string;
  rir: string;
  prefix: string;
  peersCount?: number;
  upstreams?: string[];
  downstreams?: string[];
}

@Injectable()
export class AsnPeeringRunner implements ToolRunner {
  readonly toolName = 'asn_peering';
  readonly supportedInputTypes: InputType[] = ['ip', 'domain'];
  private readonly logger = new Logger(AsnPeeringRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    let targetIp = targetInput.trim();

    // If domain, resolve to IPv4 address first
    if (inputType === 'domain' || !/^(\d{1,3}\.){3}\d{1,3}$/.test(targetIp)) {
      const cleanDomain = targetInput.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      try {
        const resolved = await dns.resolve4(cleanDomain);
        if (resolved && resolved.length > 0) {
          targetIp = resolved[0];
        }
      } catch (err: any) {
        return {
          status: 'error',
          summary: `Could not resolve domain "${targetInput}" to IPv4 for BGP ASN mapping`,
          entities: [],
          error: 'DNS Resolution Failed',
          durationMs: Date.now() - startTime,
        };
      }
    }

    const entities: DiscoveredEntity[] = [];
    let asnData: AsnInfo | null = null;

    // 1. Query RIPE Stat / BGP Routing API
    try {
      const ripeUrl = `https://stat.ripe.net/data/network-info/data.json?resource=${targetIp}`;
      const res = await fetch(ripeUrl, {
        headers: { 'User-Agent': 'TraceMesh-BGP-Mapper/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 200) {
        const json = await res.json();
        const data = json.data;
        if (data && data.asns && data.asns.length > 0) {
          const rawAsn = parseInt(data.asns[0], 10);
          asnData = {
            asn: rawAsn,
            asnName: data.holder || `AS${rawAsn}`,
            country: data.country || 'GLOBAL',
            rir: data.rir || 'RIPE/ARIN',
            prefix: data.prefix || `${targetIp}/24`,
            upstreams: [],
          };
        }
      }
    } catch (err: any) {
      this.logger.warn(`RIPE Stat API query failed for ${targetIp}: ${err.message}`);
    }

    // 2. Query BGPView API for Peering topology if ASN was found
    if (asnData && asnData.asn) {
      try {
        const bgpViewUrl = `https://api.bgpview.io/asn/${asnData.asn}/peers`;
        const resBgp = await fetch(bgpViewUrl, {
          headers: { 'User-Agent': 'TraceMesh-BGP-Mapper/2.0' },
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);

        if (resBgp && resBgp.status === 200) {
          const bgpJson = await resBgp.json();
          const peers = bgpJson.data?.ipv4_peers || [];
          asnData.peersCount = peers.length;
          asnData.upstreams = peers.slice(0, 5).map((p: any) => `AS${p.asn} (${p.name || p.description || ''})`);
        }
      } catch (err: any) {
        this.logger.debug(`BGPView peering query failed: ${err.message}`);
      }
    }

    // Fallback: If APIs unreachable, parse Cymru DNS TXT record for ASN
    if (!asnData) {
      try {
        const reversedIp = targetIp.split('.').reverse().join('.');
        const cymruQuery = `${reversedIp}.origin.asn.cymru.com`;
        const txtRecords = await dns.resolveTxt(cymruQuery);
        if (txtRecords && txtRecords.length > 0) {
          const txt = txtRecords[0].join(' ');
          const parts = txt.split('|').map((s) => s.trim());
          if (parts.length >= 3) {
            const rawAsn = parseInt(parts[0], 10);
            asnData = {
              asn: rawAsn,
              asnName: parts[2] || `AS${rawAsn}`,
              country: parts[3] || 'GLOBAL',
              rir: 'CYMRU',
              prefix: parts[1] || `${targetIp}/24`,
            };
          }
        }
      } catch {
        // Cymru fallback failed
      }
    }

    if (!asnData) {
      return {
        status: 'error',
        summary: `No BGP routing or ASN allocation data found for host IP ${targetIp}`,
        entities: [],
        error: 'ASN Not Found',
        durationMs: Date.now() - startTime,
      };
    }

    // Generate Graph Entities
    // 1. ASN Entity
    entities.push({
      type: 'record',
      value: `AS${asnData.asn}`,
      label: `Autonomous System: AS${asnData.asn} (${asnData.asnName})`,
      sourceTool: 'asn_peering',
      confidence: 0.99,
      metadata: {
        asn: asnData.asn,
        asnName: asnData.asnName,
        country: asnData.country,
        rir: asnData.rir,
        prefix: asnData.prefix,
        peersCount: asnData.peersCount || 0,
        category: 'BGP Routing & ASN Infrastructure',
      },
    });

    // 2. IP Prefix Entity
    entities.push({
      type: 'record',
      value: asnData.prefix,
      label: `Announced BGP Prefix: ${asnData.prefix}`,
      sourceTool: 'asn_peering',
      confidence: 0.97,
      metadata: {
        allocatedAsn: `AS${asnData.asn}`,
        targetHostIp: targetIp,
      },
    });

    // 3. Upstream Peering Link Entities
    if (asnData.upstreams && asnData.upstreams.length > 0) {
      for (const peer of asnData.upstreams) {
        entities.push({
          type: 'record',
          value: peer,
          label: `BGP Upstream Transit Peer: ${peer}`,
          sourceTool: 'asn_peering',
          confidence: 0.94,
          metadata: {
            originAsn: `AS${asnData.asn}`,
            peerType: 'BGP Transit Interconnection',
          },
        });
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `BGP Peering Graph mapped ${targetIp} to AS${asnData.asn} (${asnData.asnName}), announced via ${asnData.prefix} with ${asnData.peersCount || 0} active transit peers.`,
      entities,
      durationMs,
      raw: {
        ip: targetIp,
        asn: asnData,
      },
    };
  }
}
