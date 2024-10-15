// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0

if (localStorage.getItem("PRIVATE-secretKey") !== null || localStorage.getItem("PRIVATE-cryptoKey") !== null) {
    window.location.replace("/app/")
    document.body.innerHTML = "Redirecting..."
    throw new Error();
}

let remote = localStorage.getItem("SETTING-homeServer")
if (remote == null) {
    localStorage.setItem("SETTING-homeServer", "https://notes.ailur.dev")
    remote = "https://notes.ailur.dev"
}

let inputContainer = document.getElementById("inputContainer")
let usernameBox = document.getElementById("usernameBox")
let passwordBox = document.getElementById("passwordBox")
let statusBox = document.getElementById("statusBox")
let signupButton = document.getElementById("signupButton")
let inputNameBox = document.getElementById("inputNameBox")
let backButton = document.getElementById("backButton")

async function loginFetch(username, password, modern) {
    return await fetch(remote + "/api/login", {
        method: "POST",
        body: JSON.stringify({
            username: username,
            password: password,
            modern: modern
        }),
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
        }
    })
}

async function migrateLegacyPassword(secretKey, password) {
    return await fetch(remote + "/api/changepassword", {
        method: "POST",
        body: JSON.stringify({
            secretKey: secretKey,
            newPassword: password,
            migration: true
        }),
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
        }
    })
}

async function hashPass(pass) {
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

async function hashPassLegacy(pass) {
    let key = pass
    for (let i = 0; i < 128; i++) {
        key = await hashwasm.sha3(key)
    }
    return key
}

usernameBox.classList.remove("hidden")
inputNameBox.innerText = "Username:"

let currentInputType = 0

function showInput(inputType) {
    switch (inputType) {
        case 0:
            usernameBox.classList.remove("hidden")
            passwordBox.classList.add("hidden")
            backButton.classList.add("hidden")
            inputContainer.classList.remove("hidden")
            inputNameBox.innerText = "Username:"
            statusBox.innerText = "Sign in with your Burgernotes account"
            currentInputType = 0
            break
        case 1:
            usernameBox.classList.add("hidden")
            passwordBox.classList.remove("hidden")
            backButton.classList.remove("hidden")
            inputContainer.classList.remove("hidden")
            inputNameBox.innerText = "Password:"
            currentInputType = 1
            break
        case 2:
            inputContainer.classList.add("hidden")
            signupButton.classList.add("hidden")
            backButton.classList.add("hidden")
            inputNameBox.classList.add("hidden")
            inputNameBox.innerText = "Password:"
            currentInputType = 2
    }
}

function showElements(show) {
    if (!show) {
        usernameBox.classList.add("hidden")
        passwordBox.classList.add("hidden")
        signupButton.classList.add("hidden")
        backButton.classList.add("hidden")
        inputNameBox.classList.add("hidden")
        showInput(currentInputType)
    }
    else {
        usernameBox.classList.remove("hidden")
        passwordBox.classList.remove("hidden")
        signupButton.classList.remove("hidden")
        backButton.classList.remove("hidden")
        inputNameBox.classList.remove("hidden")
        showInput(currentInputType)
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("homeserver").innerText = "Your homeserver is: " + remote + ". "
});

signupButton.addEventListener("click", () => {
    if (passwordBox.classList.contains("hidden")) {
        if (usernameBox.value === "") {
            statusBox.innerText = "Username required!"
            return
        } else {
            statusBox.innerText = "Welcome back, " + usernameBox.value + "!"
        }
        showInput(1)
    } else {
        async function doStuff() {
            let username = usernameBox.value
            let password = passwordBox.value

            if (password === "") {
                statusBox.innerText = "A password is required!"
                return
            }

            showInput(2)
            showElements(true)
            statusBox.innerText = "Hashing password..."

            const hashedPass = await hashPass(password)
            const login = await loginFetch(username, hashedPass, true)
            const loginData = await login.json()
            if (login.status === 401) {
                if (loginData["migrated"] !== true) {
                    statusBox.innerText = "Migrating to Burgernotes 2.0..."
                    const loginOld = await loginFetch(username, await hashPassLegacy(password), false)
                    const loginDataOld = await loginOld.json()
                    if (loginOld.status === 401) {
                        statusBox.innerText = "Username or password incorrect!"
                        showInput(1)
                        showElements(true)
                    } else if (loginOld.status === 200) {
                        statusBox.innerText = "Setting up encryption keys..."
                        localStorage.setItem("PRIVATE-secretKey", loginDataOld["key"])
                        localStorage.setItem("PRIVATE-cryptoKey", await hashwasm.argon2id({
                            password: password,
                            salt: new TextEncoder().encode("I love Burgernotes!"),
                            parallelism: 1,
                            iterations: 32,
                            memorySize: 19264,
                            hashLength: 32,
                            outputType: "hex"
                        }))
                        statusBox.innerText = "Migrating password..."
                        let status = await migrateLegacyPassword(loginDataOld["key"], hashedPass)
                        if (status.status === 200) {
                            statusBox.innerText = "Welcome back!"
                            await new Promise(r => setTimeout(r, 200))
                            window.location.href = "/app/"
                        } else {
                            statusBox.innerText = (await status.json())["error"]
                            showInput(1)
                            showElements(true)
                        }
                    } else {
                        statusBox.innerText = loginDataOld["error"]
                        showInput(1)
                        showElements(true)
                    }
                } else {
                    statusBox.innerText = "Username or password incorrect!"
                    showInput(1)
                    showElements(true)
                }
            } else if (login.status === 200) {
                statusBox.innerText = "Setting up encryption keys..."
                localStorage.setItem("PRIVATE-secretKey", loginData["key"])
                localStorage.setItem("PRIVATE-cryptoKey", await hashwasm.argon2id({
                    password: password,
                    salt: new TextEncoder().encode("I love Burgernotes!"),
                    parallelism: 1,
                    iterations: 32,
                    memorySize: 19264,
                    hashLength: 32,
                    outputType: "hex"
                }))
                statusBox.innerText = "Welcome back!"
                await new Promise(r => setTimeout(r, 200))
                window.location.href = "/app/"
            } else {
                statusBox.innerText = loginData["error"]
                showInput(1)
                showElements(true)
            }
        }
        doStuff()
    }
});

backButton.addEventListener("click", () => {
    showInput(0)
});

showInput(0)

// @license-end
