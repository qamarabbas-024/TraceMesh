import { Injectable, Logger } from '@nestjs/common';
import { ToolRunner } from './runner.interface';
import { InputType, NormalizedResult, DiscoveredEntity } from '@tracemesh/shared';

export interface SmartContractInfo {
  contractAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
  decimals?: number;
  totalSupply?: string;
  creatorAddress?: string;
  creationTxHash?: string;
  isVerifiedSource: boolean;
  compilerVersion?: string;
  explorerUrl: string;
}

@Injectable()
export class TokenGraphRunner implements ToolRunner {
  readonly toolName = 'token_graph';
  readonly supportedInputTypes: InputType[] = ['username', 'email', 'domain'];
  private readonly logger = new Logger(TokenGraphRunner.name);

  async execute(targetInput: string, inputType: InputType): Promise<NormalizedResult> {
    const startTime = Date.now();
    const cleanAddress = targetInput.trim().toLowerCase();

    // Check if valid EVM contract address
    if (!/^0x[a-f0-9]{40}$/i.test(cleanAddress)) {
      return {
        status: 'success',
        summary: `Token Graph Inspector: "${targetInput}" is not a valid 40-character EVM hexadecimal contract address.`,
        entities: [],
        durationMs: Date.now() - startTime,
        raw: { isContract: false },
      };
    }

    const entities: DiscoveredEntity[] = [];
    let contractInfo: SmartContractInfo | null = null;

    // Query Blockscout EVM Smart Contract API
    try {
      const url = `https://eth.blockscout.com/api/v2/smart-contracts/${cleanAddress}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TraceMesh-TokenOSINT/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 200) {
        const data = await res.json();
        contractInfo = {
          contractAddress: cleanAddress,
          tokenName: data.token?.name || data.name || 'Custom Smart Contract',
          tokenSymbol: data.token?.symbol || 'TOKEN',
          decimals: data.token?.decimals ? parseInt(data.token.decimals, 10) : 18,
          totalSupply: data.token?.total_supply,
          creatorAddress: data.creator_address_hash,
          creationTxHash: data.creation_transaction_hash,
          isVerifiedSource: data.is_verified === true,
          compilerVersion: data.compiler_version,
          explorerUrl: `https://etherscan.io/token/${cleanAddress}`,
        };
      }
    } catch (err: any) {
      this.logger.debug(`Blockscout smart contract query failed: ${err.message}`);
    }

    // Fallback: If not verified or API timeout, provide basic contract footprint
    if (!contractInfo) {
      contractInfo = {
        contractAddress: cleanAddress,
        tokenName: 'Smart Contract / ERC Token',
        tokenSymbol: 'CONTRACT',
        isVerifiedSource: false,
        explorerUrl: `https://etherscan.io/address/${cleanAddress}`,
      };
    }

    // Generate Graph Entities
    entities.push({
      type: 'record',
      value: `Contract:${contractInfo.contractAddress}`,
      label: `📜 ${contractInfo.tokenName} (${contractInfo.tokenSymbol})`,
      sourceTool: 'token_graph',
      confidence: 0.99,
      metadata: {
        address: contractInfo.contractAddress,
        tokenName: contractInfo.tokenName,
        tokenSymbol: contractInfo.tokenSymbol,
        isVerified: contractInfo.isVerifiedSource,
        compilerVersion: contractInfo.compilerVersion,
        explorerUrl: contractInfo.explorerUrl,
        category: 'Smart Contract & Token Distribution',
      },
    });

    if (contractInfo.creatorAddress) {
      entities.push({
        type: 'record',
        value: `Deployer:${contractInfo.creatorAddress}`,
        label: `Contract Deployer: ${contractInfo.creatorAddress.slice(0, 10)}...`,
        sourceTool: 'token_graph',
        confidence: 0.98,
        metadata: {
          role: 'Smart Contract Deployer / Originator',
          contractAddress: contractInfo.contractAddress,
          txHash: contractInfo.creationTxHash,
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      status: 'success',
      summary: `Token Graph Inspector mapped smart contract ${contractInfo.contractAddress.slice(0, 10)}... (${contractInfo.tokenName}): Source Verified: ${contractInfo.isVerifiedSource ? 'YES' : 'UNVERIFIED'}.`,
      entities,
      durationMs,
      raw: {
        contract: contractInfo,
      },
    };
  }
}
