"""Cryptocurrency OSINT - Blockchain explorers"""
import httpx
from config import settings


class CryptoOSINT:
    """Bitcoin and Ethereum address intelligence"""

    @staticmethod
    async def blockchain_btc(address: str) -> dict:
        """Blockchain.com - Bitcoin address details (no key)"""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"https://blockchain.info/rawaddr/{address}")
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "address": address,
                    "total_received_btc": data.get("total_received", 0) / 1e8,
                    "total_sent_btc": data.get("total_sent", 0) / 1e8,
                    "balance_btc": data.get("final_balance", 0) / 1e8,
                    "transaction_count": data.get("n_tx", 0),
                    "first_seen": data.get("first_tx", {}).get("time") if data.get("first_tx") else None,
                    "last_seen": data.get("last_tx", {}).get("time") if data.get("last_tx") else None,
                    "transactions": [{
                        "hash": t.get("hash"),
                        "time": t.get("time"),
                        "total_btc": t.get("result", 0) / 1e8,
                        "inputs": len(t.get("inputs", [])),
                        "outputs": len(t.get("out", [])),
                    } for t in (data.get("txs") or [])[:10]],
                }
            return {"error": f"Blockchain HTTP {resp.status_code}"}

    @staticmethod
    async def etherscan(address: str) -> dict:
        """Etherscan - Ethereum address + transactions"""
        if not settings.etherscan_api_key:
            return {"error": "No Etherscan API key"}
        async with httpx.AsyncClient(timeout=15) as client:
            bal_resp = await client.get(
                "https://api.etherscan.io/api",
                params={
                    "module": "account", "action": "balance",
                    "address": address, "tag": "latest",
                    "apikey": settings.etherscan_api_key
                }
            )
            balance = 0
            if bal_resp.status_code == 200 and bal_resp.json().get("status") == "1":
                balance = int(bal_resp.json().get("result", 0)) / 1e18

            tx_resp = await client.get(
                "https://api.etherscan.io/api",
                params={
                    "module": "account", "action": "txlist",
                    "address": address, "startblock": 0,
                    "endblock": 99999999, "sort": "desc",
                    "apikey": settings.etherscan_api_key
                }
            )
            transactions = []
            if tx_resp.status_code == 200 and tx_resp.json().get("status") == "1":
                txs = tx_resp.json().get("result", [])[:10]
                transactions = [{
                    "hash": t.get("hash"),
                    "from": t.get("from"),
                    "to": t.get("to"),
                    "value_eth": int(t.get("value", 0)) / 1e18,
                    "timestamp": t.get("timeStamp"),
                    "gas_price": t.get("gasPrice"),
                    "method": t.get("methodId"),
                } for t in txs]

            return {
                "address": address,
                "eth_balance": balance,
                "transaction_count": len(transactions),
                "transactions": transactions,
            }
