import { ProjectConfiguration } from "../../models/projectConfiguration.js";
import { YamlFrontend } from "../../models/yamlProjectConfiguration.js";
import {
    CloudAdapter,
    CloudAdapterOptions,
    GenezioCloudInput,
    GenezioCloudOutput,
} from "../cloudAdapter.js";

export class ClusterCloudAdapter implements CloudAdapter {
    deploy(
        input: GenezioCloudInput[],
        projectConfiguration: ProjectConfiguration,
        cloudAdapterOptions: CloudAdapterOptions,
    ): Promise<GenezioCloudOutput> {
        throw new Error("Method not implemented.");
    }
    deployFrontend(
        projectName: string,
        projectRegion: string,
        frontend: YamlFrontend,
        stage: string,
    ): Promise<string> {
        throw new Error("Method not implemented.");
    }
}
