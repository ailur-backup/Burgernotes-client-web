// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0

if (localStorage.getItem("DONOTSHARE-secretkey") === null || localStorage.getItem("DONOTSHARE-password") === null) {
    window.location.replace("/login")
    document.body.innerHTML = "Redirecting..."
    throw new Error();
}

let remote = localStorage.getItem("homeserverURL")
if (remote == null) {
    localStorage.setItem("homeserverURL", "https://notes.hectabit.org")
    remote = "https://notes.hectabit.org"
}

let notesPlainText = ""
let information
let backButton
let titleBox
let fileInput
let inputTypeGlobal = 0

document.addEventListener("DOMContentLoaded", function() {
    information = document.getElementById("information")
    backButton = document.getElementById("backButton")
    titleBox = document.getElementById("title")
    fileInput = document.getElementById("fileInput")
})

function showInput(inputType) {
    inputTypeGlobal = inputType
    switch (inputType) {
        case 0:
            information.innerText = "Welcome to the Burgernotes Migration wizard! Before we begin migration, there are a few things you should know."
            titleBox.innerText = "Burgernotes Migrator"
            backButton.classList.add("hidden")
            break
        case 1:
            information.innerText = "This migration process may corrupt your data if interrupted. Please ensure you have a stable internet connection. Press continue to download a backup of your notes, just in case."
            titleBox.innerText = "Disclaimer"
            backButton.classList.remove("hidden")
            break
        case 2:
            information.innerText = "Now that you have a backup of your notes, you can proceed to the next step. Press continue to begin migration."
            titleBox.innerText = "Backup Complete"
            break
        case 3:
            information.innerText = "You have successfully migrated to new Burgernotes! Enjoy the more secure and feature-rich experience. Click continue to return to the app."
            titleBox.innerText = "Migration Complete"
            fileInput.classList.remove("hidden")
            break
    }
}

function buttonClick() {
    switch (inputTypeGlobal) {
        case 0:
            showInput(1)
            break
        case 1:
            exportNotes().then((data) => {
                if (data !== undefined) {
                    notesPlainText = data
                    let blob = new Blob([JSON.stringify(data)], {type: "application/json"})
                    let url = URL.createObjectURL(blob)
                    let a = document.createElement("a")
                    a.href = url
                    a.download = "backup.json"
                    a.click()
                    showInput(2)
                }
            })
            break
        case 2:
            importNotes(notesPlainText).then((status) => {
                if (status === 200) {
                    showInput(3)
                } else if (status === -1 || status === -2) {
                    titleBox.innerText = "Error!"
                    information.innerText = "An error occurred while migrating your notes. Please try again by pressing continue."
                    console.log(status)
                } else {
                    titleBox.innerText = "Critical Error!"
                    information.innerText = "All your notes have been lost. Good thing you have a backup! Press continue to return to the app, so you can import your backup."
                    inputTypeGlobal = 3
                }
            })
            break
        case 3:
            window.location.href = "/app"
            break
    }
}

function back() {
    showInput(inputTypeGlobal - 1)
}

async function getKey() {
    let password = localStorage.getItem("DONOTSHARE-password")
    let salt = new TextEncoder().encode("I love Burgernotes!")
    let cryptoKey = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits", "deriveKey"])
    return await window.crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt,
        iterations: 1,
        hash: "SHA-512"
    }, cryptoKey, {name: "AES-GCM", length: 256}, true, ["encrypt", "decrypt"])
}

function arrayBufferToBase64(buffer) {
    const uint8Array = new Uint8Array(buffer);
    return btoa(String.fromCharCode.apply(null, uint8Array))
}

async function encrypt(text) {
    let cryptoKey = await getKey()
    let iv = window.crypto.getRandomValues(new Uint8Array(12))
    let encrypted = await window.crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: iv
    }, cryptoKey, new TextEncoder().encode(text))
    return btoa(JSON.stringify({
        encrypted: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv)
    }))
}

async function importNotes(plaintextNotes) {
    try {
        for (let i in plaintextNotes) {
            plaintextNotes[i]["title"] = await encrypt(plaintextNotes[i]["title"])
            plaintextNotes[i]["content"] = await encrypt(plaintextNotes[i]["content"])
        }
        let purgeNotesFetch = await fetch(remote + "/api/purgenotes", {
            method: "POST",
            body: JSON.stringify({
                "secretKey": localStorage.getItem("DONOTSHARE-secretkey"),
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
        if (purgeNotesFetch.status !== 200) {
            return -2
        }
        let importNotesFetch = await fetch(remote + "/api/importnotes", {
            method: "POST",
            body: JSON.stringify({
                "secretKey": localStorage.getItem("DONOTSHARE-secretkey"),
                "notes": JSON.stringify(plaintextNotes)
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
        return importNotesFetch.status
    } catch (e) {
        return -1
    }
}

async function exportNotes() {
    try {
        titleBox.innerText = "Decrypting Notes..."
        let oldPasswordFormat = await hashwasm.sha512(prompt("Please enter your password to decrypt your notes."))
        let exportNotesFetch = await fetch(remote + "/api/exportnotes", {
            method: "POST",
            body: JSON.stringify({
                secretKey: localStorage.getItem("DONOTSHARE-secretkey")
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
        let responseData = await exportNotesFetch.json()
        for (let i in responseData) {
            information.innerText = "Decrypting " + i + "/" + responseData.length

            responseData[i]["title"] = CryptoJS.AES.decrypt(responseData[i]["title"], oldPasswordFormat).toString(CryptoJS.enc.Utf8)
            responseData[i]["content"] = CryptoJS.AES.decrypt(responseData[i]["content"], oldPasswordFormat).toString(CryptoJS.enc.Utf8)
        }
        titleBox.innerText = "Notes decrypted!"
        information.innerText = "Now if anything goes wrong, you can import this backup to restore your notes in the settings panel."
        return responseData
    } catch (e) {
        titleBox.innerText = "Error!"
        information.innerText = "An error occurred while decrypting your notes. Good thing we found out before we started migration! Please try again by pressing continue."
    }
}

// @license-end
