/** @param {NS} ns */
export async function main(ns) {
    if (ns.args.length < 1) {
        throw new Error("Expected 1 arg");
    }

    ns.tprint(ns.scan(ns.args[0]));
}