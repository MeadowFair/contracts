'use strict';
const { BigNumber } = require('@ethersproject/bignumber');
const BN = require('bn.js');
const fs = require("fs");
class Tool {

    static getNetwork() {
        let network = '';
        let params = process.argv.slice(2);
        for (let i in params) {
            if (params[i].startsWith('--network=')) {
                network = params[i].slice('--network='.length);
            }
        }
        if (network == '') {
            network = 'development';
        }
        return network;
    }

    static getContracts() {
        const network = this.getNetwork();
        return require("../contracts-" + network + ".json");
    }

    static async saveContracts(contracts) {
        const network = this.getNetwork();
        return await fs.writeFileSync(__dirname + "/../contracts-" + network + ".json",
            JSON.stringify(contracts, null, "\t"));
    }


    static getConfig() {
        const network = this.getNetwork();
        return require("../config-" + network + ".json");
    }

    static async saveConfig(contracts) {
        const network = this.getNetwork();
        return await fs.writeFileSync(__dirname + "/../config-" + network + ".json",
            JSON.stringify(contracts, null, "\t"));
    }

    static getTest() {
        const network = this.getNetwork();
        return require("../test-" + network + ".json");
    }

    static printReceipt(name, receipt) {
        let logs = receipt.logs;
        receipt = this.onlyFields(receipt.receipt, ['transactionHash', 'blockNumber', 'from', 'to', 'status', 'gasUsed']);
        for (let log_i in logs) {
            logs[log_i].args = Tool.filterFields(logs[log_i].args);
        }
        console.log({ name, receipt });
        if (logs.length > 0) {
            console.log('logs=>', logs);
        }
    }

    static filterFields(obj) {
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
        if (obj instanceof BigNumber) {
            return obj.toString();
        }
        if (typeof obj === 'boolean') {
            return obj;
        }
        let newObj = {};
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

    static onlyFields(obj, fields) {
        let newObj = {};
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            newObj[field] = this.filterFields(obj[field]);
        }
        return newObj;
    }
}
module.exports = Tool;