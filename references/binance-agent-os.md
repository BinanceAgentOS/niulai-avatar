# Binance Agent OS Integration

## Package Shape

Keep `niulai-avatar` as a self-contained folder whose entry point is `SKILL.md`. Binance Skills Hub
discovers skills by folder and structured frontmatter. The folder name and frontmatter `name` both
use `niulai-avatar`.

The package is agent-agnostic:

- Prefer the host agent's native image generation/editing tool when available.
- Use `scripts/generate.mjs` as a portable Node.js fallback.
- Use `scripts/validate-avatar.mjs` for deterministic output checks.
- Keep the bundled character reference and Skill icons under `assets/`.

## Runtime

- Require Node.js 22 or newer for the fallback script.
- Require network access only when the fallback calls the image API.
- Require `OPENAI_API_KEY` only for the fallback path.
- Do not require a Binance API key, Binance login, wallet, or chain transaction.
- Do not install npm dependencies; the fallback uses Node's built-in `fetch`, `FormData`, and
  filesystem APIs.

## Install After Publishing

Install the Skill with the same Skills CLI pattern used by Binance Skills Hub:

```bash
npx skills add https://github.com/BinanceAgentOS/niulai-avatar
```

The repository places the Skill at its root. Restart or reload the host agent after installation
if it does not discover the Skill immediately.

## Cross-Skill Composition

Avatar generation ends when a validated local image is produced.

- Binance Square: when the user explicitly requests publication and confirms the selected image,
  hand the file to `square-post` if installed. Never auto-post drafts.
- Binance Agentic Wallet: use only for a separately requested wallet or on-chain action. Do not
  make wallet connectivity a prerequisite for avatar generation.
- Token/NFT workflows: pass only the user-approved final image path or its later uploaded URI to a
  separate publishing or contract workflow. Keep irreversible actions outside this Skill.

## Submission Notes

Before marketplace submission:

1. Replace the author value if the publishing GitHub handle differs from `niulaiavatar`.
2. Confirm permission to redistribute `assets/niulai-reference.png`.
3. Confirm Binance trademark usage for the themed Skill icon.
4. Run the local validator and the Skill Creator validator.
5. Keep all secrets and generated user images out of the repository.
