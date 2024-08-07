// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0

if (localStorage.getItem("PRIVATE-secretKey") !== null || localStorage.getItem("PRIVATE-cryptoKey") !== null) {
    window.location.replace("/app/")
    document.body.innerHTML = "Redirecting..."
    throw new Error();
}

let remote = localStorage.getItem("SETTING-homeServer")
if (remote == null) {
    localStorage.setItem("SETTING-homeServer", "https://notes.canary.hectabit.org")
    remote = "https://notes.canary.hectabit.org"
}

let usernameBox = document.getElementById("usernameBox")
let passwordBox = document.getElementById("passwordBox")
let statusBox = document.getElementById("statusBox")
let signupButton = document.getElementById("signupButton")
let opButton = document.getElementById("opButton")

// Leave these variables alone, they are used in the WASM code.

async function hashpass(pass) {
    return await hashwasm.argon2id({
        password: pass,
        salt: new TextEncoder().encode("I munch Burgers!!"),
        parallelism: 1,
        iterations: 32,
        memorySize: 19264,
        hashLength: 32,
        outputType: "hex"
    })
}

function showElements(yesorno) {
    if (!yesorno) {
        usernameBox.classList.add("hidden")
        passwordBox.classList.add("hidden")
        signupButton.classList.add("hidden")
        opButton.classList.add("hidden")
        inputContainer.classList.add("hidden")
    }
    else {
        usernameBox.classList.remove("hidden")
        passwordBox.classList.remove("hidden")
        signupButton.classList.remove("hidden")
        opButton.classList.remove("hidden")
        inputContainer.classList.remove("hidden")
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("homeserver").innerText = "Your homeserver is: " + remote + ". "
});

opButton.addEventListener("click", () => {
    window.location.href = "/login"
});

complete = new Event("completed");
window.returnCode = undefined;
window.returnVar = undefined;

// This is for the WASM code to call when it's done. Do not remove it, even if it looks like it's never called.

function WASMComplete() {
    window.dispatchEvent(complete);
}

signupButton.addEventListener("click", () => {
    let username = usernameBox.value
    let password = passwordBox.value

    if (username === "") {
        statusBox.innerText = "Username required!"
        return
    }
    if ((username).length > 20) {
        statusBox.innerText = "Username cannot be more than 20 characters!"
        return
    }
    if (password === "") {
        statusBox.innerText = "Password required!"
        return
    }
    if ((password).length < 8) {
        statusBox.innerText = "Password must be at least 8 characters!"
        return
    }

    showElements(false)
    statusBox.innerText = "Computing PoW Challenge... (this may take up to 5 minutes at worst, 3 seconds at best)"

    /*
     * Compiled version of:
     * hashcat-wasm (https://concord.hectabit.org/hectabit/hashcat-wasm)
     * (c) Arzumify
     * @license AGPL-3.0
     * Since this is my software, if you use it with proprietary servers, I will make sure you will walk across hot coals (just kidding, probably).
     * I'm not kidding about the license though.
     * I should stop including comments into JS and possibly minify this code. Oh, well.
    */

    window.resourceExtra = "I love Burgernotes!"
    const go = new Go();
    WebAssembly.instantiateStreaming(fetch("/static/wasm/hashcat.wasm"), go.importObject).then((result) => {
        go.run(result.instance);
    })

    window.addEventListener("completed", async () => {
        if (window.returnCode === 1) {
            statusBox.innerText = "Please do not expose your computer to cosmic rays (an impossible logical event has occurred)."
            showElements(true)
            return
        } else if (window.returnCode === 2) {
            statusBox.innerText = "The PoW Challenge has failed. Please try again."
            showElements(true)
            return
        }

        statusBox.innerText = "Hashing password..."
        let hashedPassword = await hashpass(password)
        statusBox.innerText = "Contacting server..."
        fetch(remote + "/api/signup", {
            method: "POST",
            body: JSON.stringify({
                username: username,
                password: hashedPassword,
                stamp: window.returnVar,
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
            }
        })
            .then((response) => response)
            .then(async (response) => {
                let responseData = await response.json()
                if (response.status === 200) {
                    statusBox.innerText = "Setting up encryption keys..."
                    localStorage.setItem("PRIVATE-secretKey", responseData["key"])
                    localStorage.setItem("PRIVATE-cryptoKey", await hashwasm.argon2id({
                        password: password,
                        salt: new TextEncoder().encode("I love Burgernotes!"),
                        parallelism: 1,
                        iterations: 32,
                        memorySize: 19264,
                        hashLength: 32,
                        outputType: "hex"
                    }))
                    statusBox.innerText = "Welcome!"
                    await new Promise(r => setTimeout(r, 200))
                    window.location.href = "/app/"
                } else if (response.status === 409) {
                    if (responseData["error"] === "Stamp already spent") {
                        statusBox.innerText = "Pure bad luck... your PoW challenge was accepted, but someone else used the same PoW challenge as you. Please try again. (error: Stamp already spent)"
                    } else {
                        statusBox.innerText = "Username already taken!"
                    }
                    showElements(true)
                } else if (response.status === 429) {
                    statusBox.innerText = "Please don't sign up to new accounts that quickly. If you are using a VPN, please turn it off!"
                    showElements(true)
                } else if (response.status === 500) {
                    statusBox.innerText = responseData["error"]
                    showElements(true)
                } else {
                    statusBox.innerText = "Something went wrong! (error: " + responseData["error"] + ")"
                    showElements(true)
                }
            })
    })
});

// @license-end
