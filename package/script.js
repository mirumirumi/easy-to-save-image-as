
/**
 * input key names that typed keys
 */
let pressedKeys = [];
let isInputting = false;

$("#key-set").focus(function inputKeyNames() {
    isInputting = true;
    $(document).keydown((e) => {
        e.preventDefault();
        if (isInputting === false) {
            return;
        }
        $("#key-set").val("");
        if (isExistSameChar(e.key) === false) {
            pressedKeys.push(e.key);
        }
        pressedKeys.forEach(key => {
            $("#key-set").val($("#key-set").val() + " " + key);
            $("#key-set").val(fixKeyString(convertUpperCase($("#key-set").val())));
        });
        $(".form-icon.check").addClass("check-icon");
        $(".form-icon.cross").addClass("cross-icon");
    });
    $(document).keyup((e) => {
        pressedKeys = [];
    });
});

function isExistSameChar(keyname) {
    return pressedKeys.includes(keyname);
}

function convertUpperCase(keyString) {
    let keyStringArray = keyString.split(" ");
    let result = "";
    keyStringArray.forEach(arr => {
        if (arr.length === 1) {
            result += " " + arr.toUpperCase();
        } else {
            result += " " + arr;
        }
    });
    return result;
}

function fixKeyString(keyString) {
    return keyString
        .replace(/^ */gi, "")
        .replace(/Control/gi, "Ctrl");
}

$(".form-icon.check").click(() => {
    decideInputKeyNames();
});

$("#key-set").blur(() => {
    decideInputKeyNames();
});

function decideInputKeyNames() {
    document.activeElement.blur();
    isInputting = false;
    pressedKeys = [];
    $(".form-icon.check").removeClass("check-icon");
}

$(".form-icon.cross").click(function deregistrerInputKeyNames() {
    document.activeElement.blur();
    isInputting = false;
    pressedKeys = [];
    $("#key-set").val("");
    $(".form-icon.check").removeClass("check-icon");
    $(".form-icon.cross").removeClass("cross-icon");
});


/**
 * read current settings
 */
$(document).ready(() => readCurrentSettings());

function readCurrentSettings() {
    chrome.storage.sync.get((settingsReaded) => { //none 1st arg is all read
        let page = location.pathname;
        let keyEnabled = "enabled_" + page;
        let keyKeys = "keys_" + page;
        let keyClicks = "clicks_" + page;
        if (settingsReaded[keyEnabled]) {
            $("#enable-switch input").prop("checked", settingsReaded[keyEnabled] ? true : false);
        } else { //off
            $("#key-set, #left-click, #right-click, #both-click").attr("disabled", "disabled");
        }
        if (settingsReaded[keyKeys]) {
            let keysStr = "";
            settingsReaded[keyKeys].forEach(k => {
                keysStr += k + " ";
            });
            $("#key-set").val(keysStr.slice(0, -1)); //rm tale space
            if ($("#key-set").val() !== "") {
                $(".form-icon.cross").addClass("cross-icon");
            }
        }
        if (settingsReaded[keyClicks]) {
            $("input[name='clicks']#"+ settingsReaded[keyClicks]).prop("checked", true);
        }
    });
}


/**
 * save settings
 */
let settings = [
    [], //save image as  - clicks, enabled, keys
    [], //copy image     - clicks, enabled, keys
    []  //copy image url - clicks, enabled, keys
];

$("#save-btn").click(function saveSettings() {
    let enabled = $("#enable-switch input:checked").val() === "on" ? true : false;
    let keys = $("#key-set").val().split(" ");
    let clicks = $("input[name='clicks']:checked").attr("id");
    let page = location.pathname
    let keyEnabled = "enabled_" + page;
    let keyKeys = "keys_" + page;
    let keyClicks = "clicks_" + page;

    // same key is not allowed
    let isSame = false;
    settings = [[], [], []];
    readSettingsKeys();
    setTimeout(() => { //storage.get is async func, better way -> promice.then()
        switch (page) {
            case "/save-image-as.html":
                if (keys.length === settings[1].length&& keys[0] !== "") {
                    if (comparekeys(keys, settings[1])) isSame = true;
                }
                if (keys.length === settings[2].length&& keys[0] !== "") {
                    if (comparekeys(keys, settings[2])) isSame = true;
                }
                break;
            case "/copy-image.html":
                if (keys.length === settings[0].length&& keys[0] !== "") {
                    if (comparekeys(keys, settings[0])) isSame = true;
                }
                if (keys.length === settings[2].length&& keys[0] !== "") {
                    if (comparekeys(keys, settings[2])) isSame = true;
                }
                break;
            case "/copy-image-url.html":
                if (keys.length === settings[0].length&& keys[0] !== "") {
                    if (comparekeys(keys, settings[0])) isSame = true;
                }
                if (keys.length === settings[1].length&& keys[0] !== "") {
                    if (comparekeys(keys, settings[1])) isSame = true;
                }
                break;
        }
        if (isSame) {
            notifySaveSettings(false);
            return;
        }

        chrome.storage.sync.set({
            [keyEnabled]: enabled,  // bool
            [keyKeys]: keys,        // ["Ctrl", "S"]
            [keyClicks]: clicks     // left-click
        }, () => {
            notifySaveSettings(true);
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, "saved");
            });
        });
    }, 130); //maybe ok...
});

function readSettingsKeys() {
    chrome.storage.sync.get(["keys_/save-image-as.html", "keys_/copy-image.html", "keys_/copy-image-url.html"], (result) => {
        if (result["keys_/save-image-as.html"] !== undefined) {
            settings[0] = result["keys_/save-image-as.html"];
        }
        if (result["keys_/copy-image.html"] !== undefined) {
            settings[1] = result["keys_/copy-image.html"];
        }
        if (result["keys_/copy-image-url.html"] !== undefined) {
            settings[2] = result["keys_/copy-image-url.html"];
        }
    });
}

function comparekeys(a, b) {
    for (let i = 0, n = a.length; i < n; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}


/**
 * save success/failed notify
 */
function notifySaveSettings(status) {
    let clsName = status ? "success" : "failed";
    let msg = status ? "Saved!" : "Same key as other is not allowed...";
    let time = status ? 1700 : 2500;

    $("#saved-msg .sm-text").addClass(clsName).text(msg);
    $("#saved-msg .sm-text").css("visibility", "visible");
    setTimeout(() => {
        $("#saved-msg .sm-text").css("visibility", "hidden");
        $("#saved-msg .sm-text").removeClass(clsName);
    }, time);
}


/**
 * setting disabled -> controls will be grayed out
 */
$("#enable-switch input").change(function disableControls() {
    if (! $(this).prop("checked")) {
        $("#key-set, #left-click, #right-click, #both-click").attr("disabled", "disabled");
    } else {
        $("#key-set, #left-click, #right-click, #both-click").removeAttr("disabled");
    }
});


/**
 * footer link open on browser
 */
$(".footer-wrap a").click(function () {
    window.open($(this).attr("href"), '_blank');
    return false;
});


