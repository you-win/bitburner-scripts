/** @param {NS} ns */
export async function main(ns) {
    throw Error("Should not be run as a standalone script.");
}

/**
 * A command parser. Should not have any cost to run.
 * 
 * All configuration works as a builder.
 */
export const Argparse = class {
    /** @type {string} */
    name = "Default Parser";
    /** @type {Map<string, number>} */
    version = {
        major: 0,
        minor: 1,
        patch: 0,
    };
    /** @type {Array<Command>} */
    commands = [];

    /**
     * @param {string} name The name of the entire parser.
     */
    constructor(name) {
        this.name = name;
    }

    /**
     * Override the standard string representation.
     * 
     * @return {string} The parser represented in JSON format.
     */
    toString() {
        return JSON.stringify({
            name: this.name
        }, null, 4);
    }

    /**
     * Get the version of the parser used.
     * 
     * @return {string} The semver version.
     */
    getVersion() {
        return `${this.version.major}.${this.version.minor}.${this.version.patch}`;
    }

    /**
     * Add a `Command` to be parsed.
     * 
     * @param {Command} command The `Command` object to add.
     * 
     * @return {Argparse} Continue building the parser.
     */
    addCommand(command) {
        this.commands.push(command);

        return this;
    }

    /**
     * Handle the given arguments.
     * 
     * @param {Array<string|number>} args The terminal arguments passed to the script.
     * 
     * @return {string|void} The result of the command if there was a result.
     */
    async handle(args) {
        const Marker = class {
            constructor(name, idx) {
                this.name = name;
                this.idx = idx;
            }
        };
        let flags = [];
        let params = []; // TODO currently unused
        args.forEach((arg, idx) => {
            let marker = new Marker(arg.toString(), idx);
            if (typeof (arg) === "number") {
                params.push(marker);
            }
            else if (arg.startsWith("-")) {
                flags.push(marker);
            } else {
                params.push(marker);
            }
        });

        if (params.length < 1) {
            return this.help();
        }

        /** @type {Command} */
        let command = this.commands.find(cmd => cmd.name === params[0].name);
        if (command === undefined || command === null) {
            return this.help();
        }

        // Has to be done after the command is found, otherwise we cannot access the command's help function
        for (let i = 0; i < args.length; i++) {
            if (["--help", "-h"].includes(args[i])) {
                return command.help();
            }
        }

        let usedIndices = [];
        /** @type {Map<String, Array<String>>} */
        let inputFlags = new Map();
        for (const flag of command.flags) {
            /** @type {Marker} */
            let inputFlag = flags.find(marker => marker.name === flag.name);
            // Check aliases only if the flag does not match the regular name
            if (inputFlag === undefined || inputFlag === null) {
                let i = 0;
                while (i < flag.aliases.length - 1) {
                    let alias = flag.aliases[i];
                    inputFlag = flags.find(marker => marker.name === alias);
                    if (!inputFlag === undefined || !inputFlag === null) {
                        break;
                    }

                    i += 1;
                }
            }

            if (inputFlag === undefined || inputFlag === null) {
                if (flag.required) {
                    return command.help();
                }
                continue;
            }

            const expectedArgs = flag.expectedArgs;
            let i = inputFlag.idx + 1;

            let allFound = false;
            let foundArgs = [];
            while (i <= args.length - 1) {
                foundArgs.push(args[i]);
                usedIndices.push(i);
                if (foundArgs.length === expectedArgs) {
                    allFound = true;
                    break;
                }
                i += 1;
            }

            if (flag.expectedArgs !== 0 && !allFound) {
                return command.help();
            }

            inputFlags.set(flag.name, foundArgs);
        }

        let passedArgs = [];
        args.forEach((val, idx) => {
            if (idx !== 0 && !usedIndices.includes(idx)) {
                passedArgs.push(val);
            }
        });

        if (passedArgs.length !== command.expectedArgs) {
            return command.help();
        }

        return await command.execute(passedArgs, inputFlags);
    }

    /**
     * Generate help text from all registered commands.
     * 
     * @return {string} The help text for all commands.
     */
    help() {
        // Start with 1 newline since the terminal always starts printing next to the script location
        let helpText = `\nCli ${this.getVersion()}\n\nCommands:\n`;

        let commandCount = this.commands.length;

        this.commands.forEach((command, idx) => {
            helpText += `${command.name} - ${command.description}`
            if (idx < commandCount) {
                helpText += "\n";
            }
        });

        return helpText;
    }
}

export const Command = class {
    /** @type {string} */
    name = "";
    /** @type {string} */
    description = "";
    /** @type {function} */
    func = null;
    /** @type {number} */
    expectedArgs = 0;
    /** @type {Array<String>} */
    argDescriptions = []
    /** @type {Array<Flag>} */
    flags = [];
    /** @type {Array<string>} */
    aliases = [];

    constructor(name) {
        this.name = name;
    }

    /**
     * Set the description for this `Command`.
     * 
     * @param {string} description The description for the `Command`.
     * This description will be used in the parser's help text.
     * 
     * @return {Command} Continue building the `Command`.
     */
    setDescription(description) {
        this.description = description;

        return this;
    }

    /**
     * Set the function to be executed by this `Command`.
     * 
     * @param {function} func The function to execute.
     * 
     * @return {Command} Continue building the `Command`.
     */
    setFunc(func) {
        this.func = func;

        return this;
    }

    /**
     * Sets the number of arguments to expect for this command.
     * 
     * `Flag`s do not count as arguments!
     * 
     * @param {number} expectedArgs The number of expected args.
     * 
     * @return {Command} Continue building the Command.
     */
    setExpectedArgs(expectedArgs) {
        this.expectedArgs = expectedArgs;

        return this;
    }

    /**
     * Add a `Flag` to this command.
     * 
     * @param {Flag} flag The `Flag` object to associate with this command.
     * 
     * @return {Command} Continue building the `Command`.
     */
    addFlag(flag) {
        this.flags.push(flag);

        return this;
    }

    /**
     * Return all flags that are marked as `required`.
     * 
     * @return {Array<Flag>} The required flags for the `Command`.
     */
    getRequiredFlags() {
        let r = [];

        for (const flag of this.flags) {
            if (flag.required) {
                r.push(flag);
            }
        }

        return r;
    }

    /**
     * Add an alias for this command.
     * 
     * @param {string} alias The alias to use.
     * 
     * @return {Command} Continue building the `Command`.
     */
    addAlias(alias) {
        this.aliases.push(alias);

        return this;
    }

    /**
     * Add a description for a positional argument. These _must_ be added in the order
     * that they should be displayed.
     * 
     * @param {string} text The description for a positional argument.
     * 
     * @return {Command} Continue building the `Command`.
     */
    addArgDescription(text) {
        this.argDescriptions.push(text);

        return this;
    }

    /**
     * @param {Array<string|number>} params The params passed to the `Command`.
     * @param {Map<string, Array<String>>} flags The flags passed to the `Command`.
     * 
     * @return {Promise<any>|any} The (possibly async) result of the function. 
     */
    async execute(params, flags) {
        if (!params.length === this.expectedArgs) {
            return null;
        }

        return await this.func(params, flags)
    }

    /**
     * @return {string} The help text for this `Command`.
     */
    help() {
        let text = `\nName: ${this.name}\nDescription: ${this.description}\nExpected args: ${this.expectedArgs}\n`;
        if (this.argDescriptions.length > 0) {
            text += "\nPositional args:\n";
            this.argDescriptions.forEach((val, idx) => {
                text += `${idx} - ${val}\n`
            });
        }
        if (this.flags.length > 0) {
            text += "\nFlags:\n";
            for (const flag of this.flags) {
                if (flag.required) {
                    text += `${flag.name} - ${flag.description} (required)\n`;
                } else {
                    text += `${flag.name} - ${flag.description}\n`;
                }

            }
        }

        return text;
    }
}

/**
 * Very similar to `Command` except `Flags` cannot contain `Flags` of their own.
 */
export const Flag = class {
    /** @type {string} */
    name = "";
    /** @type {string} */
    description = "";
    /** @type {number} */
    expectedArgs = 0;
    /** @type {Array<string>} */
    aliases = [];
    /** @type {boolean} */
    required = false;

    constructor(name) {
        this.name = name;
    }

    /**
     * Set the description for this `Flag`.
     * 
     * @param {string} description The description for the `Flag`.
     * This description will be used in the parser's help text.
     * 
     * @return {Flag} Continue building the `Flag`.
     */
    setDescription(description) {
        this.description = description;

        return this;
    }

    /**
     * Set the number of args to be parsed for this `Flag`.
     * 
     * @param {number} expectedArgs The number of args to expect.
     * 
     * @return {Flag} Continue building the `Flag`.
     */
    setExpectedArgs(expectedArgs) {
        this.expectedArgs = expectedArgs;

        return this;
    }

    /**
     * Adds an alias for this flag. Generally used for adding shorthand flags.
     * e.g. --help and -h
     * 
     * @param {string} alias The alias for the `Flag`.
     * 
     * @return {Flag} Continue building the `Flag`.
     */
    addAlias(alias) {
        this.aliases.push(alias);

        return this;
    }

    /**
     * Sets if the `Flag` is required or not.
     * 
     * @param {boolean} required If the `Flag` is required.
     * 
     * @return {Flag} Continue building the `Flag`.
     */
    setRequired(required) {
        this.required = required;

        return this;
    }
}