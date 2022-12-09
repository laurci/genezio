import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.css";
import "./App.css";

// import the SDK
import { HelloGettingStarted } from "./backend-sdk/HelloGettingStarted.sdk";

function App() {
  const [name, setName] = useState("");
  const [backendResponse, setBackendResponse] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  // this function will make the request to the server calling the provided SDK by genezio
  async function handleSendRequest(e) {
    // prevent page refresh
    e.preventDefault();
    setIsRequesting(true);

    // make the request to the server using the SDK
    const response = await HelloGettingStarted.handleHelloGettingStarted(name);
    setBackendResponse(response);
    setIsRequesting(false);
  }

  return (
    <div className="App">
      <div className="container">
        <div className="row justify-content-center mt-5 mb-4">
          <div className="col-md-4 col-sm-12 mb-4 text-center text-white">
            <h1>Getting Started</h1>
            <p>
              Congrats, you deployed your first genezio backend and you can use
              it in this frontend page.
            </p>
          </div>
        </div>

        <div className="row justify-content-around">
          <div className="col-md-4 col-sm-12 mb-4 text-center">
            <div className="card p-4">
              <h2>Step 1</h2>
              <p>Say hello to the backend.</p>
              <form onSubmit={handleSendRequest}>
                <div class="mb-3">
                  <label for="yourName" class="form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    class="form-control"
                    id="yourName"
                    aria-describedby="nameHelp"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                  <div id="nameHelp" class="form-text">
                    Enter your name. and click the button below to say hello.
                  </div>
                </div>

                <div class="d-grid gap-2">
                  <button
                    class="btn btn-outline-primary"
                    type="submit"
                    onClick={e => handleSendRequest(e)}
                  >
                    Send Request
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="col-md-4 col-sm-12 mb-4 text-center">
            <div className="card p-4">
              <h2>Step 2</h2>
              <p>
                This is the response from the backend. You can see the response:
              </p>
              <p className="text-primary">
                {isRequesting
                  ? <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                    </div>
                  : backendResponse}
              </p>
            </div>
          </div>
          <div className="col-md-4 col-sm-12 mb-4 text-center">
            <div className="card p-4">
              <h2>Next Steps</h2>
              <p>You can now start building your own backend using genezio.</p>
              <ul class="list-group list-group-flush">
                <li class="list-group-item">
                  <a
                    href="https://docs.genezio.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Genezio Documentation
                  </a>
                </li>
                <li class="list-group-item">
                  <a
                    href=" https://github.com/Genez-io/genezio-examples.git"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Genezio Examples
                  </a>
                </li>
                <li class="list-group-item">
                  <a
                    href="https://discord.gg/uc9H5YKjXv"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Discord Community
                  </a>
                </li>
                <li class="list-group-item">
                  <a
                    href="https://genez.io/blog"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Genezio Blog
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer mt-auto py-3 fixed-bottom text-center">
        <div className="container">
          <span className="text-light">
            Made with ❤️ by{" "}
            <a
              href="https://genez.io"
              target="_blank"
              rel="noreferrer"
              className="text-primary"
            >
              Genezio
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
