import { GptCaller, Languages, JsTypes, Frameworks } from "@genezio-sdk/genezio-gpt_us-east-1";
import { fileExists, writeToFile } from "../utils/file.js";
import { printAdaptiveLog } from "../utils/logging.js";
import { exit } from "process";
import path from "path";
import log from "loglevel";
import colors from "colors";

export async function generateDbCommand(
    language = "",
    modelName = "",
    jsType = "",
    dbframework = "",
    columns = "",
    _path = "",
) {
    if (language === undefined || language === "") {
        throw new Error(
            "Please provide a language. Valid languages are 'typescript' and 'javascript'.",
        );
    }

    if (!["typescript", "javascript"].includes(language)) {
        throw new Error("Invalid language. Valid languages are 'typescript' and 'javascript'.");
    }

    if (modelName === undefined || modelName === "") {
        throw new Error("Please provide a model name.");
    }

    if (jsType === undefined || jsType === "") {
        throw new Error("Please provide a js type. Valid js types are 'esm' and 'commonjs'.");
    }

    if (!["esm", "commonjs"].includes(jsType)) {
        throw new Error("Invalid js type. Valid js types are 'esm' and 'commonjs'.");
    }

    if (dbframework === undefined || dbframework === "") {
        throw new Error(
            "Please provide a db framework. Valid db frameworks are 'mongoose' and 'sequelize'.",
        );
    }

    if (!["mongoose", "sequelize"].includes(dbframework)) {
        throw new Error(
            "Invalid db framework. Valid db frameworks are 'mongoose' and 'sequelize'.",
        );
    }

    if (_path === undefined || _path === "") {
        throw new Error("Please provide a path.");
    }

    if (await fileExists(_path)) {
        throw new Error("There is already a file with the same name in the specified path.");
    }

    log.info(
        `\n${colors.yellow(
            "Warning! This command is experimental and may not work as expected and/or may change in the future.\n",
        )}`,
    );

    printAdaptiveLog("Generating db model", "start");

    const res = await GptCaller.createDBModel({
        modelName: modelName,
        language: language as Languages,
        framework: dbframework as Frameworks,
        jsType: jsType as JsTypes,
        columns: columns,
    });

    if (!res.success) {
        printAdaptiveLog("Generating db model", "error");
        throw new Error(res.message);
    }

    const content = res.content;

    const fileName = _path.split(path.sep).pop();
    const filePath = _path.split(path.sep).slice(0, -1).join(path.sep);

    await writeToFile(filePath as string, fileName as string, content, true).catch((err) => {
        printAdaptiveLog("Generating db model", "error");
        throw new Error(err);
    });

    printAdaptiveLog("Generating db model", "end");

    log.info(`\n${colors.green("Success!")} Model generated at: ${colors.cyan(_path)}\n`);

    exit(0);
}
