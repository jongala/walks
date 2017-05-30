(function(){
    // simple object extender
    function extend(dest, src) {
        for (k in src) {
            if (src.hasOwnProperty(k)) {
                dest[k] = src[k];
            }
        }
        return dest;
    }

    // random Array member
    function randItem(arr) {
        return arr[Math.floor(arr.length * Math.random())];
    }

    function randomInRange(min, max) {
        return (min + (max - min) * Math.random());
    }

    /**
     * Get a fill, either in solid or gradients
     * @param  {context} ctx  the canvas rendering context
     * @param {array} palette an array of color values
     * @param  {num} x    center x of shape
     * @param  {num} y    center y of shape
     * @param  {num} size half the size of the shape (r for circle)
     * @return {fillStyle}      a solid color or canvas gradient
     */
    function getFill(ctx, palette, x, y, size, skew) {
        if (skew === undefined) {
            skew = 0;
        }
        if (Math.random() > 0.9) {
            // solid
            return randItem(palette);
        } else {
            // gradient
            // pick xoffset as fraction of size to get a shallow angle
            var xoff = randomInRange(-skew/2, skew/2) * size;
            // build gradient, add stops
            var grad = ctx.createLinearGradient(
                x - xoff,
                y - size,
                x + xoff,
                y + size);
            grad.addColorStop(0, randItem(palette));
            grad.addColorStop(1, randItem(palette));
            return grad;
        }
    }


    function setAttrs(el, attrs) {
        if (el && el.setAttribute) {
            for (a in attrs) {
                if (attrs.hasOwnProperty(a)) {
                    el.setAttribute(a, attrs[a]);
                }
            }
        }
    }


    function drawCircle(ctx, x, y, r, opts) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arc(0, 0, r, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.restore();

        ctx.fillStyle = opts.fill;
        ctx.strokeStyle = opts.stroke;
        ctx.fill();
        opts.stroke && ctx.stroke();

        return ctx;
    }

    function drawSegment(ctx, props) {
        if (props.color) {
            console.log(props.color);
            ctx.strokeStyle = props.color;
        }

        var color = props.color;
        var theta = props.theta || 0;
        var d = props.d || 10;

        theta += randomInRange(- Math.PI/10, Math.PI/10);
        d = randomInRange(d * 0.9, d * 1.1);


        var x = props.x;
        var y = props.y;
        var x2 = x + d * Math.cos(theta);
        var y2 = y + d * Math.sin(theta);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.stroke();

        return {
            x: x2,
            y: y2,
            theta: theta,
            d: d,
            color: color
        }
    }
    

    // draw it!
    function walks(options) {
        var defaults = {
            container: 'body',
            palette: ['#222222', '#fae1f6', '#b966d3', '#8ED2EE', '#362599', '#fff9de', '#FFC874'],
            drawShadows: true,
            addNoise: 0.04,
            noiseInput: null,
            dust: false,
            skew: 1, // normalized skew
            clear: true
        };
        var opts = {};
        opts = extend(extend(opts, defaults), options);

        var container = options.container;

        var w = container.offsetWidth;
        var h = container.offsetHeight;

        // Find or create canvas child
        var el = container.querySelector('canvas');
        var newEl = false;
        if (!el) {
            container.innerHTML = '';
            el = document.createElement('canvas');
            newEl = true;
        }
        if (newEl || opts.clear) {
            setAttrs(el, {
                'width': container.offsetWidth,
                'height': container.offsetHeight
            });
        }

        var ctx; // canvas ctx or svg tag

        ctx = el.getContext('2d');

        // optional clear
        if (opts.clear) {
            el.width = container.offsetWidth;
            el.height = container.offsetHeight;
            ctx.clearRect(0, 0, w, h);
        }

        var MAX = 1000;
        var count = MAX;
        var segProps = {
            x: w/2,
            y: h,
            theta: 0,
            d: 10,
            color: '#808080'
        }

        while (--count) {
            requestAnimationFrame(function(){
                if (segProps.x > w || segProps.x < 0 || segProps.y > h || segProps.y < 0) {
                    segProps.theta += Math.PI;
                }
                segProps = drawSegment(ctx, segProps);
            })
        }


        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'normal';

        // Add effect elements
        // ...


        // add noise
        if (opts.addNoise && window.noiseUtils) {
            if (opts.noiseInput) {
                noiseUtils.applyNoiseCanvas(el, opts.noiseInput);
            } else {
                noiseUtils.addNoiseFromPattern(el, opts.addNoise, w/3);
            }
        }

        // END RENDERING

        // if new canvas child was created, append it
        if (newEl) {
            container.appendChild(el);
        }

    }

    // export
    window.walks = walks;
}());
