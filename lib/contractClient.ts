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

export type BetterCallDevVersions = 1;
export type BetterCallDevNetworks = 'mainnet' | 'delphinet' | 'edonet' | 'florencenet' | 'sandboxnet';

// Configurable Better Call Dev to allow local development.
// Defaults to:
// {
//     base: "https://api.better-call.dev",
//     network: "mainnet",
//     version: 1
// }
export interface BetterCallDevOpts {
	base: string,
	network: BetterCallDevNetworks,
	version: BetterCallDevVersions,
}

interface OrbitStorage {
	admins: taquito.MichelsonMap<string, null>,
	hosts: taquito.MichelsonMap<string, string[]>
}

interface ManifestJson {
	admins: string[],
	hosts: { [hostId: string]: string[] }
}

export function jsonToStorage(json: ManifestJson): OrbitStorage {
	return {
		// @ts-ignore
		admins: taquito.MichelsonMap.fromLiteral(json.admins ? json.admins.reduce((acc, admin) => ({ [admin]: null, ...acc }), {}) : {}),
		// @ts-ignore
		hosts: taquito.MichelsonMap.fromLiteral(json.hosts)
	}
}

function defaultBCD(): BetterCallDevOpts {
	return {
		base: "https://api.better-call.dev",
		network: 'mainnet',
		version: 1
	}
}

export interface ContractClientOpts {
	// Defaults to:
	// {
	//     base: "https://api.better-call.dev",
	//     network: "mainnet",
	//     version: 1
	// }
	betterCallDevConfig?: BetterCallDevOpts,

	// An entry in the contract's metadata that allows it to be identified, used to 
	// prevent duplicate contracts of the same type from being originated under the
	// same owner.
	contractType: string,

	// If read only, a Signer is un-needed, such as in the use-case of a search engine.
	// Will cause some methods to fail.
	signer: Signer | false,

	// Tezos Node URL to use, such as https://mainnet-tezos.giganode.io
	nodeURL: string,

	contractAddress: string
}

export class ContractClient {
	bcd: BetterCallDevOpts;
	contractType: string;
	nodeURL: string;
	signer: Signer | false;
	signerSet: boolean;
	tezos: taquito.TezosToolkit;
	address: string;

	constructor(opts: ContractClientOpts) {
		this.bcd = opts.betterCallDevConfig || defaultBCD();
		this.contractType = opts.contractType;
		this.nodeURL = opts.nodeURL;
		this.signer = opts.signer;
		this.tezos = new taquito.TezosToolkit(this.nodeURL);
		this.tezos.addExtension(new tzip16.Tzip16Module());
		this.address = opts.contractAddress;

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

	// Create a standard base URL for all future calls.
	private bcdPrefix(): string {
		return `${this.bcd.base}${this.trailingSlash(this.bcd.base)}v${this.bcd.version}/`
	}

	// Retrieves the claimsList belonging to the given address, returns false if
	// if the contract storage does not have a claims list or expected metadata
	// throws an error in case of network issues.
	private async retrieveAndScreenContract(contractAddress: string): Promise<OrbitStorage | false> {
		let contract = await this.tezos.contract.at(contractAddress);
		let storage = await contract.storage();
		return false;
	}

	// originate creates a new smart contract from an optional, original set of 
	// claims. returns the address of the created contract or throws an err
	async originate(manifest: ManifestJson = { admins: [], hosts: {} }): Promise<string> {
		console.log(manifest)
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
	async addHosts(contractAddress: string, hosts: Array<string>): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to addHosts");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let contract = await this.getContract(contractAddress);

		let entrypoints = Object.keys(contract.methods);
		if (entrypoints.length == 1 && entrypoints.includes('updateHosts')) {
			let op: any = await contract.methods.updateHosts(hosts, true).send();

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
		if (entrypoints.length == 1 && entrypoints.includes('updateHosts')) {
			let op: any = await contract.methods.updateHosts(hosts, false).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to remove hosts.`)
		}
	}

	// addAdmins takes a contractAddress and a list of admin PKHs,
	// adds them to the contract with the addClaims entrypoint returns the hash of
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
		if (entrypoints.length == 1 && entrypoints.includes('updateAdmins')) {
			let op: any = await contract.methods.updateAdmins(admins, true).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to add admins.`)
		}
	}

	// removeAdmins takes a contractAddress and a list of admin PKHs,
	// removes the entries from the contract storage with the
	// removeClaims entrypoint and returns the hash of the transaction
	async removeAdmins(contractAddress: string, admins: Array<string>): Promise<string> {
		if (!this.signer) {
			throw new Error("Requires valid Signer options to be able to removeAdmins");
		}

		if (!this.signerSet) {
			await this.setSigner();
		}

		let contract = await this.getContract(contractAddress);

		let entrypoints = Object.keys(contract.methods);
		if (entrypoints.length == 1 && entrypoints.includes('updateAdmins')) {
			let op: any = await contract.methods.updateAdmins(admins, false).send();

			await op.confirmation(CONFIRMATION_CHECKS);
			return op.hash || op.opHash;
		} else {
			throw new Error(`No entrypoint to remove admins.`)
		}
	}
}
