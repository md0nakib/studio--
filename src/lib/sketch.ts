type FilterType = 'pencil' | 'charcoal';

const MAX_DIMENSION = 1024;

function getGrayscale(data: Uint8ClampedArray) {
  const grayData = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayData[i] = gray;
    grayData[i + 1] = gray;
    grayData[i + 2] = gray;
    grayData[i + 3] = data[i + 3]; // alpha
  }
  return grayData;
}

function getInverted(data: Uint8ClampedArray) {
  const invertedData = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    invertedData[i] = 255 - data[i];
    invertedData[i + 1] = 255 - data[i + 1];
    invertedData[i + 2] = 255 - data[i + 2];
    invertedData[i + 3] = data[i + 3];
  }
  return invertedData;
}

function colorDodge(front: number, back: number) {
  if (front === 255) return front;
  return Math.min(255, (back << 8) / (255 - front));
}

export function applySketchFilter(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  filterType: FilterType,
  intensity: number
) {
  let { width, height } = image;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  
  // Hidden canvas for processing steps
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return;

  // 1. Draw original image
  tempCtx.drawImage(image, 0, 0, width, height);
  const originalImageData = tempCtx.getImageData(0, 0, width, height);

  // 2. Grayscale
  const grayImageData = tempCtx.createImageData(width, height);
  grayImageData.data.set(getGrayscale(originalImageData.data));

  // 3. Invert grayscale
  const invertedImageData = tempCtx.createImageData(width, height);
  invertedImageData.data.set(getInverted(grayImageData.data));
  tempCtx.putImageData(invertedImageData, 0, 0);

  // 4. Blur inverted
  const blurAmount = intensity * (filterType === 'charcoal' ? 15 : 10) + 1;
  tempCtx.filter = `blur(${blurAmount}px)`;
  tempCtx.drawImage(tempCanvas, 0, 0);
  tempCtx.filter = 'none';
  const blurredImageData = tempCtx.getImageData(0, 0, width, height);

  // 5. Color Dodge Blend
  const finalImageData = ctx.createImageData(width, height);
  const finalData = finalImageData.data;
  const grayData = grayImageData.data;
  const blurredData = blurredImageData.data;

  for (let i = 0; i < finalData.length; i += 4) {
    const blendedValue = colorDodge(blurredData[i], grayData[i]);
    finalData[i] = blendedValue;
    finalData[i + 1] = blendedValue;
    finalData[i + 2] = blendedValue;
    finalData[i + 3] = originalImageData.data[i + 3]; // Preserve alpha
  }
  
  // Charcoal effect adjustment
  if (filterType === 'charcoal') {
    const contrast = 1 + (intensity * 0.5);
    const threshold = 1 - intensity; // Lower threshold for more black
    for (let i = 0; i < finalData.length; i += 4) {
      let value = finalData[i];
      // Increase contrast
      value = ((value / 255 - 0.5) * contrast + 0.5) * 255;
      
      // Add a bit of thresholding for darker blacks
      if(value / 255 < threshold) {
        value = value * 0.8;
      }
      
      value = Math.max(0, Math.min(255, value));
      finalData[i] = value;
      finalData[i + 1] = value;
      finalData[i + 2] = value;
    }
  }


  ctx.putImageData(finalImageData, 0, 0);
}
