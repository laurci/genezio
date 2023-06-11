import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import { createTemporaryFolder, deleteFolder, getFileDetails } from "../../utils/file";
import { AccessDependenciesPlugin, BundlerInput, BundlerInterface, BundlerOutput } from "../bundler.interface";
import path from "path";
import { bundle } from "../../utils/webpack";
import { ModuleOptions } from "webpack";
import { EsbuildPlugin } from "esbuild-loader";

export class NodeTsDependenciesBundler implements BundlerInterface {
  async #getNodeModulesTs(
    filePath: string,
  ): Promise<any> {
    const { name } = getFileDetails(filePath);
    const outputFile = `${name}-processed.js`;
    const temporaryFolder = await createTemporaryFolder();
    const dependencies: string[] = [];
    const module: ModuleOptions = {
      rules: [
          {
              test: /\.tsx?$/,
              use: [
                  {
                      loader: "esbuild-loader",
                      options: {
                        tsconfig: "tsconfig.json",
                        target: "es2020",
                      }
                  }
              ],
              exclude: /really\.html/
          }
      ]
  };

    await bundle(
      "./" + filePath,
      "production",
      [],
      module,
      [new NodePolyfillPlugin(), new AccessDependenciesPlugin(dependencies, process.cwd()), new EsbuildPlugin()],
      temporaryFolder,
      outputFile,
      {
        conditionNames: ["require"]
      }
    );

    // delete the temporary folder
    await deleteFolder(temporaryFolder);

    const dependenciesInfo = dependencies.map((dependency) => {
      const relativePath = dependency.split("node_modules" + path.sep)[1];
      const dependencyName = relativePath?.split(path.sep)[0];
      const dependencyPath =
        dependency.split("node_modules" + path.sep)[0] +
        "node_modules" +
        path.sep +
        dependencyName;
      return {
        name: dependencyName,
        path: dependencyPath
      };
    });

    // remove duplicates from dependenciesInfo by name
    const uniqueDependenciesInfo = dependenciesInfo.filter(
      (v, i, a) => a.findIndex((t) => t.name === v.name) === i
    );

    return uniqueDependenciesInfo;
  }

  async bundle(input: BundlerInput): Promise<BundlerOutput> {
    const dependenciesInfo = await this.#getNodeModulesTs(input.extra!.originalPath)

    return {
      ...input,
      extra: {
        ...input.extra,
        originalPath: input.path,
        dependenciesInfo
      }
    };
  }

}