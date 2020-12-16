const joe = colorjoe.rgb('colorPicker', 'white');
joe.on("change", color => {
    if ($("#colType").text() === "HEX") {
        $("#colorValue").val(color.hex());
        $(".selected-color").css("background", color.hex());
    } else if ($("#colType").text() === "RGB") {
        $("#colorValue").val(color.css());
        $(".selected-color").css("background", color.hex());
    } else if ($("#colType").text() === "HSL") {
        $("#colorValue").val(hexToHsl(color.hex()));
        $(".selected-color").css("background", color.hex());
    }
});

const NEED_BG_VERSION = 15
let bgPage = null
let colTypes = ["HEX", "RGB", "HSL"];

ready(init)


function rgbToHex(rgb) {
    var rgbvals = /rgb\((.+),(.+),(.+)\)/i.exec(rgb);
    var rval = parseInt(rgbvals[1]);
    var gval = parseInt(rgbvals[2]);
    var bval = parseInt(rgbvals[3]);
    return '#' + (
      rval.toString(16) +
      gval.toString(16) +
      bval.toString(16)
    ).toUpperCase();
}

function hexToHsl(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    var r = parseInt(result[1], 16);
    var g = parseInt(result[2], 16);
    var b = parseInt(result[3], 16);

    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0;
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    s = s*100;
    s = Math.round(s);
    l = l*100;
    l = Math.round(l);
    h = Math.round(360*h);

    var colorInHSL = 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
    return colorInHSL;
}


function ready(fn) {
    if (document.readyState != 'loading') {
        fn()
    } else {
        document.addEventListener('DOMContentLoaded', fn)
    }
}


function init() {

    var selectedColorText = chrome.i18n.getMessage("selected_color");
    document.getElementById("selectedCol").innerHTML = selectedColorText;

    var dominantColorText = chrome.i18n.getMessage("dominant_color");
    document.getElementById("dominantCol").innerHTML = dominantColorText;

    initExternalLinks()
    chrome.runtime.getBackgroundPage((backgroundPage) => {
        gotBgPage(backgroundPage)
    });
}

function initExternalLinks() {
    for (let n of document.getElementsByClassName('ed-external')) {
        if (n.dataset.url) {
            n.onclick = () => {
                chrome.tabs.create({
                    url: n.dataset.url
                })
            }
        }
    }
}


function gotBgPage(backgroundPage) {
    bgPage = backgroundPage

    if (bgPage.bg.version === undefined || bgPage.bg.version < NEED_BG_VERSION) {
        chrome.runtime.sendMessage({
            type: "reload-background"
        })
        setTimeout(bgPageReady, 1000)
    } else {
        bgPageReady()
    }
}

function bgPageReady() {
    chrome.tabs.getSelected(null, (tab) => {
        initPickButton(tab)
    })

    initColor()
}

function initPickButton(tab) {
    let pickEnabled = true;
    let message = ''

    if (tab.url === undefined || tab.url.indexOf('chrome') == 0) {
        message = "Chrome doesn't allow <i>extensions</i> to play with special Chrome pages like this one. <pre>chrome://...</pre>";
        pickEnabled = false;
    }
    else if (tab.url.indexOf('https://chrome.google.com/webstore') == 0) {
        message = "Chrome doesn't allow its <i>extensions</i> to play on Web Store.";
        pickEnabled = false;
    }
    else if (tab.url.indexOf('file') == 0) {
        message = "Chrome doesn't allow its <i>extensions</i> to play with your local pages.";
        pickEnabled = false;
    }

    let pick_el = document.getElementById('pick')
    if (pickEnabled) {
        pick_el.onclick = () => {
            bgPage.bg.useTab(tab)
            bgPage.bg.activate()
            window.close()
        }
    } else {
        let message_el = document.getElementById('pick-message')
        message_el.innerHTML = `<h3 class="normal">Can't pick from this page</h3>`
        message_el.style.display = 'block'
        pick_el.style.display = 'none'
    }
}

function initColor() {
    onOpenDisplayColor();
}

$("#upArrow").on("click", function(e) {
    if ($("#colType").text() == "HEX") {
        $("#colType").text("HSL");
        $("#colorValue").val(hexToHsl(joe.get().hex()));
    } else if ($("#colType").text() == "HSL") {
        $("#colType").text("RGB");
        $("#colorValue").val(joe.get().css());
    }
    else {
        $("#colType").text("HEX");
        $("#colorValue").val(joe.get().hex());
    }
});

$("#downArrow").on("click", function(e) {
    if ($("#colType").text() == "HEX") {
        $("#colType").text("RGB");
        $("#colorValue").val(joe.get().css());
    } else if ($("#colType").text() == "HSL") {
        $("#colType").text("HEX");
        $("#colorValue").val(joe.get().hex());
    }
    else if ($("#colType").text() == "RGB") {
        $("#colType").text("HSL");
        $("#colorValue").val(hexToHsl(joe.get().hex()));
    }
});

$("#colorType").change(function(e) {
    if (e.target.value === "sel") {
        displayColors('current', bgPage.bg.getColor(), "hex");
    } else {
        displayColors('dominant', bgPage.bg.dominant_color, "hex");
    }
});

chrome.storage.local.get('savedColors', function (result) {
    if (result['savedColors']) {
        result['savedColors'].reverse().forEach(function(item, index) {
            if (index < 9) {
                $("#color-" + (index + 1)).css("background", item);
            }
        });
    }
});

$("#colorValue").on("click", function(e) {
    $(this).select();
    document.execCommand('copy');
});

$(".rec-col").on("click", function() {
    if ($("#colType").text() == "HEX") {
        displayColors('current', rgbToHex($(this).css("background")), "hex");
    } else if ($("#colType").text() == "HSL") {
        displayColors('current', rgbToHex($(this).css("background")), "hsl");
    }
    else if ($("#colType").text() == "RGB") {
        displayColors('current', rgbToHex($(this).css("background")), "rgb");
    }
});

function onOpenDisplayColor() {
    displayColors('current', bgPage.bg.getColor(), "hex");
}

function loadTab(tabId) {
    let content_found = false
    for (let n of document.getElementsByClassName('content-page')) {
        if (n.id === `${tabId}-content`) {
            n.style.display = 'block'
            content_found = true
        } else {
            n.style.display = 'none'
        }
    }
}

function displayColors(type, color, colType) {
    color = pusher.color(color)

    let formats = [color.hex6(), color.hex3(), color.html('keyword'), color.html('hsl'), color.html('rgb')];

    $(".selected-color").css("background", formats[0]);
    joe.set(formats[0]);

    if (type === "current") {
        if (colType === "hex") {
            $("#colType").text("HEX");
            $("#colorValue").val(formats[0]);
        }
        else if (colType === "rgb") {
            $("#colType").text("RGB");
            $("#colorValue").val(formats[4]);
        }
        else if (colType === "hsl") {
            $("#colType").text("HSL");
            $("#colorValue").val(formats[3]);
        }
    } else {
        if ($("#colorType").val() === "dom") {
            if (colType === "hex") {
                $("#colType").text("HEX");
                $("#colorValue").val(formats[0]);
            }
            else if (colType === "rgb") {
                $("#colType").text("RGB");
                $("#colorValue").val(formats[4]);
            }
            else if (colType === "hsl") {
                $("#colType").text("HSL");
                $("#colorValue").val(formats[3]);
            }
        }
    }
}