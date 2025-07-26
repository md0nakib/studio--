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
  const result = (back << 8) / (255 - front);
  return result > 255 ? 255 : result;
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
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return;

  tempCtx.drawImage(image, 0, 0, width, height);
  const originalImageData = tempCtx.getImageData(0, 0, width, height);
  const grayImageData = new ImageData(
    getGrayscale(originalImageData.data),
    width,
    height
  );
  
  if (filterType === 'pencil') {
    const invertedData = getInverted(grayImageData.data);
    
    // Fine details layer
    tempCtx.putImageData(new ImageData(invertedData, width, height), 0, 0);
    tempCtx.filter = 'blur(1.5px)';
    tempCtx.drawImage(tempCanvas, 0, 0);
    const blurredFineData = tempCtx.getImageData(0, 0, width, height).data;

    const dodgeFineData = new Uint8ClampedArray(grayImageData.data.length);
    for (let i = 0; i < dodgeFineData.length; i += 4) {
        const val = colorDodge(blurredFineData[i], grayImageData.data[i]);
        dodgeFineData[i] = dodgeFineData[i+1] = dodgeFineData[i+2] = val;
        dodgeFineData[i+3] = 255;
    }

    // Broad shading layer
    tempCtx.putImageData(new ImageData(invertedData, width, height), 0, 0);
    tempCtx.filter = 'blur(20px)';
    tempCtx.drawImage(tempCanvas, 0, 0);
    const blurredBroadData = tempCtx.getImageData(0, 0, width, height).data;

    const dodgeBroadData = new Uint8ClampedArray(grayImageData.data.length);
    for (let i = 0; i < dodgeBroadData.length; i += 4) {
        const val = colorDodge(blurredBroadData[i], grayImageData.data[i]);
        dodgeBroadData[i] = dodgeBroadData[i+1] = dodgeBroadData[i+2] = val;
        dodgeBroadData[i+3] = 255;
    }

    // Blend the layers using a multiply effect
    const finalData = new Uint8ClampedArray(grayImageData.data.length);
    for (let i = 0; i < finalData.length; i += 4) {
        const fine = dodgeFineData[i] / 255;
        const broad = dodgeBroadData[i] / 255;
        let val = fine * broad * 255;

        // Apply intensity and a subtle contrast curve
        const contrast = 1.1 + (intensity * 0.4);
        val = ((val / 255 - 0.5) * contrast + 0.5) * 255;

        // Add some noise for texture
        const noise = (Math.random() - 0.5) * 20 * (1 - intensity);
        val += noise;
        
        val = Math.max(0, Math.min(255, val));

        finalData[i] = finalData[i+1] = finalData[i+2] = val;
        finalData[i+3] = originalImageData.data[i+3];
    }
    
    ctx.putImageData(new ImageData(finalData, width, height), 0, 0);
    
  } else if (filterType === 'charcoal') {
    const invertedImageData = tempCtx.createImageData(width, height);
    invertedImageData.data.set(getInverted(grayImageData.data));
    tempCtx.putImageData(invertedImageData, 0, 0);

    const blurAmount = intensity * 15 + 1;
    tempCtx.filter = `blur(${blurAmount}px)`;
    tempCtx.drawImage(tempCanvas, 0, 0);
    tempCtx.filter = 'none';
    const blurredImageData = tempCtx.getImageData(0, 0, width, height);

    const finalImageData = ctx.createImageData(width, height);
    const finalData = finalImageData.data;
    const grayData = grayImageData.data;
    const blurredData = blurredImageData.data;

    for (let i = 0; i < finalData.length; i += 4) {
      const blendedValue = colorDodge(blurredData[i], grayData[i]);
      finalData[i] = blendedValue;
      finalData[i + 1] = blendedValue;
      finalData[i + 2] = blendedValue;
      finalData[i + 3] = originalImageData.data[i + 3];
    }
    
    const contrast = 1 + (intensity * 0.5);
    const threshold = 1 - intensity;
    for (let i = 0; i < finalData.length; i += 4) {
      let value = finalData[i];
      value = ((value / 255 - 0.5) * contrast + 0.5) * 255;
      
      if(value / 255 < threshold) {
        value = value * 0.8;
      }
      
      value = Math.max(0, Math.min(255, value));
      finalData[i] = value;
      finalData[i + 1] = value;
      finalData[i + 2] = value;
    }
    
    ctx.putImageData(finalImageData, 0, 0);
  }
}
