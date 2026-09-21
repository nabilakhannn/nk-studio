# Security policy

## Supported version

Security fixes are applied to the latest tagged release.

## Report privately

Do not open a public issue containing API keys, private URLs, billing data or exploit details. Use GitHub's **Report a vulnerability** option in this repository's Security tab.

If a secret was ever committed, revoke it immediately in the provider console. Deleting the file or commit alone does not make the credential safe again.

## Safe operating model

NK Studio is designed for one person running it locally. API credentials stay in `.env` on the server side. A public or multi-user deployment requires authentication, encrypted per-user secret storage, rate limits, durable job ownership, audit logs and abuse prevention before it is safe.
