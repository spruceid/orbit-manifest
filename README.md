# Tezos Orbit Manifest Contract

This smart-contract is an implementation of a Kepler Orbit Manifest using the Tezos blockchain. As such, it provides a decentralised root of control over a [Kepler Orbit's](https://github.com/spruceid/kepler) authorization policy.

## Local Environment
Requires [Docker](https://www.docker.com/get-started).

For development purposes, a full-fledged local environment is provided. It
contains a sandbox Tezos node, TzKT API, and the likes. To use it:
```bash
docker-compose -f bcd-sandbox.yml up -d
```

## CLI

### Installation
Compile DIDKit to WASM for Node.js use. Under `didkit/lib/web`, run:
```bash
wasm-pack build --target nodejs --out-dir pkg/node
```

Then, in this directory:
```bash
npm i
```

### Usage
Deploy with tezos blockchain via the CLI
```bash
node cli/cli.js originate <manifest> --secret <secret> --url <local node or mainnet url>
```

To see all possible usages and parameters, you can refer to the CLI's help:
```bash
$ node cli/cli.js --help
cli.js [command]

Commands:
  cli.js originate      Deploy Orbit Manifest smart contract.
  cli.js add-host       Add host.
  cli.js remove-hosts   Remove hosts.
  cli.js add-admins     Add admins.
  cli.js remove-admins  Remove admins.
  cli.js read           Read orbit state.

Options:
      --version          Show version number                           [boolean]
  -u, --url              Tezos node.
                            [string] [default: "https://api.tez.ie/rpc/mainnet"]
  -n, --network          Tezos network.            [string] [default: "mainnet"]
  -f, --faucet_key_file  Path to a faucet key JSON file.                [string]
  -s, --secret           Secret key.                                    [string]
  -b, --tzkt_base        Base url for better-call.dev API endpoints
                               [string] [default: "https://api.better-call.dev"]
  -h, --help             Show help 
```

## SDK
Import the contract interactions as JS functions
(TODO: Add examples)

## Smart Contract Code
The literal smart-contract code written in LIGO, compiled to Michelson for use
by `cli`/`lib`
