// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0

if (localStorage.getItem("DONOTSHARE-secretkey") === null) {
    window.location.replace("/login")
    document.body.innerHTML = "Redirecting..."
    throw new Error();
}
if (localStorage.getItem("DONOTSHARE-password") === null) {
    window.location.replace("/login")
    document.body.innerHTML = "Redirecting..."
    throw new Error();
}

let remote = localStorage.getItem("homeserverURL")
if (remote == null) {
    localStorage.setItem("homeserverURL", "https://notes.hectabit.org")
    remote = "https://notes.hectabit.org"
}

function formatBytes(a, b = 2) { if (!+a) return "0 Bytes"; const c = 0 > b ? 0 : b, d = Math.floor(Math.log(a) / Math.log(1000)); return `${parseFloat((a / Math.pow(1000, d)).toFixed(c))} ${["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]}` }

let secretkey = localStorage.getItem("DONOTSHARE-secretkey")
let password = localStorage.getItem("DONOTSHARE-password")
let currentFontSize = 16

let backButton = document.getElementById("backButton")
let usernameBox = document.getElementById("usernameBox")
let optionsCoverDiv = document.getElementById("optionsCoverDiv")
let optionsDiv = document.getElementById("optionsDiv")
let errorDiv = document.getElementById("errorDiv")
let errorMessageThing = document.getElementById("errorMessageThing")
let closeErrorButton = document.getElementById("closeErrorButton")
let cancelErrorButton = document.getElementById("cancelErrorButton")
let errorInput = document.getElementById("errorInput")
let exitThing = document.getElementById("exitThing")
let exitImportThing = document.getElementById("exitImportThing")
let exitSessionsThing = document.getElementById("exitSessionsThing")
let sessionManagerButton = document.getElementById("sessionManagerButton")
let importNotesButton = document.getElementById("importNotesButton")
let sessionManagerDiv = document.getElementById("sessionManagerDiv")
let importNotesDiv = document.getElementById("importDiv")
let sessionDiv = document.getElementById("sessionDiv")
let deleteMyAccountButton = document.getElementById("deleteMyAccountButton")
let changePasswordButton = document.getElementById("changePasswordButton")
let storageThing = document.getElementById("storageThing")
let storageProgressThing = document.getElementById("storageProgressThing")
let usernameThing = document.getElementById("usernameThing")
let logOutButton = document.getElementById("logOutButton")
let notesBar = document.getElementById("notesBar")
let topBar = document.getElementById("topBar")
let notesDiv = document.getElementById("notesDiv")
let newNote = document.getElementById("newNote")
let noteBoxDiv = document.getElementById("noteBoxDiv")
let pellAttacher = document.getElementById("noteBox")
let loadingStuff = document.getElementById("loadingStuff")
let exportNotesButton = document.getElementById("exportNotesButton")
let textSizeBox = document.getElementById('textSizeBox');
let textPlusBox = document.getElementById('textPlusBox');
let textMinusBox = document.getElementById('textMinusBox');
let wordCountBox = document.getElementById('wordCountBox');
let removeBox = document.getElementById("removeBox")
let importFile = document.getElementById("importFile")

let selectedNote = 0
let timer
let waitTime = 400
let indiv = false
let mobile = false
let selectLatestNote = false

// Init the note box
document.addEventListener("DOMContentLoaded", function() {
    pell.init({
        element: pellAttacher,
        onChange: html => console.log(html),
        defaultParagraphSeparator: 'br',
        styleWithCSS: false,
        classes: {
            actionbar: 'pell-actionbar',
            button: 'pell-button',
            content: 'pell-content',
            selected: 'pell-button-selected'
        }
    })
    let noteBox = document.getElementsByClassName("pell-content")[0]

    function handleGesture() {
        if (indiv) {
            indiv = false
            notesBar.style.width = "100%";
            noteBoxDiv.style.width = "0px"
            if (selectedNote !== 0) {
                noteBoxDiv.readOnly = true
            }
            notesDiv.classList.remove("hidden")
            noteBoxDiv.classList.add("hidden")
            backButton.classList.add("hidden")
            newNote.classList.remove("hidden")
        } else {
            indiv = true
            noteBoxDiv.style.width = "100%";
            notesBar.style.width = "0px"
            if (selectedNote !== 0) {
                noteBoxDiv.readOnly = false
            }
            notesDiv.classList.add("hidden")
            noteBoxDiv.classList.remove("hidden")
            backButton.classList.remove("hidden")
            newNote.classList.add("hidden")
        }
    }

    if (/Android|iPhone|iPod/i.test(navigator.userAgent)) {
        mobile = true
        noteBoxDiv.classList.add("mobile")
        noteBoxDiv.style.width = "0px";
        notesBar.style.width = "100%"
        topBar.style.width = "100%"
        noteBoxDiv.readOnly = true
        noteBoxDiv.classList.add("hidden")

        let touchstartX, touchstartY, touchendX, touchendY

        notesBar.addEventListener("touchstart", function (event) {
            touchstartX = event.changedTouches[0].screenX;
            touchstartY = event.changedTouches[0].screenY;
        }, false);

        notesBar.addEventListener("touchend", function (event) {
            touchendX = event.changedTouches[0].screenX;
            touchendY = event.changedTouches[0].screenY;
            if (touchendX < touchstartX - 75) {
                handleGesture();
            }
        }, false);

        noteBox.addEventListener("touchstart", function (event) {
            touchstartX = event.changedTouches[0].screenX;
            touchstartY = event.changedTouches[0].screenY;
        }, false);

        noteBox.addEventListener("touchend", function (event) {
            touchendX = event.changedTouches[0].screenX;
            touchendY = event.changedTouches[0].screenY;
            if (touchendX > touchstartX + 75) {
                handleGesture();
            }
        }, false);
    }

    noteBox.innerText = ""
    noteBox.readOnly = true

    let noteCount = 0

    function displayError(message) {
        errorDiv.classList.remove("hidden")
        optionsCoverDiv.classList.remove("hidden")

        errorMessageThing.innerHTML = message
    }

    closeErrorButton.addEventListener("click", () => {
        errorDiv.classList.add("hidden")
        optionsCoverDiv.classList.add("hidden")
    });
    closeErrorButton.addEventListener("click", () => {
        errorDiv.classList.add("hidden")
        optionsCoverDiv.classList.add("hidden")
        errorInput.classList.add("hidden")
        cancelErrorButton.classList.add("hidden")
    });

    function updateFont() {
        currentFontSize = localStorage.getItem("SETTING-fontsize")
        noteBox.style.fontSize = currentFontSize + "px"
        textSizeBox.innerText = currentFontSize + "px"
    }

    async function checknetwork() {
        let loggedInEndpoint
        if (localStorage.getItem("legacy") === "true") {
            loggedInEndpoint = "userinfo"
        } else {
            loggedInEndpoint = "loggedin"
        }
        fetch(remote + "/api/" + loggedInEndpoint, {
            method: "POST",
            body: JSON.stringify({
                secretKey: localStorage.getItem("DONOTSHARE-secretkey"),
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .catch(() => {
                noteBox.contentEditable = false
                noteBox.innerHTML = "<h1>You are currently offline.</h1>"
                displayError("Failed to connect to the server.\nPlease check your internet connection.")
            })
            .then((response) => response)
            .then((response) => {
                if (response.status === 400) {
                    displayError("Something went wrong! Signing you out...")
                    closeErrorButton.classList.add("hidden")
                    //usernameBox.innerText = ""
                    setTimeout(function () {
                        window.location.replace("/logout")
                    }, 2500);
                } else if (response.status === 200) {
                    updateUserInfo()
                } else {
                    noteBox.readOnly = true
                    noteBox.innerHTML = "<h1>You are currently offline.</h1>"
                    displayError("Failed to connect to the server.\nPlease check your internet connection.")
                }
            });
    }

    if (localStorage.getItem("SETTING-fontsize") === null) {
        localStorage.setItem("SETTING-fontsize", "16")
        updateFont()
    } else {
        updateFont()
    }

    textPlusBox.addEventListener("click", () => {
        localStorage.setItem("SETTING-fontsize", String(Number(localStorage.getItem("SETTING-fontsize")) + Number(1)))
        updateFont()
    });
    textMinusBox.addEventListener("click", () => {
        localStorage.setItem("SETTING-fontsize", String(Number(localStorage.getItem("SETTING-fontsize")) - Number(1)))
        updateFont()
    });


    function truncateString(str, num) {
        if (str.length > num) {
            return str.slice(0, num) + "..";
        } else {
            return str;
        }
    }


    function updateUserInfo() {
        fetch(remote + "/api/userinfo", {
            method: "POST",
            body: JSON.stringify({
                secretKey: secretkey
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => {
                async function doStuff() {
                    if (response.status === 500) {
                        displayError("Something went wrong! Signing you out...")
                        closeErrorButton.classList.add("hidden")
                        setTimeout(function () {
                            window.location.replace("/logout")
                        }, 2500);
                    } else {
                        let responseData = await response.json()
                        usernameThing.innerText = "Username: " + responseData["username"]
                        storageThing.innerText = "You've used " + formatBytes(responseData["storageused"]) + " out of " + formatBytes(responseData["storagemax"])
                        storageProgressThing.value = responseData["storageused"]
                        storageProgressThing.max = responseData["storagemax"]
                        noteCount = responseData["notecount"]
                    }
                }

                doStuff()
            });
    }

    usernameBox.addEventListener("click", () => {
        optionsCoverDiv.classList.remove("hidden")
        optionsDiv.classList.remove("hidden")
        updateUserInfo()
    });
    logOutButton.addEventListener("click", () => {
        window.location.replace("/logout")
    });
    exitThing.addEventListener("click", () => {
        optionsDiv.classList.add("hidden")
        optionsCoverDiv.classList.add("hidden")
    });
    deleteMyAccountButton.addEventListener("click", () => {
        if (confirm("Are you REALLY sure that you want to delete your account? There's no going back!") === true) {
            fetch(remote + "/api/deleteaccount", {
                method: "POST",
                body: JSON.stringify({
                    secretKey: secretkey
                }),
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                }
            })
                .then((response) => {
                    if (response.status === 200) {
                        window.location.href = "/logout"
                    } else {
                        displayError("Failed to delete account (HTTP error code " + response.status + ")")
                    }
                })
        }
    });

    async function waitForConfirm() {
        let resolvePromise;
        const promise = new Promise(resolve => resolvePromise = resolve);
        closeErrorButton.addEventListener("click", () => {
            resolvePromise();
        });
        await promise;
    }

    async function hashpass(pass) {
        let key = pass
        for (let i = 0; i < 128; i++) {
            key = await hashwasm.sha3(key)
        }
        return key
    }

    changePasswordButton.addEventListener("click", () => {
        optionsDiv.classList.add("hidden")

        async function doStuff() {
            async function fatalError(notes, passwordBackup) {
                displayError("Something went wrong! Your password change has failed. Attempting to revert changes...")
                password = passwordBackup
                localStorage.setItem("DONOTSHARE-password", password)
                let changePasswordBackResponse = await fetch(remote + "/api/changepassword", {
                    method: "POST",
                    body: JSON.stringify({
                        secretKey: secretkey,
                        newPassword: await hashpass(oldPass)
                    }),
                    headers: {
                        "Content-Type": "application/json; charset=UTF-8",
                        "X-Burgernotes-Version": "200"
                    }
                })
                if (changePasswordBackResponse.status === 200) {
                    let responseStatus = await importNotes(notes)
                    if (responseStatus === 500) {
                        closeErrorButton.classList.remove("hidden")
                        displayError("Failed to revert changes. Please delete this user account and sign-up again, then re-import the notes. Click Ok to download the notes to import later.")
                        await waitForConfirm()
                        downloadObjectAsJson(notes, "data")
                    } else {
                        closeErrorButton.classList.remove("hidden")
                        displayError("Password change failed! Changes have been reverted.")
                        updateNotes()
                    }
                } else {
                    displayError("Failed to revert changes. Please delete this user account and sign-up again, then re-import the notes. Click Ok to download the notes to import later.")
                    downloadObjectAsJson(notes, "data")
                }
            }

            displayError("Confirm your current password to change it")
            errorInput.type = "password"
            errorInput.classList.remove("hidden")
            await waitForConfirm()
            const oldPass = errorInput.value
            errorInput.classList.add("hidden")
            if (await hashwasm.sha512(oldPass) !== password) {
                displayError("Incorrect password!")
            } else {
                errorInput.value = ""
                displayError("Enter your new password")
                errorInput.classList.remove("hidden")
                await waitForConfirm()
                errorInput.classList.add("hidden")
                const newPass = errorInput.value
                errorInput.type = "text"
                errorInput.value = ""
                if (newPass.length < 8) {
                    displayError("Password must be at least 8 characters!")
                } else {
                    displayError("Changing your password. This process may take up to 5 minutes. Do NOT close the tab!")
                    closeErrorButton.classList.add("hidden")
                    const response = await fetch(remote + "/api/changepassword", {
                        method: "POST",
                        body: JSON.stringify({
                            secretKey: secretkey,
                            newPassword: await hashpass(newPass)
                        }),
                        headers: {
                            "Content-Type": "application/json; charset=UTF-8",
                            "X-Burgernotes-Version": "200"
                        }
                    })
                    if (response.status === 200) {
                        let notes = await exportNotes()
                        let passwordBackup = password
                        password = await hashwasm.sha512(newPass)
                        localStorage.setItem("DONOTSHARE-password", password)
                        let purgeNotes = await fetch(remote + "/api/purgenotes", {
                            method: "POST",
                            body: JSON.stringify({
                                secretKey: secretkey
                            }),
                            headers: {
                                "Content-Type": "application/json; charset=UTF-8"
                            }
                        })
                        if (purgeNotes.status !== 200) {
                            fatalError(notes, passwordBackup)
                        } else {
                            let responseStatus = await importNotes(notes)
                            errorDiv.classList.add("hidden")
                            if (responseStatus !== 200) {
                                fatalError(notes, passwordBackup)
                            } else {
                                closeErrorButton.classList.remove("hidden")
                                displayError("Password changed!")
                                updateNotes()
                            }
                        }
                    } else {
                        closeErrorButton.classList.remove("hidden")
                        const data = await response.json()
                        console.log(data)
                        displayError(data["error"])
                    }
                }
            }
        }

        doStuff()
    })
    importNotesButton.addEventListener("click", () => {
        optionsDiv.classList.add("hidden")
        importNotesDiv.classList.remove("hidden")
    });
    sessionManagerButton.addEventListener("click", () => {
        optionsDiv.classList.add("hidden")
        sessionManagerDiv.classList.remove("hidden")

        fetch(remote + "/api/sessions/list", {
            method: "POST",
            body: JSON.stringify({
                secretKey: secretkey
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => {
                async function doStuff() {
                    let responseData = await response.json()
                    document.querySelectorAll(".burgerSession").forEach((el) => el.remove());
                    let ua;
                    for (let i in responseData) {
                        let sessionElement = document.createElement("div")
                        let sessionText = document.createElement("p")
                        let sessionImage = document.createElement("img")
                        let sessionRemoveButton = document.createElement("button")
                        sessionText.classList.add("w300")
                        if (responseData[i]["thisSession"] === true) {
                            sessionText.innerText = "(current) " + responseData[i]["device"]
                        } else {
                            sessionText.innerText = responseData[i]["device"]
                        }
                        sessionText.title = responseData[i]["device"]
                        sessionRemoveButton.innerText = "x"

                        sessionImage.src = "/static/svg/device_other.svg"

                        ua = responseData[i]["device"]

                        if (ua.includes("NT") || ua.includes("Linux")) {
                            sessionImage.src = "/static/svg/device_computer.svg"
                        }
                        if (ua.includes("iPhone" || ua.includes("Android") || ua.includes("iPod"))) {
                            sessionImage.src = "/static/svg/device_smartphone.svg"
                        }

                        sessionRemoveButton.addEventListener("click", () => {
                            fetch(remote + "/api/sessions/remove", {
                                method: "POST",
                                body: JSON.stringify({
                                    secretKey: secretkey,
                                    sessionId: responseData[i]["id"]
                                }),
                                headers: {
                                    "Content-Type": "application/json; charset=UTF-8"
                                }
                            })
                                .then(() => {
                                    if (responseData[i]["thisSession"] === true) {
                                        window.location.replace("/logout")
                                    }
                                });
                            sessionElement.remove()
                        });

                        sessionElement.append(sessionImage)
                        sessionElement.append(sessionText)
                        sessionElement.append(sessionRemoveButton)

                        sessionElement.classList.add("burgerSession")

                        sessionDiv.append(sessionElement)
                    }
                }

                doStuff()
            });
    });
    exitImportThing.addEventListener("click", () => {
        optionsDiv.classList.remove("hidden")
        importNotesDiv.classList.add("hidden")
    });
    exitSessionsThing.addEventListener("click", () => {
        optionsDiv.classList.remove("hidden")
        sessionManagerDiv.classList.add("hidden")
    });

    function updateWordCount() {
        let wordCount = noteBox.innerText.split(" ").length
        if (wordCount === 1) {
            wordCount = 0
        }
        wordCountBox.innerText = wordCount + " words"
    }

    function selectNote(nameithink) {
        document.querySelectorAll(".noteButton").forEach((el) => el.classList.remove("selected"));
        let thingArray = Array.from(document.querySelectorAll(".noteButton")).find(el => String(nameithink) === String(el.id));
        thingArray.classList.add("selected")

        fetch(remote + "/api/readnote", {
            method: "POST",
            body: JSON.stringify({
                secretKey: secretkey,
                noteId: nameithink,
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .catch(() => {
                noteBox.contentEditable = false
                noteBox.innerHTML = ""
                displayError("Something went wrong... Please try again later!")
            })
            .then((response) => {
                selectedNote = nameithink
                if (mobile) {
                    handleGesture()
                }
                noteBox.contentEditable = true
                noteBox.click()

                async function doStuff() {
                    let responseData = await response.json()

                    let bytes = CryptoJS.AES.decrypt(responseData["content"], password);
                    let cleanedHTML = bytes.toString(CryptoJS.enc.Utf8).replace(/<(?!\/?(h1|h2|br)\b)[^>]*>/gi, '')
                    noteBox.innerHTML = cleanedHTML.replace("\n", "<br>")

                    updateWordCount()

                    noteBox.addEventListener("input", () => {
                        updateWordCount()
                        clearTimeout(timer);
                        timer = setTimeout(() => {
                            let preEncryptedTitle = noteBox.innerText

                            if (noteBox.innerText.substring(0, noteBox.innerText.indexOf("\n")) !== "") {
                                preEncryptedTitle = noteBox.innerText.substring(0, noteBox.innerText.indexOf("\n"));
                            }

                            preEncryptedTitle = truncateString(preEncryptedTitle, 15)
                            document.getElementById(nameithink).innerText = preEncryptedTitle

                            let encryptedText = CryptoJS.AES.encrypt(noteBox.innerHTML, password).toString();
                            let encryptedTitle = CryptoJS.AES.encrypt(preEncryptedTitle, password).toString();

                            console.log(encryptedTitle)
                            console.log(encryptedText)

                            if (selectedNote === nameithink) {
                                fetch(remote + "/api/editnote", {
                                    method: "POST",
                                    body: JSON.stringify({
                                        secretKey: secretkey,
                                        noteId: nameithink,
                                        content: encryptedText,
                                        title: encryptedTitle
                                    }),
                                    headers: {
                                        "Content-Type": "application/json; charset=UTF-8"
                                    }
                                })
                                    .then((response) => {
                                        if (response.status === 418) {
                                            displayError("You've ran out of storage... Changes will not be saved until you free up storage!")
                                        }
                                    })
                                    .catch(() => {
                                        displayError("Failed to save changes, please try again later...")
                                    })
                            }
                        }, waitTime);
                    });
                }

                doStuff()
            });
    }

    function updateNotes() {
        console.log("Notes updated")
        fetch(remote + "/api/listnotes", {
            method: "POST",
            body: JSON.stringify({
                secretKey: secretkey
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => {
                async function doStuff() {
                    noteBox.contentEditable = false
                    selectedNote = 0
                    noteBox.innerHTML = ""
                    clearTimeout(timer)
                    updateWordCount()
                    let responseData = await response.json()

                    let decryptedResponseData = []

                    let highestID = 0
                    let noteData;
                    for (let i in responseData) {
                        noteData = responseData[i]

                        let bytes = CryptoJS.AES.decrypt(noteData["title"], password);
                        noteData["title"] = bytes.toString(CryptoJS.enc.Utf8)

                        if (noteData["id"] > highestID) {
                            highestID = noteData["id"]
                        }

                        decryptedResponseData.push(noteData)
                        console.log(noteData)
                    }

                    document.querySelectorAll(".noteButton").forEach((el) => el.remove());
                    for (let i in decryptedResponseData) {
                        let noteData = decryptedResponseData[i]

                        let noteButton = document.createElement("button");
                        noteButton.classList.add("noteButton")
                        notesDiv.append(noteButton)

                        console.log(noteData["title"])

                        if (noteData["title"] === "") {
                            console.log(noteData["title"])
                            console.log("case")
                            noteData["title"] = "New note"
                        }

                        noteButton.id = noteData["id"]
                        noteButton.innerText = truncateString(noteData["title"], 15)

                        noteButton.addEventListener("click", (event) => {
                            if (event.ctrlKey) {
                                fetch(remote + "/api/removenote", {
                                    method: "POST",
                                    body: JSON.stringify({
                                        secretKey: secretkey,
                                        noteId: noteData["id"]
                                    }),
                                    headers: {
                                        "Content-Type": "application/json; charset=UTF-8"
                                    }
                                })
                                    .then(() => {
                                        updateNotes()
                                    })
                                    .catch(() => {
                                        displayError("Something went wrong! Please try again later...")
                                    })
                            } else {
                                selectNote(noteData["id"])
                            }
                        });
                    }
                    document.querySelectorAll(".loadingStuff").forEach((el) => el.remove());

                    if (selectLatestNote === true) {
                        selectNote(highestID)
                        selectLatestNote = false
                    }
                }

                doStuff()
            });
    }

    updateNotes()

    newNote.addEventListener("click", () => {
        let noteName = "New note"
        selectLatestNote = true
        console.log(selectLatestNote)

        // create fake item
        document.querySelectorAll(".noteButton").forEach((el) => el.classList.remove("selected"));
        let noteButton = document.createElement("button");
        noteButton.classList.add("noteButton")
        notesDiv.append(noteButton)
        noteButton.innerText = "New note"
        noteButton.style.order = "-1"
        noteButton.classList.add("selected")
        noteBox.click()

        let encryptedName = CryptoJS.AES.encrypt(noteName, password).toString(CryptoJS.enc.Utf8);

        fetch(remote + "/api/newnote", {
            method: "POST",
            body: JSON.stringify({
                secretKey: secretkey,
                noteName: encryptedName,
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .catch(() => {
                displayError("Failed to create new note, please try again later...")
            })
            .then((response) => {
                if (response.status !== 200) {
                    updateNotes()
                    displayError("Failed to create new note (HTTP error code " + response.status + ")")
                } else {
                    updateNotes()
                }
            });
    });

    function downloadObjectAsJson(exportObj, exportName) {
        let dataStr = "data:text/json;charset=utf-8," + JSON.stringify(exportObj);
        let downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    async function exportNotes() {
        let exportNotesFetch = await fetch(remote + "/api/exportnotes", {
            method: "POST",
            body: JSON.stringify({
                secretKey: secretkey
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
        let responseData = await exportNotesFetch.json()
        for (let i in responseData) {
            exportNotes.innerText = "Decrypting " + i + "/" + noteCount

            let bytes = CryptoJS.AES.decrypt(responseData[i]["title"], password);
            responseData[i]["title"] = bytes.toString(CryptoJS.enc.Utf8)

            let bytesd = CryptoJS.AES.decrypt(responseData[i]["content"], password);
            responseData[i]["content"] = bytesd.toString(CryptoJS.enc.Utf8)
        }
        return responseData
    }

    async function importNotes(plaintextNotes) {
        for (let i in plaintextNotes) {
            let originalTitle = plaintextNotes[i]["title"];
            plaintextNotes[i]["title"] = CryptoJS.AES.encrypt(originalTitle, password).toString();

            let originalContent = plaintextNotes[i]["content"];
            plaintextNotes[i]["content"] = CryptoJS.AES.encrypt(originalContent, password).toString();
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
    }

    function firstNewVersion() {
        if (localStorage.getItem("NEWVERSION") === "1.2") {
            return false;
        } else {
            localStorage.setItem("NEWVERSION", "1.2")
            return true;
        }
    }

    exportNotesButton.addEventListener("click", () => {
        let responseData = exportNotes()
        downloadObjectAsJson(responseData, "data")
        optionsDiv.classList.add("hidden")
        displayError("Exported notes!")
    });

    importFile.addEventListener('change', function () {
        let fileread = new FileReader()
        fileread.addEventListener(
            "load",
            () => {
                let decrypted = JSON.parse(fileread.result.toString())
                importNotes(decrypted)
                    .then((responseStatus) => {
                        if (responseStatus === 500) {
                            optionsDiv.classList.add("hidden")
                            importNotesDiv.classList.add("hidden")
                            displayError("Something went wrong! Perhaps your note file was invalid?")
                        } else {
                            optionsDiv.classList.add("hidden")
                            importNotesDiv.classList.add("hidden")
                            displayError("Notes uploaded!")
                            updateNotes()
                        }
                    })
            },
            false,
        );

        fileread.readAsText(importFile.files[0])
    })

    removeBox.addEventListener("click", () => {
        if (selectedNote === 0) {
            displayError("You need to select a note first!")
        } else {
            selectLatestNote = true
            fetch(remote + "/api/removenote", {
                method: "POST",
                body: JSON.stringify({
                    secretKey: secretkey,
                    noteId: selectedNote
                }),
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                }
            })
                .then(() => {
                    updateNotes()
                })
                .catch(() => {
                    displayError("Something went wrong! Please try again later...")
                })
        }
    });

    if (firstNewVersion()) {
        displayError("What's new in Burgernotes 2.0?\nRestyled client\nAdded changing passwords\nAdded importing notes")
    }

    checknetwork()
})
// @license-end
