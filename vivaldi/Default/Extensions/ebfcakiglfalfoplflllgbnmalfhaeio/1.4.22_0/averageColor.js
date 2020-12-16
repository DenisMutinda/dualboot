const removeImage = image => image.parentNode.removeChild(image)

const getColor = imageData => {
  const rgb = { r: 0, g: 0, b: 0 }
  const yuv = { y: 0, u: 0, v: 0 }
  const sigma = x => x / (Math.abs(x) + 0.4)
  const step = Math.ceil(imageData.data.length / 40000) * 4
  let count = 0

  for (var i = 0; i < imageData.data.length; i += step) {
    if (imageData.data[i] !== 255 || imageData.data[i + 1] !== 255 || imageData.data[i + 2] !== 255) {
      rgb.r = imageData.data[i] / 255
      rgb.g = imageData.data[i + 1] / 255
      rgb.b = imageData.data[i + 2] / 255

      yuv.y += 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
      yuv.u += -0.147 * rgb.r - 0.289 * rgb.g + 0.436 * rgb.b
      yuv.v += 0.615 * rgb.r - 0.515 * rgb.g - 0.100 * rgb.b

      count += 1
    }
  }

  yuv.y = sigma(yuv.y / count)
  yuv.u = sigma(yuv.u / count)
  yuv.v = sigma(yuv.v / count)

  rgb.r = yuv.y + 1.3983 * yuv.v
  rgb.g = yuv.y - 0.3946 * yuv.u - 0.58060 * yuv.v
  rgb.b = yuv.y + 2.0321 * yuv.u

  rgb.r = Math.round(rgb.r * 255)
  rgb.g = Math.round(rgb.g * 255)
  rgb.b = Math.round(rgb.b * 255)

  return rgb
}

const getImageData = image => {
  const { width, height } = image
  if (width > 0 && height > 0) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    context.fillStyle = 'rgb(255, 255, 255)'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    removeImage(image)

    try {
      return context.getImageData(0, 0, width, height)
    } catch (e) {
      return false
    }
  } else {
    removeImage(image)
  }
}

const onLoad = (image, resolve, reject) => {
  const imageData = getImageData(image)
  if (imageData !== false) {
    resolve(getColor(imageData))
  } else {
    reject(`Can't get ImageData from image ${image.getAttribute('src')}`)
  }
}

const onError = (image, reject) => {
  removeImage(image)
  reject(`Can't load image ${image.getAttribute('src')}`)
}

const getAverageColor = url => {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img')
    const body = document.querySelector('body')

    image.addEventListener('load', onLoad.bind(null, image, resolve, reject))
    image.addEventListener('cached', onLoad.bind(null, image, resolve, reject))

    image.addEventListener('abort', onError.bind(null, image, reject))
    image.addEventListener('error', onError.bind(null, image, reject))

    image.crossOrigin = ''
    image.style.display = 'none'
    image.setAttribute('src', url)
    body.appendChild(image)
  })
}


function base64ToByteArray(base64String) {
    try {
        var sliceSize = 1024;
        var byteCharacters = atob(base64String);
        var bytesLength = byteCharacters.length;
        var slicesCount = Math.ceil(bytesLength / sliceSize);
        var byteArrays = new Array(slicesCount);

        for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
            var begin = sliceIndex * sliceSize;
            var end = Math.min(begin + sliceSize, bytesLength);

            var bytes = new Array(end - begin);
            for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
                bytes[i] = byteCharacters[offset].charCodeAt(0);
            }
            byteArrays[sliceIndex] = new Uint8Array(bytes);
        }
        return byteArrays;
    } catch (e) {
        return undefined;
    }
}

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
}).join('')

chrome.runtime.sendMessage({ type: "get_screenshot" }, null);

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type == 'image_data') {
        getAverageColor(msg.data).then(function(rgb) {
          if (!isNaN(rgb.r)) {
            hexColor = rgbToHex(rgb.r, rgb.g, rgb.b);
            if (/^#([0-9A-F]{3}){1,2}$/i.test(hexColor) === false) {
              hexColor = "#FFFFFF";
            }
            chrome.runtime.sendMessage({ type: "update_badge", data:hexColor}, null);
          }
        })
    }
});