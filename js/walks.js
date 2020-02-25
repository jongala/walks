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

        return Object.assign(props, {
            x: x2,
            y: y2,
            theta: theta,
            d: d
        });
    }


    // draw it!
    function walks(options) {
        var defaults = {
            container: 'body',
            addNoise: 0.04,
            noiseInput: null,
            clear: true
        };
        var opts = {};
        opts = extend(extend(opts, defaults), options);

        var container = options.container;

        var w = container.offsetWidth;
        var h = container.offsetHeight;
        let cw = w;
        let ch = h;

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



        var MAX = 50;
        var count = 0;


        function fiberFactory(placeFunc, transformFunc) {
            var step = 0;
            return function drawFiber(props) {
                // draw the segment
                props = drawSegment(ctx, props);
                // transform the props and recall
                if (typeof transformFunc === "function") {
                    props = transformFunc(props, step);
                }
                if (++step < props.steps) {
                    requestAnimationFrame(function(){
                        drawFiber(props);
                    });
                } else if (props.loop && placeFunc && typeof placeFunc === "function") {
                    //console.log('Loop');
                    props.loop--;
                    step = 0;
                    props = placeFunc(props);
                    requestAnimationFrame(function(){
                        drawFiber(props);
                    });
                } else {
                    //console.log('Done.');
                }
            }
        }

        function decayColor(props, step) {
            props.color = `rgba(0, 0, 0, ${0.6 * (1 - step/props.steps)})`;
            return props;
        }

        //fiberFactory(10, decayColor)(segProps);


        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'normal';


        function createPoint(steps, loop, d) {
            return {
                color: 'black',
                steps: steps,
                loop: loop,
                d: d,
                x: 0,
                y: 0,
                theta: 0
            }
        }

        function placePointOnRing(props) {
            var theta = randomInRange(0, Math.PI * 2);
            var _R = Math.min(cw, ch) * 0.5;
            var R = randomInRange(_R * 0.5, _R * 0.5);
            return Object.assign(props, {
                x: w/2 + R * Math.cos(theta),
                y: h/2 + R * Math.sin(theta),
                theta: theta
            });
        }

        // random placement in area
        function placeRandomPoint(props) {
            var x = randomInRange(0, w);
            var y = randomInRange(0, h);
            var theta = Math.PI/2 * (x/cw + y/ch);
            return Object.assign(props, {
                x: x,
                y: y,
                theta: theta
            })
        }



        var points = [];
        var POINT_COUNT = 100;
        var p;
        while (--POINT_COUNT) {
            //p = makePointOnRing(POINT_COUNT);
            p = placePointOnRing(
                createPoint(
                    Math.round(randomInRange(40,60)), // steps
                    Math.round(randomInRange(10,15)), // loops
                    randomInRange(8,12) // distance
                )
            );

            points.push(p);
        }

        ctx.lineWidth = 1;
        points.forEach(function(p, i) {
            fiberFactory(placePointOnRing, decayColor)(p);
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
