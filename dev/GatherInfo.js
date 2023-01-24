/** @param {NS} ns */
export async function main(ns) {
    if (ns.args.length < 2) {
        throw new Error("Please specify a host and port!");
    }

    const target = new Target(ns, ns.args[0], ns.args[1]);

    target.analyze();
}

const Target = class {
    /** @type {NS} */
    ns;
    /** @type {string} */
    host;
    /** @type {NetscriptPort} */
    port;
    /** @type {number} */
    portNumber;

    /**
     * @param {NS} ns The NS object.
     * @param {string} host The host to gather info on.
     * @param {number} port The port to write to.
     */
    constructor(ns, host, port) {
        this.ns = ns;
        this.host = host;
        this.port = ns.getPortHandle(port);
        this.portNumber = port;

        if (!ns.serverExists(host)) {
            throw new Error(`Server ${host} does not exist!`);
        }
    }

    /**
     * Analyze the target and write an object to the configured port
     * that contains the results.
     */
    analyze() {
        const host = this.host;

        const r = {
            weakenTime: this.ns.getWeakenTime(host),
            growTime: this.ns.getGrowTime(host),
            hackTime: this.ns.getHackTime(host),

            securityLevel: this.ns.getServerSecurityLevel(host),
            serverGrowth: this.ns.getServerGrowth(host),


            minSecurityLevel: this.ns.getServerMinSecurityLevel(host),

            maxMoney: this.ns.getServerMaxMoney(host),
            moneyAvailable: this.ns.getServerMoneyAvailable(host)
        }

        let text = JSON.stringify(r, null, 4);

        if (this.port.tryWrite(text)) {
            this.ns.toast(
                `Successfully analyzed ${this.host} and wrote data to ${this.portNumber}!`,
                "success"
            );
        } else {
            this.ns.toast(`Unable to write to port ${this.port}`, "error");
        }
    }
}