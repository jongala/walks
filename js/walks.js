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

        var MAX = 100;
        var count = 0;
        var segProps = {
            x: w/2,
            y: h/2,
            theta: 0,
            d: 6,
            color: '#000'
        }


        function fiberFactory(max, transform) {
            var step = 0;
            return function drawFiber(props) {
                props = drawSegment(ctx, props);
                if (typeof transform === "function") {
                    props = transform(props, step, max);
                }
                if (++step < max) {
                    requestAnimationFrame(function(){
                        drawFiber(props);
                    })        
                }
            }
        }

        function decayColor(props, step, max) {
            props.color = `rgba(0, 0, 0, ${0.6 * (1 - step/max)})`;
            return props;
        }

        //fiberFactory(10, decayColor)(segProps);


        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'normal';


        function makePoint(N) {
            var theta = Math.PI/131 * N;
            var _R = Math.min(w, h) * 0.5;
            var R = randomInRange(_R * 0.6, _R * 0.7);
            return {
                x: w/2 + R * Math.cos(theta),
                y: h/2 + R * Math.sin(theta),
                theta: theta,
                d: randomInRange(-5, 5)
            }
        }

        var points = [];
        var POINT_COUNT = 1000;
        var p;
        while (--POINT_COUNT) {
            p = makePoint(POINT_COUNT);
            points.push(p);
            drawCircle(ctx, p.x, p.y, randomInRange(1, 3), {
                stroke: '#777',
                fill: 'transparent'
            });
        }

        points.forEach(function(p, i) {
            fiberFactory(10, decayColor)(p);
        })




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
