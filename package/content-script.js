const SAVEIMAGEAS = 1
const COPYIMAGE = 2
const COPYIMAGEURL = 3
let pressedKeys = []
let settings = [
  [], //save image as  - clicks, enabled, keys
  [], //copy image     - clicks, enabled, keys
  [], //copy image url - clicks, enabled, keys
]
let mode = 0
let isExecOnce = false
let isInputting = false
let msg = document.createElement("div")

/**
 * shortcut main module
 */
$(document).ready(() => readContentSettings())

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "saved") {
    readContentSettings()
  }
})

function readContentSettings() {
  let page = ["/save-image-as.html", "/copy-image.html", "/copy-image-url.html"]
  settings = [[], [], []]
  chrome.storage.sync.get((settingsReaded) => {
    //none 1st arg is all read
    let keys = Object.keys(settingsReaded)
    for (let i = 0; i < 9; i++) {
      if (keys[i] === undefined) continue
      if (keys[i].includes(page[0])) {
        //save image as
        settings[0].push(settingsReaded[keys[i]])
      }
      if (keys[i].includes(page[1])) {
        //copy image
        settings[1].push(settingsReaded[keys[i]])
      }
      if (keys[i].includes(page[2])) {
        //copy image url
        settings[2].push(settingsReaded[keys[i]])
      }
    }
    for (let i = 0; i < 3; i++) {
      //fill in "" for undefined
      if (settings[i].length === 0) {
        settings[i][0] = ""
        settings[i].push("")
        settings[i].push("")
      }
    }
  })
}

$(document).keydown(function judgeExecShortcut(e) {
  if (e.key === undefined) return
  mode = 0
  isExecOnce = false
  isInputting = true
  e.key = convertUpperCaseContent(e.key.replace(/Control/gi, "Ctrl"))
  if (pressedKeys.includes(e.key) === false) {
    pressedKeys.push(e.key)
  }
  for (let i = 0; i < 3; i++) {
    if (compareArrays(pressedKeys, settings[i][2]) && settings[i][1] === true) {
      mode = i + 1 //const number is [1, 2, 3];
      if (settings[mode - 1][0] === "left-click") {
        $("img").click(function () {
          if (isInputting) {
            execShortcut(mode, $(this))
            return false
          }
          return
        })
      } else if (settings[mode - 1][0] === "right-click") {
        $("img").on("contextmenu", function () {
          if (isInputting) {
            execShortcut(mode, $(this))
          }
          return false
        })
      } else if (settings[mode - 1][0] === "both-click") {
        $("img").click(function () {
          $("img").on("contextmenu", function () {
            if (isInputting) {
              execShortcut(mode, $(this))
            }
            return false
          })
        })
      } else if (settings[mode - 1][0] === "both-click") {
        $("img").on("contextmenu", function () {
          $("img").click(function () {
            if (isInputting) {
              execShortcut(mode, $(this))
            }
            return false
          })
        })
      }
    }
  }
})
$(document).keyup((e) => {
  pressedKeys = []
  isInputting = false
})

function convertUpperCaseContent(key) {
  if (key.length === 1) {
    key = key.toUpperCase()
  }
  return key
}

function compareArrays(a, b) {
  if (a === undefined || b === undefined) return
  if (a.length !== b.length) return false
  for (let i = 0, n = a.length; i < n; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

async function execShortcut(mode, obj) {
  let schema = location.protocol
  let host = location.hostname
  let imgUrl = $(obj).attr("src")

  if (imgUrl.match(/https?:\/\//) !== null) {
    //case of full path -> sonomama
    //pass
  } else {
    //case of relative path
    imgUrl = imgUrl.replace(/^\/(.*)/gi, "$1") //case of / start
    if (imgUrl.includes(host) === false) {
      imgUrl = host + "/" + imgUrl
    } else {
      //"www.google.com/~~"
      //pass
    }
    imgUrl = schema + "//" + imgUrl
  }

  if (mode === SAVEIMAGEAS && isExecOnce === false) execSaveImageAs(imgUrl, obj)
  if (mode === COPYIMAGE && isExecOnce === false) await execCopyImage(obj)
  if (mode === COPYIMAGEURL && isExecOnce === false) execCopyImageUrl(imgUrl)
}

async function execSaveImageAs(url, obj) {
  let img = obj[0]
  let element = document.createElement("a")
  document.body.appendChild(element)
  element.download = url.replace(/.*\/(.*?\..*?)\/?$/gi, "$1")
  img.src = url
  img.crossOrigin = "Anonymous"
  element.href = await encodeImgToBase64(img)
  element.click()
  element.remove()
  initFlags()
}

function encodeImgToBase64(img) {
  return new Promise(async (resolve) => {
    const canvas = document.createElement("canvas")
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/jpeg"))
    }
  })
}

function execCopyImage(obj) {
  return new Promise(async (resolve) => {
    let img = obj[0]
    img.crossOrigin = "Anonymous"
    let canvas = document.createElement("canvas")
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      let ctx = canvas.getContext("2d")
      ctx.fillStyle = "#fff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        let cbi = undefined
        try {
          cbi = [new ClipboardItem({ ["image/png"]: blob })]
          navigator.clipboard.write(cbi)
        } catch (DOMException) {
          //can't understand why occurred error
          //pass
        }
        notifyCopySuccessed()
        initFlags()
      }, "image/png")
      resolve()
    }
  })
}

function execCopyImageUrl(url) {
  execCopy(url)
  notifyCopySuccessed()
  initFlags()
}

function execCopy(string) {
  var tmp = document.createElement("div")
  var pre = document.createElement("pre")
  tmp.appendChild(pre).textContent = string
  var s = tmp.style
  s.position = "fixed"
  s.right = "200%"
  document.body.appendChild(tmp)
  document.getSelection().selectAllChildren(tmp)
  var result = document.execCommand("copy")
  document.body.removeChild(tmp)
  return result
}

function notifyCopySuccessed() {
  document.body.appendChild(msg)
  $("body .copy-msg").fadeIn(273)
  setTimeout(() => {
    $("body .copy-msg").fadeOut(273)
    setTimeout(() => {
      try {
        document.body.removeChild(msg)
      } catch (DOMException) {
        //can't understand why occurred error
        //pass
      }
    }, 274)
  }, 1777)
}
$(document).ready(function () {
  msg.textContent = "Copied!"
  msg.className = "copy-msg"
  let css = msg.style
  css.display = "none"
  css.position = "fixed"
  css.left = "50%"
  css.transform = "translateX(-50%)"
  css.bottom = "25%"
  css.padding = "5.4px 48.6px 9px"
  css.color = "#fff"
  css.fontWeight = "bold"
  css.fontFamily =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
  css.textAlign = "center"
  css.backgroundColor = "#898989b5"
  css.borderRadius = "30px"
  css.boxShadow = "0.5px 0.5px 3px 1px rgba(0,0,0,0.13)"
  css.zIndex = "999999"
})

function initFlags() {
  pressedKeys = []
  isExecOnce = true
}
