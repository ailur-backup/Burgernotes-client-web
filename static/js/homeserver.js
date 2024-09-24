// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0

let homeserverBox = document.getElementById("homeserverBox")
let statusBox = document.getElementById("statusBox")
let changeButton = document.getElementById("changeButton")
let backButton = document.getElementById("backButton")

let remote = localStorage.getItem("SETTING-homeServer")
if (remote == null) {
    localStorage.setItem("SETTING-homeServer", "https://notes.ailur.dev")
    remote = "https://notes.ailur.dev"
}

document.addEventListener("DOMContentLoaded", function() {
    statusBox.innerText = "You are currently connected to: " + remote + ". "
});

function showElements(yesorno) {
    if (!yesorno) {
        homeserverBox.classList.add("hidden")
        changeButton.classList.add("hidden")
        inputContainer.classList.add("hidden")
    }
    else {
        homeserverBox.classList.remove("hidden")
        changeButton.classList.remove("hidden")
        inputContainer.classList.remove("hidden")
    }
}

changeButton.addEventListener("click", () => {
    async function doStuff() {
        let remote = homeserverBox.value

        if (remote === "") {
            statusBox.innerText = "A homeserver is required!"
            return
        }

        showElements(false)
        statusBox.innerText = "Connecting to homeserver..."

        fetch(remote + "/api/versionjson")
            .then((response) => response)
            .then((response) => {
                async function doStuff() {
                    if (response.status === 200) {
                        let version = await response.json()
                        let fetchClientVersion = await (await fetch("/static/version.txt")).text()
                        if (parseInt(version["versionnum"]) < parseInt(fetchClientVersion)) {
                            localStorage.setItem("legacy", "true")
                        }
                        localStorage.setItem("SETTING-homeServer", remote)

                        if (document.referrer !== "") {
                          window.location.href = document.referrer;
                        }
                        else {
                          window.location.href = "/login";
                        }
                    } else if (response.status === 404) {
                        let legacyHomeserverCheck = await fetch(remote + "/api/version")
                        if (legacyHomeserverCheck.status === 200) {
                            let homeserverText = await legacyHomeserverCheck.text()
                            let homeserverFloat = homeserverText.split(" ")[2]
                            let homeserverNameCheck = homeserverText.split(" ")[0]
                            if (homeserverNameCheck !== "Burgernotes") {
                                statusBox.innerText = "This homeserver is not compatible with Burgernotes!"
                                showElements(true)
                                return
                            }
                            let homeserverInt = parseFloat(homeserverFloat) * 100
                            if (homeserverInt < 200) {
                                localStorage.setItem("legacy", "true")
                                localStorage.setItem("SETTING-homeServer", remote)
                                if (document.referrer !== "") {
                                    window.location.href = document.referrer;
                                }
                                else {
                                    window.location.href = "/login";
                                }
                            } else if (homeserverInt > 200) {
                                localStorage.setItem("legacy", "false")
                                localStorage.setItem("SETTING-homeServer", remote)
                                if (document.referrer !== "") {
                                    window.location.href = document.referrer;
                                }
                                else {
                                    window.location.href = "/login";
                                }
                            } else {
                                statusBox.innerText = "This homeserver is not compatible with Burgernotes!"
                                showElements(true)
                            }
                        }
                    }
                    else {
                        statusBox.innerText = "This homeserver is not compatible with Burgernotes!"
                        showElements(true)
                    }
                }
                doStuff()
            });
    }
    doStuff()
});

backButton.addEventListener("click", () => {
    history.back()
});

// @license-end
