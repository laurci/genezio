import { execSync } from 'child_process';

export function checkIfKotlinReqsAreInstalled() {

    // Check java version
    try {
        execSync("java --version")
    } catch (error) {
        throw new Error("Java not found");
    }


    // Check kotlin version
    try {
        execSync("kotlin -version")
    } catch (error) {
        throw new Error("Kotlin not found");
    }


    // Check gradle version
    try {
        execSync("gradle -version")
    } catch (error) {
        throw new Error("Gradle not found");
    }
}
