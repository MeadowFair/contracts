'use strict';
import { BigNumber } from '@ethersproject/bignumber';
import hre from 'hardhat';
import { ethers } from 'hardhat';
const networkName = hre.network.name;

import fs from 'fs';
export class Tool {
    static getContracts(): any {
        const path = __dirname + '/../network/' + networkName + '/contracts.json';
        try {
            const res = fs.readFileSync(path);
            if (res.toString()) {
                return JSON.parse(res.toString());
            }
        } catch (e) {}
        var _dir = __dirname + '/../network/' + networkName;
        if (!fs.existsSync(_dir)) {
            fs.mkdirSync(_dir, { recursive: true });
        }
        fs.writeFileSync(path, '{}');
        return {};
    }

    static async saveContracts(contracts: Array<string>) {
        const path = __dirname + '/../network/' + networkName + '/contracts.json';
        return fs.writeFileSync(path, JSON.stringify(contracts, null, '\t'));
    }

    static getConfig() {
        const path = __dirname + '/../network/' + networkName + '/config.json';
        return require(path);
    }

    static async saveConfig(contracts: Array<string>) {
        const path = __dirname + '/../network/' + networkName + '/config.json';
        return fs.writeFileSync(path, JSON.stringify(contracts, null, '\t'));
    }

    static getTest() {
        const path = __dirname + '/../network/' + networkName + '/test.json';
        return require(path);
    }

    static printDeploy(receipt: any, name?: string | '') {
        receipt = this.onlyFields(receipt, ['creates', 'nonce', 'gasPrice', 'from', 'hash']);
        if (name) {
            console.log(name, receipt);
        } else {
            console.log(receipt);
        }
    }

    static async printReceipt(tx: any, name?: string | '', contracts?: Array<any>) {
        let receipt = await tx.wait();
        let _events = receipt.events;
        receipt = this.onlyFields(receipt, ['transactionHash', 'status', 'gasUsed', 'effectiveGasPrice', 'from', 'to']);
        receipt.nonce = tx.nonce;
        if (name) {
            console.log(name, receipt);
        } else {
            console.log(receipt);
        }
        if (_events && _events.length > 0) {
            console.log('events>>>');
            for (let log_i in _events) {
                if (_events[log_i].event) {
                    console.log(_events[log_i].event, Tool.filterFields(_events[log_i].args));
                } else {
                    for (let j in contracts) {
                        if (contracts[j].address == _events[log_i].address) {
                            const _event = contracts[j].interface.parseLog(_events[log_i]);
                            console.log(_events[log_i].address, _event.name, Tool.filterFields(_event.args));
                        }
                    }
                }
            }
            console.log('<<<');
        }
    }

    static filterFields(obj: any) {
        if (typeof obj === 'string' || obj instanceof String) {
            return obj.toString();
        }
        if (obj === undefined) {
            return 'undefined';
        }
        if (typeof obj === 'number') {
            return obj.toString();
        }
        if (typeof obj === 'object' && obj.constructor.name == 'BN') {
            return obj.toString();
        }
        if (obj.toNumber) {
            return obj.toString();
        }
        if (obj instanceof BigNumber) {
            return obj.toString();
        }
        if (typeof obj === 'boolean') {
            return obj;
        }
        let newObj: any = {};
        let skip = -1;
        let count = 0;
        for (let field in obj) {
            if (field.toString() !== count.toString()) {
                skip = count;
                if (field === '__length__') {
                    skip++;
                }
                break;
            }
            count++;
        }
        if (skip === -1) {
            newObj = [];
        }
        let i = 0;
        for (let field in obj) {
            i++;
            if (i <= skip) {
                continue;
            }
            if (obj[field] instanceof Array) {
                newObj[field] = [];
                for (let i = 0; i < obj[field].length; i++) {
                    newObj[field].push(this.filterFields(obj[field][i]));
                }
            } else {
                newObj[field] = this.filterFields(obj[field]);
            }
        }
        return newObj;
    }

    static onlyFields(obj: any, fields: Array<string>) {
        let newObj: any = {};
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            newObj[field] = this.filterFields(obj[field]);
        }
        return newObj;
    }

    static async getAccounts(networkName: string) {
        const { parsed } = require('dotenv').config({ path: `.env.${networkName}` });
        let MNEMONIC;
        if (parsed) {
            MNEMONIC = parsed.MNEMONIC.split(',');
        } else {
            MNEMONIC = [];
        }
        let accounts = [];
        for (let i = 0; i < MNEMONIC.length; i++) {
            let wallet = new ethers.Wallet(MNEMONIC[i]);
            accounts.push(await ethers.getImpersonatedSigner(wallet.address));
        }
        return accounts;
    }
}
