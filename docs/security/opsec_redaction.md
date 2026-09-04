# OPSEC PII Redaction & Sanitization Protocol

## 1. Zero-Leakage Policy
TraceMesh incorporates local regex filters and NLP named-entity recognition (NER) to prevent unintended PII exposure in exported intelligence dossiers.

## 2. Redaction Rules
- **National ID / SSN**: Masked to `[REDACTED-NID]`.
- **Payment Cards (PCI-DSS)**: Luhn-validated card numbers replaced with `[REDACTED-PAN]`.
- **Private Key / Secret Tokens**: Base64 high-entropy strings replaced with `[REDACTED-SECRET]`.
- **Personal Phone Numbers**: E.164 numbers masked as `+X-XXX-XXX-XXXX`.
