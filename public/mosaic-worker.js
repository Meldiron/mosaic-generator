let targetBuffer = null;
let poolBuffers = [];
let tileSize = 20;
let colorAdjustment = 0.5;
let receivedChunks = [];
let totalSize = 0;

self.onmessage = async function (e) {
  try {
    console.log("Worker received message:", e.data);
    if (e.data.action === "start") {
      targetBuffer = null;
      poolBuffers = [];
      receivedChunks = [];
      totalSize = 0;
      tileSize = e.data.tileSize;
      colorAdjustment = e.data.colorAdjustment;
      console.log(
        "Worker initialized with tileSize:",
        tileSize,
        "and colorAdjustment:",
        colorAdjustment
      );
    } else if (e.data.chunk) {
      // Receive and process chunks
      receivedChunks.push(e.data.chunk);
      totalSize += e.data.chunk.byteLength;

      if (e.data.end === e.data.total) {
        // All chunks received, combine them
        const completeBuffer = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of receivedChunks) {
          completeBuffer.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }

        // Process the complete buffer
        if (!targetBuffer) {
          targetBuffer = completeBuffer;
        } else {
          poolBuffers.push(completeBuffer);
        }

        // Clear received chunks
        receivedChunks = [];
        totalSize = 0;
      }
    } else if (e.data.action === "clear") {
      targetBuffer = null;
      poolBuffers = [];
      console.log("Worker buffers cleared");
      self.postMessage({ progress: "Buffers cleared", percentage: 0 });
    } else if (e.data.chunk) {
      if (!targetBuffer) {
        if (!e.data.start) {
          targetBuffer = new Uint8Array(e.data.total);
          console.log("Target buffer initialized with size:", e.data.total);
        }
        targetBuffer.set(new Uint8Array(e.data.chunk), e.data.start);
        if (e.data.end === e.data.total) {
          console.log("Target image fully received");
          self.postMessage({
            progress: "Target image received. Processing pool images...",
          });
        }
      } else {
        let buffer;
        if (!e.data.start) {
          buffer = new Uint8Array(e.data.total);
          poolBuffers.push(buffer);
          console.log("New pool buffer initialized with size:", e.data.total);
        } else {
          buffer = poolBuffers[poolBuffers.length - 1];
        }
        buffer.set(new Uint8Array(e.data.chunk), e.data.start);
        if (e.data.end === e.data.total) {
          console.log(
            "Pool image fully received. Total pool images:",
            poolBuffers.length
          );
          self.postMessage({
            progress: `Received ${poolBuffers.length} pool images`,
          });
        }
      }
    } else if (e.data.action === "process") {
      console.log("Starting mosaic processing");
      await processMosaic();
    }
  } catch (error) {
    console.error("Worker error:", error);
    self.postMessage({ error: `Worker error: ${error.message}` });
    // Clear buffers on error
    targetBuffer = null;
    poolBuffers = [];
  }
};

// Pool photos come straight from a Shoebox gallery, so they can be full-size
// camera files. Each is reduced once to a small centred square with its average
// colour, instead of being rescanned for every tile.
const TILE_PX = 128;
// Longest side of the target. Phone photos are much larger; this keeps generation quick.
const MAX_TARGET_PX = 2048;

async function processMosaic() {
  try {
    console.log("Processing mosaic started");
    self.postMessage({ progress: "Processing images...", percentage: 0 });

    // Convert ArrayBuffers to Blobs (the type is a hint; decoding sniffs the real format)
    const targetBlob = new Blob([targetBuffer], { type: "image/png" });
    const poolBlobs = poolBuffers.map(
      (buffer) => new Blob([buffer], { type: "image/png" })
    );

    console.log(
      "Blobs created. Target blob size:",
      targetBlob.size,
      "Pool blobs:",
      poolBlobs.length
    );

    // Load images, one pool photo at a time to keep memory low
    const targetImg = await createImageBitmap(targetBlob);
    const pool = [];
    for (const blob of poolBlobs) {
      pool.push(await poolTile(blob));
      self.postMessage({
        progress: `Prepared ${pool.length}/${poolBlobs.length} pool photos`,
        percentage: Math.floor((pool.length / poolBlobs.length) * 5),
      });
    }

    console.log(
      "Images loaded. Target size:",
      targetImg.width,
      "x",
      targetImg.height,
      "Pool images:",
      pool.length
    );
    self.postMessage({ progress: "Generating mosaic...", percentage: 5 });

    const scale = Math.min(
      1,
      MAX_TARGET_PX / Math.max(targetImg.width, targetImg.height)
    );
    const canvas = new OffscreenCanvas(
      Math.floor((targetImg.width * scale) / tileSize) * tileSize,
      Math.floor((targetImg.height * scale) / tileSize) * tileSize
    );
    const ctx = canvas.getContext("2d");

    console.log(
      "Canvas created with size:",
      canvas.width,
      "x",
      canvas.height,
      "Tile size:",
      tileSize
    );

    // Draw target image
    ctx.drawImage(targetImg, 0, 0, canvas.width, canvas.height);
    targetImg.close();

    // Create mosaic
    const totalTiles = (canvas.width / tileSize) * (canvas.height / tileSize);
    let processedTiles = 0;

    console.log("Starting tile processing. Total tiles:", totalTiles);

    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        const imageData = ctx.getImageData(x, y, tileSize, tileSize);
        const avgColor = getAverageColor(imageData.data);
        const bestMatch = findBestMatch(avgColor, pool);

        // Apply color adjustment
        ctx.globalAlpha = colorAdjustment;
        ctx.drawImage(bestMatch, x, y, tileSize, tileSize);
        ctx.globalAlpha = 1 - colorAdjustment;
        ctx.fillStyle = `rgb(${avgColor[0]}, ${avgColor[1]}, ${avgColor[2]})`;
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.globalAlpha = 1;

        processedTiles++;
        if (processedTiles % 100 === 0 || processedTiles === totalTiles) {
          const percentage = Math.floor((processedTiles / totalTiles) * 90) + 5; // 5% for initial processing, 90% for tile processing
          console.log(
            "Processed tiles:",
            processedTiles,
            "of",
            totalTiles,
            "Percentage:",
            percentage
          );
          self.postMessage({
            progress: `Processed ${processedTiles}/${totalTiles} tiles`,
            percentage,
          });
        }
      }
    }

    console.log("Tile processing complete. Finalizing mosaic...");
    self.postMessage({ progress: "Finalizing mosaic...", percentage: 95 });

    const blob = await canvas.convertToBlob();
    console.log("Mosaic blob created. Size:", blob.size);

    const reader = new FileReader();
    reader.onloadend = function () {
      console.log("Mosaic image ready");
      self.postMessage({ mosaicImage: reader.result, percentage: 100 });
      // Clear buffers after generation
      targetBuffer = null;
      poolBuffers = [];
    };
    reader.readAsDataURL(blob);
  } catch (error) {
    console.error("Processing error:", error);
    self.postMessage({ error: `Processing error: ${error.message}` });
    // Clear buffers on error
    targetBuffer = null;
    poolBuffers = [];
  }
}

/** A TILE_PX square cut from the centre of the photo, plus its average colour. */
async function poolTile(blob) {
  const img = await createImageBitmap(blob);
  const side = Math.min(img.width, img.height);
  const canvas = new OffscreenCanvas(TILE_PX, TILE_PX);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    (img.width - side) / 2,
    (img.height - side) / 2,
    side,
    side,
    0,
    0,
    TILE_PX,
    TILE_PX
  );
  img.close();
  const color = getAverageColor(ctx.getImageData(0, 0, TILE_PX, TILE_PX).data);
  return { canvas, color };
}

function getAverageColor(data) {
  let r = 0,
    g = 0,
    b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const count = data.length / 4;
  return [r / count, g / count, b / count];
}

function findBestMatch(targetColor, pool) {
  let bestMatch = pool[0];
  let minDifference = Infinity;

  for (const tile of pool) {
    const difference = colorDifference(targetColor, tile.color);
    if (difference < minDifference) {
      minDifference = difference;
      bestMatch = tile;
    }
  }

  return bestMatch.canvas;
}

function colorDifference(color1, color2) {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) +
      Math.pow(color1[1] - color2[1], 2) +
      Math.pow(color1[2] - color2[2], 2)
  );
}
