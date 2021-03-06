// TODO: Restore once the wallet can be properly typed.
// import type { BeaconWallet } from "@taquito/beacon-wallet";
import { InMemorySigner, importKey } from "@taquito/signer";
import * as taquito from "@taquito/taquito";
import * as tzip16 from "@taquito/tzip16";
import { contract as contractCode } from "./contract";
import axios from "axios";
import { ContractAbstraction, ContractProvider } from "@taquito/taquito";

// Magic Number controlling how long to wait before confirming success.
// Seems to be an art more than a science, 3 was suggested by a help thread.
const CONFIRMATION_CHECKS = 3;

// Use a browser based wallet via extension toolkit to handle signing
export interface WalletSigner {
	type: "wallet",
	// TODO: Resolve this error
	// wallet: BeaconWallet
	// This causes the following err in dapp: 
	// Type 'import("/path/to/tzprofiles/dapp/node_modules/@taquito/beacon-wallet/dist/types/taquito-beacon-wallet").BeaconWallet' is not assignable to type 'import("/Volumes/workshop/labor/spruce/tzprofiles/contract/node_modules/@taquito/beacon-wallet/dist/types/taquito-beacon-wallet").BeaconWallet'.
	// The types of 'client.blockExplorer' are incompatible between these types.

	// A prepared, authenticated BeaconWallet from taquito.
	wallet: any
}

// Use a plain-text secret key to build the signer
export interface SecretSigner {
	type: "secret",
	// 
	secret: string
}

// Use a JSON Object representing a key file to build the signer
export interface KeySigner {
	type: "key",
	key: {
		email: string,
		password: string,
		mnemonic: Array<string>,
		secret: string
	}
}

// A signer is a configuration which can be used to sign transactions 
// on behalf of a wallet
export type Signer = WalletSigner | SecretSigner | KeySigner;

// Base URL for TzKT, defaults to https://api.tzkt.io.
export type TzKTBase = string;

interface OrbitStorage {
	admins: taquito.MichelsonMap<string, null>,
	hosts: taquito.MichelsonMap<string, string[]>
	readers: taquito.MichelsonMap<string, null>,
	writers: taquito.MichelsonMap<string, null>,
}

interface ManifestJson {
	admins: string[],
	hosts: { [hostId: string]: string[] }
	readers: string[],
	writers: string[],
}

export function jsonToStorage(json: ManifestJson): OrbitStorage {
	return {
		// @ts-ignore
		admins: taquito.MichelsonMap.fromLiteral(json.admins ? json.admins.reduce((acc, admin) => ({ [admin]: null, ...acc }), {}) : {}),
		// @ts-ignore
		hosts: taquito.MichelsonMap.fromLiteral(json.hosts)
	}
}

function defaultTzKT(): TzKTBase {
	return "https://api.tzkt.io";
}

export interface ContractClientOpts {
	// Defaults to: "https://api.tzkt.io";
	tzktBase?: TzKTBase,

	// An entry in the contract's metadata that allows it to be identified, used to 
	// prevent duplicate contracts of the same type from being originated under the
	// same owner.
	contractType: string,

	// If read only, a Signer is un-needed, such as in the use-case of a search engine.
	// Will cause some methods to fail.
	signer: Signer | false,

	// Tezos Node URL to use, such as https://mainnet-tezos.giganode.io
	nodeURL: string,
}

export class ContractClient {
	tzktBase: TzKTBase;
	contractType: string;
	nodeURL: string;
	signer: Signer | false;
	signerSet: boolean;
	tezos: taquito.TezosToolkit;

	constructor(opts: ContractClientOpts) {
		this.tzktBase = opts.tzktBase || defaultTzKT();
		this.contractType = opts.contractType;
		this.nodeURL = opts.nodeURL;
		this.signer = opts.signer;
		this.tezos = new taquito.TezosToolkit(this.nodeURL);
		this.tezos.addExtension(new tzip16.Tzip16Module());

		// Lack of async constructor causes some special handling of setting the signer.
		if (this.signer) {
			this.setSigner();
		}
	}

	// Lack of async constructor causes some special handling of setting the signer.
	private async setSigner(): Promise<void> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to set signing method");
		}

		let t = this.signer.type;
		switch (this.signer.type) {
			case "key":
				await importKey(
					this.tezos,
					this.signer.key.email,
					this.signer.key.password,
					this.signer.key.mnemonic.join(' '),
					this.signer.key.secret,
				);
				this.signerSet = true;
				return
			case "secret":
				this.tezos.setProvider({
					signer: new InMemorySigner(this.signer.secret)
				});
				this.signerSet = true;
				return
			case "wallet":
				this.tezos.setWalletProvider(this.signer.wallet);
				this.signerSet = true;
				return
			default:
				throw new Error(`Unknown signer type passed: ${t}`)
		}
	}

	async getPKH(): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to create PKH")
		}

		// Under some circumstances, the signer may not be set due to quickly
		// calling this function following instanciating it, and given that the 
		// contstructor must by synchronous. If it is unset, it is not dangerous
		// to reset it.
		if (!this.signerSet) {
			await this.setSigner();
		}

		let t = this.signer.type;
		switch (this.signer.type) {
			case "key":
			case "secret":
				return await this.tezos.signer.publicKeyHash();
			case "wallet":
				return await this.signer.wallet.getPKH();
			default:
				throw new Error(`Unknown signer type passed: ${t}`)
		}
	}

	// end the debate before it begins.
	private trailingSlash(s: String): string {
		return s[s.length - 1] === "/" ? "" : "/"
	}

	async readState(contractAddress: string): Promise<ManifestJson> {
		let prefix = this.tzktBase;

		let contract = await this.tezos.contract.at(contractAddress);
		let storage = await contract.storage();

		const {
			// @ts-ignore
			admins: admins_bigmap,
			// @ts-ignore
			hosts: hosts_bigmap,
			// @ts-ignore
			readers: readers_bigmap,
			// @ts-ignore
			writers: writers_bigmap
		} = storage;
		const adminSearch = await axios.get(`${prefix}/v1/bigmaps/${admins_bigmap.id}/keys`);
		if (adminSearch.status !== 200) {
			throw new Error(`Failed in explorer request: ${adminSearch.statusText}`);
		}
		const admins = adminSearch.data.filter(key => key.active).map(key => key.key);

		const hostSearch = await axios.get(`${prefix}/v1/bigmaps/${hosts_bigmap.id}/keys`);
		if (hostSearch.status !== 200) {
			throw new Error(`Failed in explorer request: ${hostSearch.statusText}`);
		}
		const hosts = hostSearch.data.filter(key => key.active).reduce((acc, key) => {
			acc[key.key] = key.value;
			return acc;
		}, {});

		const readerSearch = await axios.get(`${prefix}/v1/bigmaps/${readers_bigmap.id}/keys`);
		if (readerSearch.status !== 200) {
			throw new Error(`Failed in explorer request: ${readerSearch.statusText}`);
		}
		const readers = readerSearch.data.filter(key => key.active).map(key => key.key);

		const writerSearch = await axios.get(`${prefix}/v1/bigmaps/${writers_bigmap.id}/keys`);
		if (writerSearch.status !== 200) {
			throw new Error(`Failed in explorer request: ${writerSearch.statusText}`);
		}
		const writers = adminSearch.data.filter(key => key.active).map(key => key.key);

		return {
			admins,
			hosts,
			readers,
			writers
		}
	}

	// originate creates a new smart contract from an optional, original set of
	// claims. returns the address of the created contract or throws an err
	async originate(manifest: ManifestJson = { admins: [], hosts: {}, readers: [], writers: [] }): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to originate");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let pkh = await this.getPKH();

		if (manifest.admins.length === 0) {
			manifest.admins.push(pkh)
		}

		let originationOp, contractAddress;
		let args = {
			code: contractCode,
			storage: jsonToStorage(manifest),
		};

		if (this.signer.type === "wallet") {
			let opSender = await this.tezos.wallet.originate(args);
			originationOp = await opSender.send();

			let c = await originationOp.contract();
			contractAddress = c.address;
		} else {
			originationOp = await this.tezos.contract.originate(args);

			await originationOp.confirmation(CONFIRMATION_CHECKS);
			contractAddress = originationOp.contractAddress;
		}

		return contractAddress;
	}

	async getContract(address: string): Promise<ContractAbstraction<ContractProvider | taquito.Wallet>> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to getContract");
		}
		let t = this.signer.type;
		switch (this.signer.type) {
			case "key":
			case "secret":
				return this.tezos.contract.at(address);
			case "wallet":
				return this.tezos.wallet.at(address);
			default:
				throw new Error(`Unknown signer type: ${t}`)
		}
	}

	// addHosts takes a contractAddress and a list of host IDs,
	// adds them to the contract with the addHosts entrypoint returns the hash of
	// the transaction
	async addHosts(contractAddress: string, hosts: { [key: string]: string[] }): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to addHosts");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let contract = await this.getContract(contractAddress);

		let entrypoints = Object.keys(contract.methods);
		if (entrypoints.includes('updateHosts')) {
			let op: any = await contract.methods.main({ hosts_add: taquito.MichelsonMap.fromLiteral(hosts) }, true).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to add hosts.`)
		}
	}

	// removeHosts takes a contractAddress and a list of host IDs,
	// removes the entries from the contract storage with the
	// removeClaims entrypoint and returns the hash of the transaction
	async removeHosts(contractAddress: string, hosts: Array<string>): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to removeHosts");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let contract = await this.getContract(contractAddress);

		let entrypoints = Object.keys(contract.methods);
		if (entrypoints.includes('updateHosts')) {
			let op: any = await contract.methods.main({ hosts_remove: hosts }, false).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to remove hosts.`)
		}
	}

	// addAdmins takes a contractAddress and a list of admin PKHs,
	// adds them to the contract with the addReaders entrypoint returns the hash of
	// the transaction
	async addAdmins(contractAddress: string, admins: Array<string>): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to addAdmins");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let contract = await this.getContract(contractAddress);

		let entrypoints = Object.keys(contract.methods);
		if (entrypoints.includes('updateAdmins')) {
			let op: any = await contract.methods.main({ admins_add: admins }, true).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to add admins.`)
		}
	}

	// removeAdmins takes a contractAddress and a list of admin PKHs,
	// removes the entries from the contract storage with the
	// removeAdmins entrypoint and returns the hash of the transaction
	async removeAdmins(contractAddress: string, admins: Array<string>): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to removeAdmins");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let contract = await this.getContract(contractAddress);

		let entrypoints = Object.keys(contract.methods);
		if (entrypoints.includes('updateAdmins')) {
			let op: any = await contract.methods.updateAdmins({ admins_remove: admins }, false).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to remove admins.`)
		}
	}

	// addReaders takes a contractAddress and a list of reader IDs,
	// adds them to the contract with the addReaders entrypoint returns the hash of
	// the transaction
	async addReaders(contractAddress: string, readers: Array<string>): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to addReaders");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let contract = await this.getContract(contractAddress);

		let entrypoints = Object.keys(contract.methods);
		if (entrypoints.includes('updateReaders')) {
			let op: any = await contract.methods.updateReaders({ readers_add: readers }, true).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to add readers.`)
		}
	}

	// removeReaders takes a contractAddress and a list of reader IDs,
	// removes the entries from the contract storage with the
	// removeReaders entrypoint and returns the hash of the transaction
	async removeReaders(contractAddress: string, readers: Array<string>): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to removeReaders");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let contract = await this.getContract(contractAddress);

		let entrypoints = Object.keys(contract.methods);
		if (entrypoints.includes('updateReaders')) {
			let op: any = await contract.methods.main({ readers_remove: readers }, false).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to remove readers.`)
		}
	}
}
