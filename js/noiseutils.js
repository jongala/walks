(function() {
    function addNoiseToCanvas(canvas, opacity) {
        var ctx = canvas.getContext('2d'),
        x,
        y,
        noise,
        opacity = opacity || .2;

        var w = canvas.width;
        var h = canvas.height;

        for ( x = 0; x < w; x++ ) {
          for ( y = 0; y < h; y++ ) {
             noise = Math.floor( Math.random() * 255 );

             ctx.fillStyle = "rgba(" + noise + "," + noise + "," + noise + "," + opacity + ")";
             ctx.fillRect(x, y, 1, 1);
          }
        }
    }

    function addNoiseFromPattern(canvas, opacity, tileSize, useOverlay) {
        // create an offscreen canvas where we will generate
        // noise to use as a pattern
        var noiseCanvas = createNoiseCanvas(opacity, tileSize);
        applyNoiseCanvas(canvas, noiseCanvas, useOverlay);

        return {
            noiseCanvas: noiseCanvas,
            canvas: canvas
        }
    }

    function createNoiseCanvas(opacity, tileSize) {
        // create an offscreen canvas where we will generate
        // noise to use as a pattern
        tileSize = tileSize || 100;
        var noise = document.createElement('canvas');
        noise.width = tileSize;
        noise.height = tileSize;
        var noiseCtx = noise.getContext('2d');

        // add noise to the offscreen canvas
        addNoiseToCanvas(noise, opacity);

        return noise;
    }

    function applyNoiseCanvas(targetCanvas, noiseCanvas, useOverlay) {
        var ctx = targetCanvas.getContext('2d');
        // create a noise pattern from the offscreen canvas
        var noisePattern = ctx.createPattern(noiseCanvas, 'repeat');
        ctx.fillStyle = noisePattern;
        if (useOverlay) {
            ctx.globalCompositeOperation = 'overlay';
        }
        ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        if (useOverlay) {
            ctx.globalCompositeOperation = 'normal';
        }
        return targetCanvas;
    }

    window.noiseUtils = {
        addNoiseToCanvas: addNoiseToCanvas,
        addNoiseFromPattern: addNoiseFromPattern,
        createNoiseCanvas: createNoiseCanvas,
        applyNoiseCanvas: applyNoiseCanvas
    }

}());
    