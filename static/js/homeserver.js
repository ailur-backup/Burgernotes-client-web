// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0

let homeserverBox = document.getElementById("homeserverBox")
let statusBox = document.getElementById("statusBox")
let changeButton = document.getElementById("changeButton")

let remote = localStorage.getItem("homeserverURL")
if (remote == null) {
    localStorage.setItem("homeserverURL", "https://notes.hectabit.org")
    remote = "https://notes.hectabit.org"
}


document.addEventListener("DOMContentLoaded", function() {
    statusBox.innerText = "You are currently connected to: " + remote + ". "
});

function showElements(yesorno) {
    if (!yesorno) {
        homeserverBox.classList.add("hidden")
        changeButton.classList.add("hidden")
    }
    else {
        homeserverBox.classList.remove("hidden")
        changeButton.classList.remove("hidden")
    }
}

changeButton.addEventListener("click", (event) => {
    async function doStuff() {
        let remote = homeserverBox.value

        if (remote == "") {
            statusBox.innerText = "A homeserver is required!"
            return
        }

        showElements(false)
        statusBox.innerText = "Connecting to homeserver..."

        fetch(remote + "/api/version")
            .then((response) => response)
            .then((response) => {
                async function doStuff() {
                    if (response.status == 200) {
                        localStorage.setItem("homeserverURL", remote)

                        if (document.referrer !== "") {
                          window.location.href = document.referrer;
                        }
                        else {
                          window.location.href = "/login";
                        }
                    }
                    else if (response.status == 404) {
                        statusBox.innerText = "Not a valid homeserver!"
                    }
                    else {
                        statusBox.innerText = "Something went wrong!"
                        showElements(true)
                    }
                }
                doStuff()
            });
    }
    doStuff()
});

// @license-end
