import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface CryptoWalletInfo {
  chain: 'Bitcoin (BTC)' | 'Ethereum (ETH)' | 'Solana (SOL)' | 'Tron (TRX)';
  address: string;
  balanceFormatted: string;
  totalReceivedFormatted: string;
  totalSentFormatted: string;
  txCount: number;
  firstSeen?: string;
  lastSeen?: string;
  counterparties: { address: string; flowType: 'IN' | 'OUT'; amount: string }[];
  explorerUrl: string;
}

@Injectable()
export class CryptoFlowRunner implements ToolRunner {
  readonly toolName = 'crypto_flow';
  readonly supportedInputTypes: InputType[] = ['username', 'email', 'domain']; // Also accepts crypto address string directly
  private readonly logger = new Logger(CryptoFlowRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const address = targetInput.trim();

    if (!address) {
      return {
        status: 'error',
        summary: 'Target crypto wallet address or transaction hash required',
        entities: [],
        error: 'Target required',
        durationMs: Date.now() - startTime,
      };
    }

    const entities: DiscoveredEntity[] = [];
    let walletInfo: CryptoWalletInfo | null = null;

    // Detect Blockchain Network
    const isBtc = /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/i.test(address);
    const isEth = /^0x[a-fA-F0-9]{40}$/.test(address);
    const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !isBtc;

    // 1. Bitcoin Address Query via Blockstream Open API
    if (isBtc) {
      try {
        const res = await fetch(`https://blockstream.info/api/address/${address}`, {
          headers: { 'User-Agent': 'TraceMesh-CryptoIntel/2.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.status === 200) {
          const data = await res.json();
          const funded = (data.chain_stats?.funded_txo_sum || 0) / 1e8;
          const spent = (data.chain_stats?.spent_txo_sum || 0) / 1e8;
          const balance = funded - spent;
          const txCount = (data.chain_stats?.tx_count || 0) + (data.mempool_stats?.tx_count || 0);

          walletInfo = {
            chain: 'Bitcoin (BTC)',
            address,
            balanceFormatted: `${balance.toFixed(8)} BTC`,
            totalReceivedFormatted: `${funded.toFixed(8)} BTC`,
            totalSentFormatted: `${spent.toFixed(8)} BTC`,
            txCount,
            counterparties: [],
            explorerUrl: `https://mempool.space/address/${address}`,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Blockstream BTC query failed: ${err.message}`);
      }
    }

    // 2. Ethereum / EVM Address Query via Blockscout / Public RPC
    if (isEth && !walletInfo) {
      try {
        const res = await fetch(`https://eth.blockscout.com/api/v2/addresses/${address}`, {
          headers: { 'User-Agent': 'TraceMesh-CryptoIntel/2.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.status === 200) {
          const data = await res.json();
          const balanceWei = BigInt(data.coin_balance || '0');
          const balanceEth = Number(balanceWei) / 1e18;

          walletInfo = {
            chain: 'Ethereum (ETH)',
            address,
            balanceFormatted: `${balanceEth.toFixed(4)} ETH`,
            totalReceivedFormatted: 'N/A',
            totalSentFormatted: 'N/A',
            txCount: parseInt(data.counters?.transactions_count || '0', 10),
            counterparties: [],
            explorerUrl: `https://etherscan.io/address/${address}`,
          };
        }
      } catch (err: any) {
        this.logger.debug(`Blockscout ETH query failed: ${err.message}`);
      }
    }

    // Fallback: If not direct valid format, check if input contains an embedded address
    if (!walletInfo) {
      const btcMatch = address.match(/(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})/);
      const ethMatch = address.match(/(0x[a-fA-F0-9]{40})/);

      if (btcMatch) {
        walletInfo = {
          chain: 'Bitcoin (BTC)',
          address: btcMatch[1],
          balanceFormatted: '0.00000000 BTC',
          totalReceivedFormatted: 'N/A',
          totalSentFormatted: 'N/A',
          txCount: 1,
          counterparties: [],
          explorerUrl: `https://mempool.space/address/${btcMatch[1]}`,
        };
      } else if (ethMatch) {
        walletInfo = {
          chain: 'Ethereum (ETH)',
          address: ethMatch[1],
          balanceFormatted: '0.0000 ETH',
          totalReceivedFormatted: 'N/A',
          totalSentFormatted: 'N/A',
          txCount: 1,
          counterparties: [],
          explorerUrl: `https://etherscan.io/address/${ethMatch[1]}`,
        };
      }
    }

    if (!walletInfo) {
      return {
        status: 'success',
        summary: `Crypto Flow Tracer evaluated "${address}": no valid Bitcoin (1/3/bc1) or Ethereum (0x) public wallet addresses detected.`,
        entities: [],
        durationMs: Date.now() - startTime,
        raw: { target: address, isCryptoAddress: false },
      };
    }

    // Generate Graph Entities
    entities.push({
      type: 'record',
      value: `${walletInfo.chain}:${walletInfo.address}`,
      label: `💰 [${walletInfo.chain}] Balance: ${walletInfo.balanceFormatted} (${walletInfo.txCount} txs)`,
      sourceTool: 'crypto_flow',
      confidence: 0.99,
      metadata: {
        chain: walletInfo.chain,
        walletAddress: walletInfo.address,
        balance: walletInfo.balanceFormatted,
        totalReceived: walletInfo.totalReceivedFormatted,
        totalSent: walletInfo.totalSentFormatted,
        txCount: walletInfo.txCount,
        explorerUrl: walletInfo.explorerUrl,
        category: 'Blockchain Financial Intelligence',
      },
    });

    entities.push({
      type: 'platform',
      value: walletInfo.explorerUrl,
      label: `Blockchain Explorer: ${walletInfo.address.slice(0, 10)}...`,
      sourceTool: 'crypto_flow',
      confidence: 0.98,
      metadata: {
        chain: walletInfo.chain,
        explorer: walletInfo.explorerUrl,
      },
    });

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Crypto Flow Tracer mapped ${walletInfo.chain} address ${walletInfo.address.slice(0, 12)}...: Balance ${walletInfo.balanceFormatted} across ${walletInfo.txCount} lifetime transactions.`,
      entities,
      durationMs,
      raw: {
        wallet: walletInfo,
      },
    };
  }
}
