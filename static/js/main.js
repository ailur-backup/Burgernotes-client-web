// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0

let secretKey = localStorage.getItem("PRIVATE-secretKey")
let password = localStorage.getItem("PRIVATE-cryptoKey")
let fontSize = localStorage.getItem("SETTING-fontsize")
let remote = localStorage.getItem("SETTING-homeServer")

if (secretKey === null || password === null) {
    window.location.replace("/login")
    document.body.innerHTML = "Redirecting..."
    throw new Error();
} else if (fontSize === null) {
    localStorage.setItem("SETTING-fontsize", "16")
    fontSize = 16
}

if (remote == null) {
    localStorage.setItem("SETTING-homeServer", "https://notes.hectabit.org")
    remote = "https://notes.hectabit.org"
}

function formatBytes(a, b = 2) {
    if (!+a) return "0 Bytes"; const c = 0 > b ? 0 : b, d = Math.floor(Math.log(a) / Math.log(1000));
    return `${parseFloat((a / Math.pow(1000, d)).toFixed(c))} ${["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]}`
}

let offlineMode = false
let backButton = document.getElementById("backButton")
let usernameBox = document.getElementById("usernameBox")
let optionsCoverDiv = document.getElementById("optionsCoverDiv")
let optionsDiv = document.getElementById("optionsDiv")
let errorDiv = document.getElementById("errorDiv")
let uploadThing = document.getElementById("uploadThing")
let browseButton = document.getElementById("browseButton")
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
let importFileConfirm = document.getElementById("importFileConfirm")

let selectedNote = 0
let timer
let waitTime = 400
let indiv = false
let mobile = false
let selectLatestNote = false

function arrayBufferToBase64(buffer) {
    const uint8Array = new Uint8Array(buffer);
    return btoa(String.fromCharCode.apply(null, uint8Array))
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const length = binaryString.length;
    const buffer = new ArrayBuffer(length);
    const uint8Array = new Uint8Array(buffer);
    for (let i = 0; i < length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }
    return buffer;
}

async function getKey() {
    let salt = new TextEncoder().encode("I love Burgernotes!")
    let cryptoKey = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits", "deriveKey"])
    return await window.crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt,
        iterations: 1,
        hash: "SHA-512"
    }, cryptoKey, {name: "AES-GCM", length: 256}, true, ["encrypt", "decrypt"])
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

async function decrypt(encrypted) {
    if (encrypted === "") {
        return ""
    } else {
        let cryptoKey = await getKey()
        let jsonData = JSON.parse(atob(encrypted))
        let encryptedData = base64ToArrayBuffer(jsonData.encrypted)
        let iv = base64ToArrayBuffer(jsonData.iv)
        let decrypted = await window.crypto.subtle.decrypt({
            name: "AES-GCM",
            iv: iv
        }, cryptoKey, encryptedData)
        return new TextDecoder().decode(decrypted)
    }
}

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

// Init the note box
document.addEventListener("DOMContentLoaded", async function () {
    pell.init({
        element: pellAttacher,
        onChange: function (html) {
            // Having a nice day? This does nothing.
        },
        defaultParagraphSeparator: 'br',
        styleWithCSS: false,
        classes: {
            actionbar: 'pell-actionbar',
            button: 'pell-button',
            content: 'pell-content',
            selected: 'pell-button-selected'
        },
        actions: [
            "bold",
            "italic",
            "underline",
            "strikethrough",
            "heading1",
            "heading2",
            "paragraph",
            "quote",
            "olist",
            "ulist",
            "code",
            "line",
            "link",
            {
                name: 'uploadimage',
                icon: '📁',
                title: 'Upload image',
                result: async function result() {
                    browseButton.classList.remove("hidden")
                    displayError("Select an image to upload:")
                    await waitForConfirm()
                    browseButton.classList.add("hidden")
                    let file = uploadThing.files[0]
                    if (file) {
                        let reader = new FileReader()
                        reader.readAsDataURL(file)
                        uploadThing.files = null
                        reader.onload = function () {
                            pell.exec('insertImage', reader.result);
                        }
                    }
                }
            },
            "image",
        ],
    })
    let noteBox = document.getElementsByClassName("pell-content")[0]

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
        noteBox.style.fontSize = fontSize + "px"
        textSizeBox.innerText = fontSize + "px"
    }

    async function checknetwork() {
        fetch(remote + "/api/loggedin", {
            method: "POST",
            body: JSON.stringify({
                secretKey: secretKey
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .catch(() => {
                offlineMode = true
                noteBox.contentEditable = false
                noteBox.innerHTML = "<h1>You are currently offline.</h1>"
                displayError("Failed to connect to the server.\nPlease check your internet connection.")
            })
            .then((response) => response)
            .then((response) => {
                if (response.status === 400 || response.status === 401) {
                    offlineMode = true
                    displayError("Something went wrong! Signing you out...")
                    closeErrorButton.classList.add("hidden")
                    setTimeout(function () {
                        window.location.replace("/logout")
                    }, 2500);
                } else if (response.status === 200) {
                    updateUserInfo()
                } else {
                    offlineMode = true
                    noteBox.readOnly = true
                    noteBox.innerHTML = "<h1>You are currently offline.</h1>"
                    displayError("Failed to connect to the server.\nPlease check your internet connection.")
                }
            });
    }

    updateFont()

    textPlusBox.addEventListener("click", () => {
        localStorage.setItem("SETTING-fontsize", String(Number(fontSize) + Number(1)))
        updateFont()
    });
    textMinusBox.addEventListener("click", () => {
        localStorage.setItem("SETTING-fontsize", String(Number(fontSize) - Number(1)))
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
                secretKey: secretKey
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .then(async (response) => {
                if (response.status === 500 || response.status === 401) {
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
                    secretKey: secretKey
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

    changePasswordButton.addEventListener("click", async () => {
        optionsDiv.classList.add("hidden")

        async function fatalError(notes, passwordBackup) {
            displayError("Something went wrong! Your password change has failed. Attempting to revert changes...")
            password = passwordBackup
            localStorage.setItem("PRIVATE-cryptoKey", password)
            let changePasswordBackResponse = await fetch(remote + "/api/changepassword", {
                method: "POST",
                body: JSON.stringify({
                    secretKey: secretKey,
                    newPassword: await hashpass(oldPass),
                    migration: false
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
        if (await hashwasm.argon2id({
            password: password,
            salt: new TextEncoder().encode("I love Burgernotes!"),
            parallelism: 1,
            iterations: 32,
            memorySize: 19264,
            hashLength: 32,
            outputType: "hex"
        }) !== password) {
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
                        secretKey: secretKey,
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
                    password = await hashwasm.argon2id({
                        password: password,
                        salt: new TextEncoder().encode("I love Burgernotes!"),
                        parallelism: 1,
                        iterations: 32,
                        memorySize: 19264,
                        hashLength: 32,
                        outputType: "hex"
                    })
                    localStorage.setItem("PRIVATE-cryptoKey", password)
                    let purgeNotes = await fetch(remote + "/api/purgenotes", {
                        method: "POST",
                        body: JSON.stringify({
                            secretKey: secretKey
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
                    displayError(data["error"])
                }
            }
        }
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
                secretKey: secretKey
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
            .then(async (response) => {
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
                                secretKey: secretKey,
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
                secretKey: secretKey,
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
            .then(async (response) => {
                selectedNote = nameithink
                if (mobile) {
                    handleGesture()
                }
                noteBox.contentEditable = true
                noteBox.click()

                let responseData = await response.json()

                let htmlNote
                try {
                    htmlNote = await decrypt(responseData["content"])
                } catch (e) {
                    console.log(e)
                    console.log(responseData)
                }

                console.log(htmlNote)
                let cleanedHTML = htmlNote.replace(/<(?!\/?(h1|h2|br|img|blockquote|ol|li|b|i|u|strike|p|pre|ul|hr|a)\b)[^>]*>/gi, '(potential XSS tag was here)')
                noteBox.innerHTML = cleanedHTML.replaceAll("\n", "<br>")

                updateWordCount()

                noteBox.addEventListener("input", () => {
                    updateWordCount()
                    clearTimeout(timer);
                    timer = setTimeout(async () => {
                        let preEncryptedTitle = "New note"

                        if (noteBox.innerText !== "") {
                            preEncryptedTitle = new RegExp('(.+?)(?=\n)|[\s\S]*?(\S+)(?=\n)').exec(noteBox.innerText)[0]
                        }

                        preEncryptedTitle = truncateString(preEncryptedTitle, 15)
                        document.getElementById(nameithink).innerText = preEncryptedTitle

                        console.log(noteBox.innerHTML)
                        let encryptedText = await encrypt(noteBox.innerHTML)
                        let encryptedTitle = await encrypt(preEncryptedTitle)

                        if (selectedNote === nameithink) {
                            fetch(remote + "/api/editnote", {
                                method: "POST",
                                body: JSON.stringify({
                                    secretKey: secretKey,
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
            });
    }

    function updateNotes() {
        if (!offlineMode) {
            fetch(remote + "/api/listnotes", {
                method: "POST",
                body: JSON.stringify({
                    secretKey: secretKey
                }),
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                }
            })
                .then(async (response) => {
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

                        try {
                            noteData["title"] = await decrypt(noteData["title"])
                        } catch (e) {
                            if (!offlineMode) {
                                location.href = "/migrate"
                            }
                        }

                        if (noteData["id"] > highestID) {
                            highestID = noteData["id"]
                        }

                        decryptedResponseData.push(noteData)
                    }

                    document.querySelectorAll(".noteButton").forEach((el) => el.remove());
                    for (let i in decryptedResponseData) {
                        let noteData = decryptedResponseData[i]

                        let noteButton = document.createElement("button");
                        noteButton.classList.add("noteButton")
                        notesDiv.append(noteButton)

                        if (noteData["title"] === "") {
                            noteData["title"] = "New note"
                        }

                        noteButton.id = noteData["id"]
                        noteButton.innerText = truncateString(noteData["title"], 15)

                        noteButton.addEventListener("click", (event) => {
                            if (event.ctrlKey) {
                                fetch(remote + "/api/removenote", {
                                    method: "POST",
                                    body: JSON.stringify({
                                        secretKey: secretKey,
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
                });
        } else {
            console.log("Currently offline, refusing to update notes.")
        }
    }

    newNote.addEventListener("click", async () => {
        let noteName = "New note"
        selectLatestNote = true

        // create fake item
        document.querySelectorAll(".noteButton").forEach((el) => el.classList.remove("selected"));
        let noteButton = document.createElement("button");
        noteButton.classList.add("noteButton")
        notesDiv.append(noteButton)
        noteButton.innerText = "New note"
        noteButton.style.order = "-1"
        noteButton.classList.add("selected")
        noteBox.click()

        let encryptedName
        encryptedName = await encrypt(noteName)

        fetch(remote + "/api/newnote", {
            method: "POST",
            body: JSON.stringify({
                secretKey: secretKey,
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
        if (!offlineMode) {
            let exportNotesFetch = await fetch(remote + "/api/exportnotes", {
                method: "POST",
                body: JSON.stringify({
                    secretKey: secretKey
                }),
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                }
            })
            let responseData = await exportNotesFetch.json()
            for (let i in responseData) {
                exportNotes.innerText = "Decrypting " + i + "/" + noteCount

                try {
                    responseData[i]["title"] = await decrypt(responseData[i]["title"])
                    responseData[i]["content"] = await decrypt(responseData[i]["content"])
                } catch (e) {
                    location.href = "/migrate"
                }
            }
            return responseData
        } else {
            displayError("You can't export notes while offline!")
        }
    }

    async function importNotes(plaintextNotes) {
        for (let i in plaintextNotes) {
            plaintextNotes[i]["title"] = await encrypt(plaintextNotes[i]["title"])
            plaintextNotes[i]["content"] = await encrypt(plaintextNotes[i]["content"])
        }
        let importNotesFetch = await fetch(remote + "/api/importnotes", {
            method: "POST",
            body: JSON.stringify({
                "secretKey": secretKey,
                "notes": JSON.stringify(plaintextNotes)
            }),
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        })
        return importNotesFetch.status
    }

    function firstNewVersion() {
        if (localStorage.getItem("SETTING-newVersion") === "2.0") {
            return false;
        } else {
            localStorage.setItem("SETTING-newVersion", "2.0")
            return true;
        }
    }

    exportNotesButton.addEventListener("click", () => {
        let responseData = exportNotes()
        downloadObjectAsJson(responseData, "data")
        optionsDiv.classList.add("hidden")
        displayError("Exported notes!")
    });

    importFileConfirm.addEventListener('click', function () {
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

        fileread.readAsText(uploadThing.files[0])
    })

    removeBox.addEventListener("click", () => {
        if (selectedNote === 0) {
            displayError("You need to select a note first!")
        } else {
            selectLatestNote = true
            fetch(remote + "/api/removenote", {
                method: "POST",
                body: JSON.stringify({
                    secretKey: secretKey,
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
        displayError("What's new in Burgernotes 2.0?\nRestyled client\nAdded changing passwords\nAdded importing notes\nChange the use of CryptoJS to Native AES GCM\nUse Argon2ID for hashing rather than the SHA family\nAdded a Proof-Of-Work CAPTCHA during signup\nMade the signup and login statuses more descriptive\nFixed various bugs and issues\nAdded markdown notes\nAdded support for uploading photos\nImproved privacy policy to be clearer about what is and isn't added\nRemoved some useless uses of cookies and replaced with localStorage\nFixed the privacy policy not redirecting correctly\nAdded a list of native clients\nMade the client support LibreJS and therefore GNU Icecat")
    }

    await checknetwork()
    updateNotes()
})
// @license-end
