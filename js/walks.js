(function(){
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

    function drawSegment(ctx, point) {
        if (point.color) {
            ctx.strokeStyle = point.color;
        }

        var color = point.color;
        var theta = point.theta || 0;
        var d = point.d || 10;

        theta += randomInRange(- Math.PI/20, Math.PI/20);
        d = randomInRange(d * 0.9, d * 1.1);


        var x = point.x;
        var y = point.y;
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
            addNoise: 0.04,
            noiseInput: null,
            clear: true
        };
        var opts = Object.assign({}, defaults, options);

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
        var seedPoint = {
            x: w/2,
            y: h/2,
            theta: 0,
            d: 6,
            color: '#000'
        }


        function fiberFactory(max, transform) {
            var step = 0;
            return function drawFiber(point) {
                point = drawSegment(ctx, point);
                if (typeof transform === "function") {
                    point = transform(point, step, max);
                }
                if (++step < max) {
                    requestAnimationFrame(function(){
                        drawFiber(point);
                    })
                }
            }
        }

        function decayColor(props, step, max) {
            props.color = `rgba(0, 0, 0, ${0.6 * (1 - step/max)})`;
            return props;
        }


        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'normal';


        function makePointOnRing(N) {
            var theta = Math.PI/129 * N;
            var _R = Math.min(w, h) * 0.5;
            var R = randomInRange(_R * 0.1, _R * 0.9);
            return {
                x: w/2 + R * Math.cos(theta),
                y: h/2 + R * Math.sin(theta),
                theta: theta + Math.PI/2,
                d: randomInRange(0, 20 * R/_R)
            }
        }

        // random placement in area
        function makePoint(N) {
            var x = randomInRange(0, w);
            var y = randomInRange(0, h);
            var theta = Math.atan(y - h/2, x - w/2);
            return {
                x: x,
                y: y,
                theta: theta,
                d: randomInRange(0, 4)
            }
        }


        //fiberFactory(10, decayColor)(seedPoint);


        var points = [];
        var POINT_COUNT = 100;
        var p;
        while (POINT_COUNT--) {
            p = makePointOnRing(POINT_COUNT);
            points.push(p);
        }

        points.forEach(function(p, i) {
            fiberFactory(100, decayColor)(p);
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
