// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0

if (localStorage.getItem("DONOTSHARE-secretkey") !== null || localStorage.getItem("DONOTSHARE-password") !== null) {
    window.location.replace("/app/")
    document.body.innerHTML = "Redirecting..."
    throw new Error();
}

let remote = localStorage.getItem("homeserverURL")
if (remote == null) {
    localStorage.setItem("homeserverURL", "https://notes.hectabit.org")
    remote = "https://notes.hectabit.org"
}

let usernameBox = document.getElementById("usernameBox")
let passwordBox = document.getElementById("passwordBox")
let statusBox = document.getElementById("statusBox")
let signupButton = document.getElementById("signupButton")
let opButton = document.getElementById("opButton")

async function hashpassold(pass) {
    return await hashwasm.argon2id({
        password: pass,
        salt: await hashwasm.sha512(pass),
        parallelism: 1,
        iterations: 256,
        memorySize: 512,
        hashLength: 32,
        outputType: "encoded"
    })
}

async function hashpass(pass) {
    let key = pass
    for (let i = 0; i < 128; i++) {
        key = await hashwasm.sha3(key)
    }
    return key
}

function showElements(yesorno) {
    if (!yesorno) {
        usernameBox.classList.add("hidden")
        passwordBox.classList.add("hidden")
        signupButton.classList.add("hidden")
        opButton.classList.add("hidden")
    }
    else {
        usernameBox.classList.remove("hidden")
        passwordBox.classList.remove("hidden")
        signupButton.classList.remove("hidden")
        opButton.classList.remove("hidden")
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("homeserver").innerText = "Your homeserver is: " + remote + ". "
});

opButton.addEventListener("click", () => {
    window.location.href = "/login"
});

signupButton.addEventListener("click", () => {
    async function doStuff() {
        let username = usernameBox.value
        let password = passwordBox.value

        if (username === "") {
            statusBox.innerText = "Username required ⚠️"
            return
        }
        if ((username).length > 20) {
            statusBox.innerText = "Username cannot be more than 20 characters ⚠️"
            return
        }
        if (password === "") {
            statusBox.innerText = "Password required ⚠️"
            return
        }
        if ((password).length < 8) {
            statusBox.innerText = "Password must be at least 8 characters ⚠️"
            return
        }

        showElements(false)
        statusBox.innerText = "Creating account, please hold on..."

        fetch(remote + "/api/signup", {
            method: "POST",
            body: JSON.stringify({
                username: username,
                password: await hashpass(password),
                legacyPassword: await hashpass(await hashpassold(password))
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "X-Burgernotes-Version": "200"
            }
        })
            .then((response) => response)
            .then((response) => {
                async function doStuff() {
                    let responseData = await response.json()

                    if (response.status === 200) {
                        statusBox.innerText = "Redirecting...."
                        localStorage.setItem("DONOTSHARE-secretkey", responseData["key"])
                        localStorage.setItem("DONOTSHARE-password", await hashwasm.sha512(password))

                        window.location.href = "/app/"
                    }
                    else if (response.status === 409) {
                        statusBox.innerText = "Username already taken!"
                        showElements(true)
                    }
                    else {
                        statusBox.innerText = "Something went wrong! (error code: " + response.status + ")"
                        showElements(true)
                    }
                }
                doStuff()
            });
    }
    doStuff()
});

// @license-end