var serviceArray = []
var qr;
var appVersion;
var appstring;

var timestamp;

function trackTimeout() {

    let date = new Date;
    let seconds = date.getSeconds();
    if (seconds > 29) { seconds -= 30 }
    let remaining = 30 - seconds;
    let percentage = Math.round(remaining / 30 * 100);
    $("#timeoutbar").css("width", percentage + "%");
    //$("#timeoutbar").animate({ width: percentage + "%" }, 1000);
    $("#counter").html(remaining);
    let now = Date.now();
    let diff = (now - timestamp)

    if (remaining == 30 || diff > 29999 ) {
        updateTOTP();
    }
}

var timeoutid;

function sendMessage(message) {
    $("#messagebox").html(message);
    if (timeoutid) {
        clearTimeout(timeoutid);
    }
    timeoutid = setTimeout(clearMessage, 3000);
}

function clearMessage() {
    $("#messagebox").html("");
}

function addService(servicename, secrettoken) {
    let savetoken = encrypt(secrettoken)
    let itemarray = [servicename, savetoken]
    serviceArray.push(itemarray);

    localStorage.services = JSON.stringify(serviceArray);
}

function getServices() {
    if (localStorage.getItem("services") === null) {
        console.log("Item does not exist in localstorage. Creating ..");
        addService('example', '37MQJFYAGUPFARBU3ZOCYET2EPO463PX6NIAUAGEVRE2GDQYY7HA')
        serviceArray = JSON.parse(localStorage.services);
    } else {
        serviceArray = JSON.parse(localStorage.services);
    }

    let html = '<div id="messagebox"></div>';
    for (let i = 0; i < serviceArray.length; i++) {
        service = serviceArray[i];
        key = service[0]
        value = decrypt(service[1])
        //html += 'key: ' + key + ', value: ' + value + "<br>";
        html += '<div id="' + key + '" class="serviceitem">'
        html += '<div class="totp_name" > ' + key + '</div > <div id="' + key + '_totp" class="totp_key"></div><div id="' + key + '_ntotp" class="ntotp_key"></div>'
        html += '<div class="removeservice" onclick=openDeletedialog("'+key+'") ><img src="images/remove.png" style="height:100%; width:100%" /></div > '
        html += '</div > '
    }
    $('#content').html(html);
}

function updateTOTP() {
    for (let i = 0; i < serviceArray.length; i++) {
        service = serviceArray[i];
        key = service[0]
        value = decrypt(service[1])
        checkForm(key, value);
    }
    timestamp = Date.now()
    console.log('[TOTP] refreshed');
}

function newService() {
    let newservice = $("#newservice").val();
    let newsecret = $("#newsecret").val();
    if (!newservice) {
        console.log("No service name entered");
        return;
    }
    if (!newsecret) {
        console.log("No secret provided");
        return;
    }
    // check if service name already exists
    for (let i = 0; i < serviceArray.length; i++) {
        service = serviceArray[i];
        key = service[0]
        if (newservice == key) {
            return;
        }
    }
    $('#newservice').val('')
    $('#newsecret').val('')
    addService(newservice, newsecret)
    getServices();
    updateTOTP();
    $("#newservice_overlay").hide()
}

function removeService(deleteservice) {
    let deleteArray = []
    for (let i = 0; i < serviceArray.length; i++) {
        service = serviceArray[i];
        key = service[0]
        encryptedvalue = service[1]
        if (deleteservice == key) {
            console.log('[SERVICE] '+deleteservice+' removed')
        }
        else {
            let itemarray = [key, encryptedvalue]
            deleteArray.push(itemarray);
        }
    }
    localStorage.services = JSON.stringify(deleteArray);
    $("#delete_overlay").hide()
    getServices();
    updateTOTP();
}

function hideDialogs() {
    $("#delete_overlay").hide();
    $("#settings_overlay").hide();
    $("#newservice_overlay").hide();
    $("#qrscanner_overlay").hide();
}

function openDeletedialog(servicename) {
    let deletemessage = "Are you sure you want to delete <span style='font-weight:bold; color:Highlight;'>" + servicename + "</span>?"
    $("#delete_confirm").attr("onclick", "removeService('"+servicename+"')");
    $("#deletelabel").html(deletemessage);
    hideDialogs();
    $("#delete_overlay").show()
}

function openNewservicedialog(qrlabel, qrsecret) {
    stopQR();
    hideDialogs();
    $("#newsecret").val(qrsecret);
    $("#newservice").val(qrlabel);
    $("#newservice_overlay").show();
}

function openQRdialog() {
    hideDialogs();
    $("#qrscanner_overlay").show();
    setTimeout(startQR, 1000);
}

function closeQRdialog() {
    $("#qrscanner_overlay").hide();
    stopQR();
}

function openSettings() {
    $("#settingslabel").html('TwoSteps v' + appstring + ' by mavodev')
    hideDialogs();
    $("#settings_overlay").show()
}

function displayCode(service, secret, totp, type) {
    var timeout = (new Date()).toLocaleTimeString()
    //stringout = 'TOTP: ' + totp + ', Time: ' + timeout;
    //console.log(stringout);
    $("#" + service + "_" + type).html(totp);
}

//Checks and processes the form
function validate (x) {
    return !x.reportValidity || x.reportValidity();
};

//Math.range
function range (min, x, max) {
    return Math.max(Math.min(x | 0, max), min) | 0;
};

function checkForm(service, secretstring) {

    //List of valid TOTP Secret code patterns
    var pattern = {
        //Base32 Code
        "1": {
            regex: "[A-Za-z2-7]+=*",
            title: "Secret should be Base32 encoded (using only a-z and 2-7)"
        },
        //Raw Hex Code
        "2": {
            regex: "([A-Fa-f0-9]{2})*",
            title: "Hexadecimal only (0-9 and a-f, even number of characters)"
        }
    };

    //TOTP Secret
    //var txt = q("#token");

    //Number of TOTP digits
    //TOTP only supports 6 - 8 digits.
    var num = "6";

    //Secret Code type
    //"1" => (Default) Base32 (a-z, 2-7)
    //"2" => Hexadecimal (a-f, 0-9)
    var sel = "1";

    //IE11 and older has no reportValidity support
    if (validate(secretstring) && validate(num) && validate(sel)) {
        var length = range(6, +num.value, 8);
        var secret = secretstring;
        var current = TOTP.getCurrentCounter(30);
        var next = (TOTP.getCurrentCounter(30) + 1);

        //console.log("current: " + current + ", next: " + next);

        if (sel === "1") {
            try {
                secret = Convert.base32toHex(secret);
            } catch (e) {
                alert("Invalid Base32 characters");
                return;
            }
        }
        
        // get current code
        try {
            TOTP.otp(secret, current, length, function (code) {
                //console.log(code)
                displayCode(service, secretstring, code, "totp");
            });

        } catch (e) {
            console.error(e);
            alert("Problem decoding Secret.\nVerify your secret and type are correct.\nMessage from decoder: " + e.message);
        };

        // get next code
        try {
            TOTP.otp(secret, next, length, function (code) {
                //console.log(code)
                displayCode(service, secretstring, code, "ntotp");
            });

        } catch (e) {
            console.error(e);
            alert("Problem decoding Secret.\nVerify your secret and type are correct.\nMessage from decoder: " + e.message);
        };
    }

};

function exportServices() {
    let jsonstring = JSON.stringify(serviceArray);
    const file = new File([jsonstring], 'twosteps_export.json', {
        type: 'application/json',
    })
    
    const link = document.createElement('a')
    const url = URL.createObjectURL(file)

    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

function saveFileWorks() {
    // Create the picker object and set options
    var savePicker = new Windows.Storage.Pickers.FileSavePicker();
    savePicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
    // Dropdown of file types the user can save the file as
    savePicker.fileTypeChoices.insert("Plain Text", [".json"]);
    // Default file name if the user does not type one in or select a file to replace
    savePicker.suggestedFileName = "twosteps_export_test";

    savePicker.pickSaveFileAsync().then(function (file) {
        if (file != null) {
            Windows.Storage.CachedFileManager.DeferUpdates(file);
            Windows.Storage.FileIO.WriteTextAsync(file, "file contents").then(function () {
                Windows.Storage.CachedFileManager.CompleteUpdatesAsync(file);
            }); 
        }
       
    });
}

function saveFile() {
    // Create the picker object and set options
    var savePicker = new Windows.Storage.Pickers.FileSavePicker();
    savePicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
    // Dropdown of file types the user can save the file as
    savePicker.fileTypeChoices.insert("JSON", [".json"]);
    // Default file name if the user does not type one in or select a file to replace
    savePicker.suggestedFileName = "twosteps_export";

    sendMessage("Select file to save to ..");
    savePicker.pickSaveFileAsync().then(function (file) {
        sendMessage("Checking for file ..");
        if (file != null) {
            sendMessage("Writing to file ..");
            let jsonstring = JSON.stringify(serviceArray);
            Windows.Storage.FileIO.writeTextAsync(file, jsonstring).done(function () {
                sendMessage("Completing updates to file ..");
                Windows.Storage.CachedFileManager.completeUpdatesAsync(file).done(function (updateStatus) {
                    sendMessage("Checking update status ..");
                    if (updateStatus === Windows.Storage.Provider.FileUpdateStatus.complete) {
                        sendMessage("File " + file.name + " was saved.");
                    } else {
                        sendMessage("File " + file.name + " couldn't be saved.");
                    }
                });
            });
        }
        else {
            sendMessage("Canceled");
        }

    });
}

function importServices() {
    $('#contentFile').click()
}

function forceVideosize() {
    let videoheight = $("#videobox").height()
    let videowidth = $("#videobox").width()
    let containerheight = $("#videocontainer").height();
    let containerwidth = $("#videocontainer").width()
    $("#videobox").height(containerheight);

}

function decodeMessage(message) {
    let output = '';
    let qrsecret = '';
    let qrlabel = '';
    let protocol = "otpauth://totp/"

    if (message.startsWith(protocol)) {
        let messagepieces = message.split('?');
        qrlabel = messagepieces[0].replace("otpauth://totp/","")
        let parameters = messagepieces[1].split('&');
        for (let p = 0; p < parameters.length; p++) {
            let parametersplit = parameters[p].split('=');
            let key = parametersplit[0]
            let value = parametersplit[1]
            if (key == "secret") {
                output += key + ': ' + value + '; '
                qrsecret = value;
            }
        }
    }
    else {
        output = 'not an otpauth secret';
    }
    $("#messagebox").html(output);
    openNewservicedialog(qrlabel, qrsecret)
}



function resultHandler(err, result) {
    if (err)
        return console.log(err.message);

    decodeMessage(result);
}

function startQR() {

    qr = new QCodeDecoder();
    var video = document.querySelector('video');

    $("#messagebox").html("")

    if (!(qr.isCanvasSupported() && qr.hasGetUserMedia())) {
        alert('Your browser doesn\'t match the required specs.');
        throw new Error('Canvas and getUserMedia are required');
    }
    qr.decodeFromCamera(video, resultHandler);
    forceVideosize();
}

function stopQR() {
    qr.stop();
    $("#messagebox").html("")
}

function onBackPressed(event) {
    if ($('#newservice_overlay:visible').length > 0) {
        $("#newservice_overlay").hide();
        event.handled = true;
    }
    else if ($('#qrscanner_overlay:visible').length > 0) {
        closeQRdialog();
        event.handled = true;
    }
    else if ($('#delete_overlay:visible').length > 0) {
        $("#delete_overlay").hide()
        event.handled = true;
    }
    else if ($('#settings_overlay:visible').length > 0) {
        $("#settings_overlay").hide()
        event.handled = true;
    }
}

$(document).ready(function () {
    try {
        Windows.UI.Core.SystemNavigationManager.getForCurrentView().addEventListener("backrequested", onBackPressed);
        appVersion = Windows.ApplicationModel.Package.current.id.version;
        appstring = `${appVersion.major}.${appVersion.minor}.${appVersion.build}`;
        var currentView = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
        currentView.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
    }
    catch(e) {
        console.log('Windows namespace not available, backbutton listener and versioninfo skipped.')
        appstring = 'n/a';
    }

    trackTimeout();
    getServices();
    updateTOTP();
    document.onselectstart = new Function("return false")

    document.getElementById('contentFile').onchange = function (evt) {
        try {
            let files = evt.target.files;
            if (!files.length) {
                alert('No file selected!');
                return;
            }
            let file = files[0];
            let reader = new FileReader();
            const self = this;
            reader.onload = (event) => {
                //console.log('FILE CONTENT', event.target.result);
                importedItems = 0;
                importArray = JSON.parse(event.target.result);

                for (let i = 0; i < importArray.length; i++) {
                    service = importArray[i];
                    key = service[0]
                    value = decrypt(service[1])
                    let inList = "false";
                    console.log (key+' '+value)
                    for (let c = 0; c < serviceArray.length; c++) {
                        checkservice = serviceArray[c];
                        checkkey = checkservice[0]
                        if (checkkey == key) {
                            inList = "true"
                        }
                    }
                    if (inList == "false") {
                        addService(key, value);
                        importedItems++;
                    }
                }
                let message = importedItems + ' items imported';
                sendMessage(message);
                getServices();
                updateTOTP();
            };
            reader.readAsText(file);
        } catch (err) {
            console.error(err);
        }
    }

    setInterval(trackTimeout, 1000)
});