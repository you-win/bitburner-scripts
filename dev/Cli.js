import { Argparse, Command, Flag } from "/dev/lib/Argparse.js";

/** @param {NS} ns */
export async function main(ns) {
    let parser = new Argparse("test");
    parser
        .addCommand(
            new Command("ping")
                .setDescription("A test command")
                .setExpectedArgs(0)
                .setFunc((_params, _flags) => {
                    ns.tprint("pong");
                })
        )
        .addCommand(
            new Command("gather-info")
                .setDescription("Gather info on a given host")
                .setExpectedArgs(2)
                .addFlag(
                    new Flag("--host")
                        .setDescription("The hostname to connect to")
                        .setRequired(true)
                        .setExpectedArgs(1)
                )
                .addFlag(
                    new Flag("--port")
                        .setDescription("The port to read/write data on")
                        .setRequired(true)
                        .setExpectedArgs(1)
                )
                .setFunc(async (_params, flags) => {
                    const host = flags.get("--host")[0];
                    const port = flags.get("--port")[0];
                    const portHandle = ns.getPortHandle(port);

                    let pid = ns.run(gatherInfoScript, 1, host, port);
                    verifyPid(pid);

                    while (ns.scriptRunning("/dev/GatherInfo.js", ns.getHostname())) {
                        await ns.sleep(100);
                    }

                    let results = [];

                    while (!portHandle.empty()) {
                        const data = portHandle.read();

                        if (data === "NULL PORT DATA") {
                            throw new Error("Read invalid data from port!");
                        }

                        try {
                            results.push(JSON.parse(data));
                        } catch (e) {
                            results.push(data);
                        }
                    }

                    return results;
                })
        )
        .addCommand(new Command("scan")
            .setDescription("Scan a host")
            .setExpectedArgs(1)
            .addArgDescription("The host to scan.")
            .setFunc(async (params, _flags) => {
                let pid = ns.run("/dev/scan/Basic.js", 1, params[0]);
                verifyPid(pid);
            })
        )
        .addCommand(new Command("scan-all")
            .setDescription("Scan all hosts connected to the current host")
            .setExpectedArgs(0)
            .setFunc(async (_params, _flags) => {
                let pid = ns.run("/dev/scan/All.js", 1);
                verifyPid(pid);
            })
        )
        // .addCommand(new Command("remote-run")
        //     .setDescription("Run a command on a remote host")
        //     .setExpectedArgs(2)
        //     .setFunc(async (params, _flags) => {
        //         let pid = ns.run(...params);
        //         if (pid === 0) {
        //             throw new Error("Unable to execute remote-run");
        //         }
        //     })
        // )
        // Intentionally on a new line so it's not super annoying to add new commands
        ;

    let result = await parser.handle(ns.args);
    if (result === null || result === undefined) {
        return;
    }

    ns.tprint(result);
}

/**
 * Verifies that a given PID is not 0. If it is 0, a new `Error` is thrown.
 * @param {number} pid The PID to verify
 */
const verifyPid = (pid) => {
    if (pid === 0) {
        throw new Error("Invalid PID!");
    }
}
