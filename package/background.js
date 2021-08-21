
/**
 * download api
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    downloadApi(msg);
});

function downloadApi(imgUrl) {
    chrome.downloads.download({
        url: imgUrl,
        saveAs: true,
        conflictAction: 'uniquify' //default
    });
}


