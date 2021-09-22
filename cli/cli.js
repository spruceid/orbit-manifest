const lib = require('../dist/contractClient');
const crypto = require('crypto');
const fs = require('fs');
const yargs = require('yargs');
const DIDKit = require('didkit-wasm-node');

const hashFunc = async (claimBody) => {
	return crypto.createHash("sha256").update(claimBody).digest().toString('hex');
}

const argv = yargs
	.command('originate', 'Deploy Orbit Manifest smart contract.', {
		manifest: {
			description: 'File path to initial orbit manifest JSON file',
			type: 'string',
			demand: false,
			default: "",
		}
	})
	.command('add-host', 'Add host.',
		{
			contract: {
				description: 'Contract Address',
				type: 'string',
				demand: true
			},
			host: {
				description: 'Host ID',
				type: 'string',
				demand: true
			},
			addresses: {
				description: 'Comma seperated list of hosts multiaddresses',
				type: 'array',
				demand: true,
			}
		}
	)
	.command('remove-hosts', 'Remove hosts.',
		{
			contract: {
				description: 'Contract Address',
				type: 'string',
				demand: true
			},
			hosts: {
				description: 'Comma seperated list of hosts IDs',
				type: 'array',
				demand: true,
			}
		}
	)
	.command('add-admins', 'Add admins.',
		{
			contract: {
				description: 'Contract Address',
				type: 'string',
				demand: true
			},
			admins: {
				description: 'Comma seperated list of admin PKHs',
				type: 'array',
				demand: true,
			}
		}
	)
	.command('remove-admins', 'Remove admins.',
		{
			contract: {
				description: 'Contract Address',
				type: 'string',
				demand: true
			},
			admins: {
				description: 'Comma seperated list of admin PKH',
				type: 'array',
				demand: true,
			}
		}
	)
	.command('read', 'Read orbit state.',
		{
			contract: {
				description: 'Contract Address',
				type: 'string',
				demand: true
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
	.option('tzkt_base', {
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
		tzktBase: getTzktOpts(),
		nodeURL: argv.url || "https://mainnet-tezos.giganode.io",
		signer: signerOpts
	};

	return new lib.ContractClient(clientOpts);
}

function getTzktOpts() {
	return argv.tzkt_base || "https://api.tzkt.io"
}

async function originate() {
	let client = getClient();
	let manifest = argv.manifest.length === 0
		? { admins: [await client.getPKH()], hosts: {} }
		: JSON.parse(fs.readFileSync(argv.manifest, 'utf8'));

	return await client.originate(manifest);
}

async function add_host() {
	let client = getClient();
	let hosts = { [argv.host]: argv.addresses };
	console.log(hosts)

	return await client.addHosts(argv.contract, hosts)
}

async function remove_hosts() {
	let client = getClient();
	let hosts = argv.hosts;

	return await client.removeHosts(argv.contract, hosts)
}

async function add_admins() {
	let client = getClient();
	let admins = argv.admins;

	return await client.addAdmins(argv.contract, admins)
}

async function remove_admins() {
	let client = getClient();
	let admins = argv.admins;

	return await client.removeAdmins(argv.contract, admins)
}

async function read() {
	let client = getClient();
	return await client.readState(argv.contract)
}

async function run() {
	try {
		if (argv._.includes('originate')) {
			let contractAddress = await originate();
			console.log(`Originated contract at address: ${contractAddress}`);
		} else if (argv._.includes('add-host')) {
			let transaction = await add_host();
			console.log(`Add hosts concluded in transaction: ${transaction}`);
		} else if (argv._.includes('remove-hosts')) {
			let transaction = await remove_hosts();
			console.log(`Remove hosts concluded in transaction: ${transaction}`);
		} else if (argv._.includes('add-admins')) {
			let transaction = await add_admins();
			console.log(`Add admins concluded in transaction: ${transaction}`);
		} else if (argv._.includes('remove-admins')) {
			let transaction = await remove_admins();
			console.log(`Remove admins concluded in transaction: ${transaction}`);
		} else if (argv._.includes('read')) {
			let tzp = await read();
			console.log(tzp);
		} else {
			throw new Error(`Unknown command`);
		}
	} catch (e) {
		console.error(`Failed in operation: ${e.message}`);
	}
}

run().then(() => { console.log("Exiting") });
