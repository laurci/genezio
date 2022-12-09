import { Remote } from "./remote.js"

export class HelloGettingStarted {
    static remote = new Remote("https://yuluibirdhrak2loz2oblgsgjq0olgep.lambda-url.us-east-1.on.aws/")

    static async handleHelloGettingStarted(name) {
        return HelloGettingStarted.remote.call("HelloGettingStarted.handleHelloGettingStarted", name)  
    }

    
}

export { Remote };
