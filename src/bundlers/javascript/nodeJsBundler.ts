import path from "path";
import fs from "fs";
import webpackNodeExternals from "webpack-node-externals";
import {
  createTemporaryFolder,
  deleteFolder,
  getAllFilesFromCurrentPath,
  getFileDetails,
  readUTF8File,
  writeToFile
} from "../../utils/file";
import {
  BundlerInput,
  BundlerInterface,
  BundlerOutput,
  AccessDependenciesPlugin
} from "../bundler.interface";
import FileDetails from "../../models/fileDetails";
import { default as fsExtra } from "fs-extra";
import { lambdaHandler } from "./lambdaHander";
import log from "loglevel";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import { bundle } from "../../utils/webpack";
import { debugLogger } from "../../utils/logging";
import { ModuleOptions } from "webpack";
import { EsbuildPlugin } from "esbuild-loader";
import esbuild, { BuildResult, Plugin } from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";

export class NodeJsBundler implements BundlerInterface {
  async #copyDependencies(dependenciesInfo: any, tempFolderPath: string, mode: "development" | "production") {
    const nodeModulesPath = path.join(tempFolderPath, "node_modules");

    if (mode === "development") {
      // copy node_modules folder to tmp folder if node_modules folder does not exist
      if (!fs.existsSync(nodeModulesPath) && fs.existsSync(path.join(process.cwd(), "node_modules"))) {
        await fsExtra.copy(path.join(process.cwd(), "node_modules"), nodeModulesPath);
      }
      return
    }

    // copy all dependencies to node_modules folder
    await Promise.all(
      dependenciesInfo.map((dependency: any) => {
        const dependencyPath = path.join(nodeModulesPath, dependency.name);
        return fsExtra.copy(dependency.path, dependencyPath);
      })
    );
  }

  async #copyNonJsFiles(tempFolderPath: string) {
    const allNonJsFilesPaths = (await getAllFilesFromCurrentPath()).filter(
      (file: FileDetails) => {

        // filter js files, node_modules and folders
        return (
          file.extension !== ".js" &&
          !file.path.includes("node_modules") &&
          !fs.lstatSync(file.path).isDirectory()
        );
      }
    );

    // iterare over all non js files and copy them to tmp folder
    await Promise.all(
      allNonJsFilesPaths.map((filePath: FileDetails) => {
        // get folders array
        const folders = filePath.path.split('/');
        // remove file name from folders array
        folders.pop();
        // create folder structure in tmp folder
        const folderPath = path.join(tempFolderPath, ...folders);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        // copy file to tmp folder
        const fileDestinationPath = path.join(tempFolderPath, filePath.path);
        return fs.promises.copyFile(filePath.path, fileDestinationPath);
      })
    );
  }

  async #bundleJavascriptCode(
    filePath: string,
    tempFolderPath: string,
    mode: "development" | "production"
  ): Promise<void> {
    const outputFile = `module.mjs`;

    // delete module.js file if it exists
    if (fs.existsSync(path.join(tempFolderPath, outputFile))) {
      fs.unlinkSync(path.join(tempFolderPath, outputFile));
    }

    const module: ModuleOptions = {
      rules: [
        // {
        //     test: /\.jsx?$/,
        //     use: [
        //         {
        //             loader: "esbuild-loader",
        //             options: {
        //                 target: "es2015",
        //             }
        //         }
        //     ],
        //     exclude: /really\.html/
        // },
        {
          test: /\.html$/,
          loader: "dumb-loader",
          exclude: /really\.html/
        }
      ]
    };

    // Write a esbuild plugin that appends the following lines to the top of the file after it is bundled
    // import { createRequire } from 'module';
    // const require = createRequire(import.meta.url);
    const supportImport: Plugin = {
      name: 'esbuild-plugin',
      setup(build) {
        build.onLoad({ filter: /\.m?js$/ }, async (args) => {
          const contents = await fs.promises.readFile(args.path, 'utf8')
          return {
            contents: `import { createRequire } from 'module';
          const require = createRequire(import.meta.url);
          ${contents}`,
            loader: 'js'
          }
        })
      }
    }

    console.log("Bundling mode: " + mode + " " + tempFolderPath)
    // eslint-disable-next-line no-async-promise-executor
    const output: BuildResult = await esbuild.build(
      {
        entryPoints: [filePath],
        bundle: true,
        format: "esm",
        // target: "es2015",
        platform: "node",
        outfile: path.join(tempFolderPath, outputFile),
        plugins: [nodeExternalsPlugin(), supportImport],
      }
    )
    // const output: any = await bundle(
    //   "./" + filePath,
    //   mode,
    //   [webpackNodeExternals()],
    //   module, 
    //   [],
    //   tempFolderPath,
    //   outputFile
    // );

    if (output.errors.length > 0) {
      output.errors.forEach((error: any) => {
        // if (output != undefined) {
        //   output.forEach((error: any) => {
        // log error red
        log.error("\x1b[31m", "Syntax error:");

        if (error.moduleIdentifier?.includes("|")) {
          log.info(
            "\x1b[37m",
            "file: " +
            error.moduleIdentifier?.split("|")[1] +
            ":" +
            error.loc?.split(":")[0]
          );
        } else {
          log.info(
            "file: " + error.moduleIdentifier + ":" + error.loc?.split(":")[0]
          );
        }

        // get first line of error
        const firstLine = error.message.split("\n")[0];
        log.info(firstLine);

        //get message line that contains '>' first character
        const messageLine: string = error.message
          .split("\n")
          .filter((line: any) => line.startsWith(">") || line.startsWith("|"))
          .join("\n");
        if (messageLine) {
          log.info(messageLine);
        }
      });
      throw "Compilation failed";
    }
  }

  async #deleteTypeModuleFromPackageJson(tempFolderPath: string) {
    const packageJsonPath = path.join(tempFolderPath, "package.json");

    // check if package.json file exists
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    // read package.json file
    const packageJson: any = JSON.parse(
      await readUTF8File(packageJsonPath) || "{}"
    );

    // delete type module from package.json
    delete packageJson.type;

    // write package.json file
    await writeToFile(tempFolderPath, "package.json", JSON.stringify(packageJson, null, 2));
  }

  async bundle(input: BundlerInput): Promise<BundlerOutput> {
    const mode =
      (input.extra ? input.extra["mode"] : undefined) || "production";
    const tmpFolder = (input.extra ? input.extra["tmpFolder"] : undefined) || undefined;

    if (mode === "development" && !tmpFolder) {
      throw new Error("tmpFolder is required in development mode.")
    }

    const temporaryFolder = mode === "production" ? await createTemporaryFolder() : tmpFolder;


    // 1. Run webpack to get dependenciesInfo and the packed file
    debugLogger.debug(`[NodeJSBundler] Get the list of node modules and bundling the javascript code for file ${input.path}.`)
    await Promise.all([
      this.#bundleJavascriptCode(
        input.configuration.path,
        temporaryFolder,
        mode
      ),
      mode === "development" ? this.#copyDependencies(null, temporaryFolder, mode) : Promise.resolve()
    ]);

    debugLogger.debug(`[NodeJSBundler] Copy non js files and node_modules for file ${input.path}.`)
    // 2. Copy non js files and node_modules and write index.mjs file
    await Promise.all([
      this.#copyNonJsFiles(temporaryFolder),
      mode === "production" ? this.#copyDependencies(input.extra!.dependenciesInfo, temporaryFolder, mode) : Promise.resolve(),
      writeToFile(temporaryFolder, "index.mjs", lambdaHandler(`"${input.configuration.name}"`))
    ]);

    // 3. Delete type: module from package.json
    await this.#deleteTypeModuleFromPackageJson(temporaryFolder);

    return {
      ...input,
      path: temporaryFolder,
      extra: {
        originalPath: input.path,
        dependenciesInfo: input.extra!.dependenciesInfo
      }
    };
  }
}
