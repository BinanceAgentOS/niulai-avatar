# Niulai Avatar

Turn an uploaded avatar into a personalized, lo-fi Niulai bull meme portrait while retaining a few recognizable traits such as hair, glasses, clothing, colors, and expression.

This repository packages the `niulai-avatar` Skill for compatible agent runtimes, including Binance Agent OS-style Skill discovery. Avatar generation is read-only: it does not require a Binance account, wallet connection, signature, or on-chain transaction.

## Install

```bash
npx skills add https://github.com/BinanceAgentOS/niulai-avatar
```

Reload the host agent after installation if the Skill is not discovered immediately.

## Use

Upload an avatar and ask:

```text
牛来化
```

Other examples:

- `把这个头像变成牛来`
- `生成牛来头像，保留眼镜和黑色衣服`
- `Make this a Binance-themed Niulai avatar`

The default `standard` strength keeps roughly 70% Niulai character identity and 30% user-avatar traits. Binance styling is applied only when explicitly requested.

## Runtime

The Skill prefers the host's native image-generation or image-editing tool. Its portable fallback uses Node.js 22+, the OpenAI image edits endpoint, and an `OPENAI_API_KEY` supplied through the local environment.

Preview a fallback request without network access or an API key:

```bash
node scripts/generate.mjs \
  --input "/absolute/path/avatar.png" \
  --output "/absolute/path/niulai-avatar.png" \
  --dry-run --json
```

Validate an output:

```bash
node scripts/validate-avatar.mjs \
  --input "/absolute/path/niulai-avatar.png" --json
```

See [SKILL.md](SKILL.md) for the complete workflow and safety rules.

## Safety and scope

- User uploads and generated portraits must not be committed to this repository.
- API keys are read only from the local environment and must never be passed as command-line arguments.
- Publishing, wallet actions, token launches, NFT minting, signatures, and contract calls belong to separate Skills and require explicit user confirmation.
- This is an independent community project and does not imply official Binance endorsement.

## License

Code and Skill instructions are licensed under the [MIT License](LICENSE). Before public redistribution, maintainers must independently verify rights to bundled character references and any brand-themed artwork.

