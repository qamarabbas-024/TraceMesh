# TraceMesh OSINT Expansion

Extended OSINT resolvers for the TraceMesh platform.
Adds 20+ new data sources across email, domain, IP, threat intel, crypto, social, and phone.

## Setup

1. Copy `.env.example` to `.env`
2. Fill in your API keys (see Part 1 of setup guide)
3. Install: `pip install -r requirements.txt`
4. Run: `uvicorn main:app --reload --port 3001`
5. Docs: http://localhost:3001/docs

## Optional self-hosted tools

- Wappalyzer: `docker pull wappalyzer/cli`
- email2phonenumber: `pip install email2phonenumber`
- crosslinked: `pip install crosslinked`
- waybackpy: `pip install waybackpy`

## Rate limit budget (free tiers)

| Service | Daily/monthly budget | Use wisely |
|---|---|---|
| Shodan | ~1000 credits/mo | Only on high-value targets |
| SecurityTrails | 50 req/mo | Cache results |
| Hunter | 25 req/mo | Verify, don't spam |
| HIBP | 1000 req/day | Safe |
| VT | 500 req/day | Safe |
| URLScan | unlimited | Safe |
| Dehashed/IntelX | credit-based | Check balance in response |
