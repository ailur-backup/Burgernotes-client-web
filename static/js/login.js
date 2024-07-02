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
let inputNameBox = document.getElementById("inputNameBox")
let backButton = document.getElementById("backButton")
let opButton = document.getElementById("opButton")

async function loginFetch(username, password, changePass, newPass) {
    if (localStorage.getItem("legacy") !== true) {
        return await fetch(remote + "/api/login", {
            method: "POST",
            body: JSON.stringify({
                username: username,
                password: password,
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "X-Burgernotes-Version": "200"
            }
        })
    } else {
        let passwordChange, newPassChecked
        if (changePass) {
            passwordChange = "yes"
            newPassChecked = newPass
        } else {
            passwordChange = "no"
            newPassChecked = password
        }
        return await fetch(remote + "/api/login", {
            method: "POST",
            body: JSON.stringify({
                username: username,
                password: password,
                passwordchange: passwordChange,
                newpass: newPassChecked
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
            }
        })
    }
}

async function addLegacyPassword(secretKey, password) {
    return await fetch(remote + "/api/v2/addlegacypassword", {
        method: "POST",
        body: JSON.stringify({
            secretKey: secretKey,
            legacyPassword: password,
        }),
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "X-Burgernotes-Version": "200"
        }
    })
}

async function migrateLegacyPassword(secretKey, password) {
    return await fetch(remote + "/api/changepassword", {
        method: "POST",
        body: JSON.stringify({
            secretKey: secretKey,
            newPassword: password,
        }),
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "X-Burgernotes-Version": "200"
        }
    })
}

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

usernameBox.classList.remove("hidden")
inputNameBox.innerText = "Username:"

let currentInputType = 0

function showInput(inputType) {
    if (inputType === 0) {
        usernameBox.classList.remove("hidden")
        passwordBox.classList.add("hidden")
        backButton.classList.add("hidden")
        opButton.classList.remove("hidden")
        inputNameBox.innerText = "Username:"
        statusBox.innerText = "Sign in with your Burgernotes account"
        currentInputType = 0
    } else if (inputType === 1) {
        usernameBox.classList.add("hidden")
        passwordBox.classList.remove("hidden")
        backButton.classList.remove("hidden")
        opButton.classList.add("hidden")
        inputNameBox.innerText = "Password:"
        currentInputType = 1
    } else if (inputType === 2) {
        usernameBox.classList.add("hidden")
        passwordBox.classList.add("hidden")
        signupButton.classList.add("hidden")
        backButton.classList.add("hidden")
        inputNameBox.classList.add("hidden")
        opButton.classList.add("hidden")
        inputNameBox.innerText = "Password:"
        currentInputType = 2
    }
}

function showElements(yesorno) {
    if (!yesorno) {
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

opButton.addEventListener("click", () => {
    window.location.href = "/signup"
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
            statusBox.innerText = "Signing in..."

            const hashedPass = await hashpass(password)
            const login = await loginFetch(username, hashedPass, false, "")
            const loginData = await login.json()
            if (login.status === 401) {
                // Trying hashpassold
                const loginOld = await loginFetch(username, await hashpassold(password), true, hashedPass)
                const loginDataOld = await loginOld.json()
                if (loginOld.status === 401) {
                    statusBox.innerText = "Username or password incorrect!"
                    showInput(1)
                    showElements(true)
                } else if (loginOld.status === 200) {
                    localStorage.setItem("DONOTSHARE-secretkey", loginDataOld["key"])
                    localStorage.setItem("DONOTSHARE-password", await hashwasm.sha512(password))
                    if (loginDataOld["legacyPasswordNeeded"] === true) {
                        await addLegacyPassword(username, await hashpass(await hashpassold(password)))
                    }
                    await migrateLegacyPassword(loginDataOld["key"], hashedPass)
                    window.location.replace("/app/")
                } else {
                    statusBox.innerText = loginDataOld["error"]
                    showInput(1)
                    showElements(true)
                }
            } else if (login.status === 200) {
                localStorage.setItem("DONOTSHARE-secretkey", loginData["key"])
                localStorage.setItem("DONOTSHARE-password", await hashwasm.sha512(password))
                if (loginData["legacyPasswordNeeded"] === true) {
                    await addLegacyPassword(username, await hashpass(await hashpassold(password)))
                }
                window.location.replace("/app/")
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