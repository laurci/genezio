// Libs
import path from "path";
import Mustache from "mustache";
import { default as fsExtra } from "fs-extra";
import log from "loglevel";
import { spawnSync } from "child_process";

// Kotlin stuff
import { checkIfKotlinReqsAreInstalled } from "../../utils/kotlin.js";
import { template } from "./kotlinMain.js";
import { castArrayRecursivelyInitial, castMapRecursivelyInitial } from "../../utils/kotlinAstCasting.js";

// Utils
import { createTemporaryFolder, writeToFile } from "../../utils/file.js";
import { debugLogger } from "../../utils/logging.js";


// Models
import { BundlerInput, BundlerInterface, BundlerOutput } from "../bundler.interface.js";
import { ClassConfiguration, MethodConfiguration, ParameterType } from "../../models/projectConfiguration.js";
import { TriggerType } from "../../models/yamlProjectConfiguration.js";
import { ArrayType, AstNodeType, ClassDefinition, CustomAstNodeType, MapType, Node, Program } from "../../models/genezioModels.js";

export class KotlinBundler implements BundlerInterface {
  async #compile(folderPath: string) {
    // Compile the Kotlin code locally
    let result = spawnSync("./gradlew", ["fatJar"], { cwd: folderPath });
    if (result.status != 0) {
      log.info(result.stderr.toString());
      log.info(result.stdout.toString());
      throw new Error("Compilation error! Please check your code and try again.");
    }
    // Move the stand alone jar to its own folder
    result = spawnSync("mkdir", ["final_build"], { cwd: folderPath })
    if (result.status != 0) {
      log.info(result.stderr.toString());
      log.info(result.stdout.toString());
      throw new Error("Mkdir error! Please check your folder structure and try again.");
    }

    result = spawnSync("mv", ["./app/build/libs/app-standalone.jar", "final_build"], { cwd: folderPath })
    if (result.status != 0) {
      log.info(result.stderr.toString());
      log.info(result.stdout.toString());
      throw new Error("Mv error! Please check your folder structure and try again.");
    }

  }

  #castParameterToPropertyType(node: Node, variableName: string): string {
    let implementation = "";

    switch (node.type) {
      case AstNodeType.StringLiteral:
        implementation += `${variableName}.toString().substring(1, ${variableName}.toString().length - 1)`;
        break;
      case AstNodeType.DoubleLiteral:
        implementation += `${variableName}.toDouble()`;
        break;
      case AstNodeType.BooleanLiteral:
        implementation += `${variableName}.toString().toBoolean()`;
        break;
      case AstNodeType.IntegerLiteral:
        implementation += `Integer.parseInt(${variableName}.toString())`;
        break;
      case AstNodeType.CustomNodeLiteral:
        implementation += `Json.decodeFromString<${(node as CustomAstNodeType).rawValue}>(${variableName}.toString())`;
        break;
      case AstNodeType.ArrayType:
        implementation += castArrayRecursivelyInitial(node as ArrayType, variableName);
        break;
      case AstNodeType.MapType:
        implementation += castMapRecursivelyInitial(node as MapType, variableName);
    }

    return implementation;
  }

  #getProperCast(mainClass: ClassDefinition, method: MethodConfiguration, parameterType: ParameterType, index: number): string {
    const type = mainClass.methods.find((m) => m.name == method.name)!.params.find((p) => p.name == parameterType.name)
    return `${this.#castParameterToPropertyType(type!.paramType, `params!![${index}]`)}`
  }

  async #createRouterFileForClass(classConfiguration: ClassConfiguration, ast: Program, folderPath: string): Promise<void> {
    const mainClass = ast.body?.find((element) => {
      return element.type === AstNodeType.ClassDefinition && (element as ClassDefinition).name === classConfiguration.name
    }) as ClassDefinition;
    const classConfigPath = path.dirname(classConfiguration.path)
    const moustacheViewForMain = {
      packageName: classConfigPath.substring(classConfigPath.lastIndexOf("/") + 1),
      classFileName: path.basename(classConfiguration.path, path.extname(classConfiguration.path)),
      className: classConfiguration.name,
      jsonRpcMethods: classConfiguration.methods
        .filter((m) => m.type === TriggerType.jsonrpc)
        .map((m) => ({
          name: m.name,
          parameters: m.parameters.map((p, index) => ({
            index,
            cast: this.#getProperCast(mainClass, m, p, index),
          })),
        })),
      cronMethods: classConfiguration.methods
        .filter((m) => m.type === TriggerType.cron)
        .map((m) => ({
          name: m.name,
        })),
      httpMethods: classConfiguration.methods
        .filter((m) => m.type === TriggerType.http)
        .map((m) => ({
          name: m.name,
        })),
    }

    const routerFileContent = Mustache.render(template, moustacheViewForMain);
    await writeToFile(folderPath, classConfigPath + "/GeneratedCaller.kt", routerFileContent);
  }


  async bundle(input: BundlerInput): Promise<BundlerOutput> {
    // Create a temporary folder were we copy user code to prepare everything.
    const folderPath = input.genezioConfigurationFilePath;
    const inputTemporaryFolder = await createTemporaryFolder()
    await fsExtra.copy(folderPath, inputTemporaryFolder);
    debugLogger.debug(`Copy files in temp folder ${inputTemporaryFolder}`);

    // Create the router class
    const userClass = input.projectConfiguration.classes.find((c: ClassConfiguration) => c.path == input.path)!;
    await this.#createRouterFileForClass(userClass, input.ast, inputTemporaryFolder);

    try {
      checkIfKotlinReqsAreInstalled();
    } catch (error: any) {
      log.error(error);
    }

    // Compile the Kotlin code locally
    debugLogger.debug("Compiling Kotlin...")
    await this.#compile(inputTemporaryFolder)
    debugLogger.debug("Compiling Kotlin finished.")

    return {
      ...input,
      path: inputTemporaryFolder + "/final_build",
    };
  }
}

