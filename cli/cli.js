const lib = require('../dist/contractClient');
const crypto = require('crypto');
const fs = require('fs');
const yargs = require('yargs');
const DIDKit = require('didkit-wasm-node');

const hashFunc = async (claimBody) => {
	return crypto.createHash("sha256").update(claimBody).digest().toString('hex');
}

const argv = yargs
	.command('originate', 'Deploy Tezos Public Profiles smart contract.', {
		admins: {
			description: 'Comma seperated list of initial orbit admins',
			type: 'array',
			demand: false,
			default: [],
		},
		hosts: {
			description: 'Comma seperated list of initial orbit hosts',
			type: 'array',
			demand: false,
			default: [],
		}
	})
	.command('add-hosts', 'Add hosts.',
		{
			hosts: {
				description: 'Comma seperated list of hosts IDs',
				type: 'array',
				demand: true,
			}
		}
	)
	.command('remove-hosts', 'Remove hosts.',
		{
			hosts: {
				description: 'Comma seperated list of hosts IDs',
				type: 'array',
				demand: true,
			}
		}
	)
	.command('add-admins', 'Add admins.',
		{
			hosts: {
				description: 'Comma seperated list of admin PKHs',
				type: 'array',
				demand: true,
			}
		}
	)
	.command('remove-admins', 'Remove admins.',
		{
			hosts: {
				description: 'Comma seperated list of admins PKH',
				type: 'array',
				demand: true,
			}
		}
	)
	.command('get-state', 'Get orbit state.',
		{
			contract: {
				description: 'orbit address.',
				type: 'string',
				demand: false,
			},
		}
	)
	.option('url', {
		alias: 'u',
		description: 'Tezos node.',
		type: 'string',
		default: 'https://api.tez.ie/rpc/mainnet',
	})
	.option('network', {
		alias: 'n',
		description: 'Tezos network.',
		type: 'string',
		default: 'mainnet'
	})
	.option('faucet_key_file', {
		alias: 'f',
		description: 'Path to a faucet key JSON file.',
		type: 'string',
	})
	.option('secret', {
		alias: 's',
		description: 'Secret key.',
		type: 'string',
	})
	.option('bcd_base', {
		alias: 'b',
		description: 'Base url for better-call.dev API endpoints',
		type: 'string',
		default: 'https://api.better-call.dev'
	})
	.strict()
	.help()
	.alias('help', 'h')
	.argv;

function getClient() {
	let signerOpts = {};
	if (argv.faucet_key_file) {
		signerOpts.type = "key";
		signerOpts.key = JSON.parse(fs.readFileSync(argv.faucet_key_file, 'utf8'));
	} else if (argv.secret) {
		signerOpts.type = "secret";
		signerOpts.secret = argv.secret
	} else {
		signerOpts = false;
	}

	let clientOpts = {
		betterCallDevConfig: getBCDOpts(),
		keplerClient: new kepler.Kepler(
			argv.kepler_base
		),
		nodeURL: argv.url || "https://mainnet-tezos.giganode.io",
		signer: signerOpts
	};

	return new lib.ContractClient(clientOpts);
}

function getBCDOpts() {
	return {
		base: argv.bcd_base || "https://api.better-call.dev",
		network: argv.network || "mainnet",
		version: 1,
	};
}

async function originate() {
	let client = getClient();

	let claimsList = argv.claims.map((claim) => {
		return ["VerifiableCredential", claim];
	});

	return await client.originate(claimsList);
}

async function add_claims() {
	let client = getClient();
	let claimsList = argv.claims.map((claim) => {
		return ["VerifiableCredential", claim];
	});

	return await client.addClaims(argv.contract, claimsList)
}

async function remove_claims() {
	let client = getClient();
	let claimsList = argv.claims.map((claim) => {
		return ["VerifiableCredential", claim];
	});

	return await client.removeClaims(argv.contract, claimsList)
}

async function run() {
	try {
		if (argv._.includes('originate')) {
			let contractAddress = await originate();
			console.log(`Originated contract at address: ${contractAddress}`);
		} else if (argv._.includes('add-claims')) {
			let transaction = await add_claims();
			console.log(`Add claims concluded in transaction: ${transaction}`);
		} else if (argv._.includes('remove-claims')) {
			let transaction = await remove_claims();
			console.log(`Remove claims concluded in transaction: ${transaction}`);
		} else if (argv._.includes('resolve-tzp')) {
			let tzp = await retrieve_tzp();
			console.log(`Wallet ${argv.address} owns contract:`);
			console.log(tzp);
		} else {
			throw new Error(`Unknown command`);
		}
	} catch (e) {
		console.error(`Failed in operation: ${e.message}`);
	}
}

run().then(() => { console.log("Exiting") });
