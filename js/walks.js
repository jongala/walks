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

    let immediate = (f) => {
        f();
    }

    const ANIMATE = true;

    let invoke = ANIMATE ? requestAnimationFrame : immediate;

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
        var theta = props.theta || 0;
        var d = props.d || 10;
        if (props.color) {
            ctx.strokeStyle = props.color;
        }

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
            y: y2
        });
    }

    function drawPoint(ctx, props) {
        var x2 = props.x + props.d * Math.cos(props.theta);
        var y2 = props.y + props.d * Math.sin(props.theta);

        drawCircle(ctx, x2, y2, 2, {fill: props.color});

        return Object.assign(props, {
            x: x2,
            y: y2
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


        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, cw, ch);

        var MAX = 50;
        var count = 0;


        function fiberFactory(stepFunc, placeFunc, transformFunc) {
            var step = 0;
            var loop = 0;
            return function drawFiber(props) {
                // move/transform and draw the fiber
                props = stepFunc(ctx, props);
                // transform the props and recall
                if (typeof transformFunc === "function") {
                    props = transformFunc(props, step);
                }
                if (++step < props.steps) {
                    invoke(function(){
                        drawFiber(props);
                    });
                } else if (props.loop && placeFunc && typeof placeFunc === "function") {
                    //console.log('Loop');
                    loop++;
                    props.loop--;
                    props.color = (props.color==='black') ? 'white' : 'black';
                    step = 0;
                    props = placeFunc(props, loop);
                    invoke(function(){
                        drawFiber(props);
                    });
                } else {
                    //console.log('Done.');
                }
            }
        }


        // Transformation functions

        function noop(p) {
            return p
        }

        let straight = noop;

        function decayColor(props, step) {
            props.color = `rgba(0, 0, 0, ${0.6 * (1 - step/props.steps)})`;
            return props;
        }

        function wander(props, step) {
            props.theta += Math.PI/10 * randomInRange(-1, 1);
            props.d = props.d * randomInRange(0.9, 1.1);
            return props;
        }

        function wanderAndFade(props, step) {
            props.color = `rgba(0, 0, 0, ${0.6 * (1 - step/props.steps)})`;
            props.theta += Math.PI/10 * randomInRange(-1, 1);
            props.d = props.d * randomInRange(0.9, 1.1);
            return props;
        }

        function spiral(props, step) {
            props.theta += Math.PI/props.steps * randomInRange(0.1, 1);
            return props;
        }


        // convert pixel coords to normalized placement
        function normalize(p) {
            return [p[0] / cw, p[1] / ch];
        }

        // denormalize a normalized point back to real coordinates
        function denormalize(p) {
            return [p[0] * cw, p[1] * ch];
        }

        // line intersection:
        // m1 * x + b1 = m2 * x + b2
        // m1 * x - m2 * x = b2 - b1
        // x * (m1 - m2) = b2 - b1
        // x = (b2 - b1) / (m1 - m2)
        // y = m1 * x + b1
        //
        // line through two points:
        // m = Math.atan((y2 - y1)/(x2 - x1));
        // b = y1 - x1 * m;
        //
        //
        // snell's law:
        // sin(t2)/sin(t1) = n1 / n2;
        //
        // where t1 and t2 are the angles between the ray and the normal


        // the distance between point @p and the line defined by @l1, @l2
        function pointToLine(p, l1, l2) {
            let [px, py] = p;
            let [x1, y1] = l1;
            let [x2, y2] = l2;
            let a = Math.abs(px * (y2 - y1) - py * (x2 - x1) + x2 * y1 - y2 * x1 );
            let b = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
            return a/b;
        }


        function makeRefractor(p1, p2) {
            // Constants
            const dotChroma = 180;
            const lineChroma = 60;
            const refraction = 0.2; // how much it gets bent


            p1 = denormalize(p1);
            p2 = denormalize(p2);

            let m, b, t;

            m = (p2[1] - p1[1])/(p2[0] - p1[0]);
            t = Math.atan(m);
            b = p1[1] - p1[0] * m;

            // angle of the normal
            let norm = t + Math.PI/2;

            // debug: draw the whole refraction line
            /*ctx.strokeStyle = '#808080';
            ctx.beginPath();
            ctx.moveTo(0, b);
            ctx.lineTo(cw, m * cw + b);
            ctx.stroke();*/

            // debug: draw the refraction line between points
            ctx.strokeStyle = '#808080';
            ctx.beginPath();
            ctx.moveTo(...p1);
            ctx.lineTo(...p2);
            ctx.stroke();

            // debug: draw the points defining the line
            drawCircle(ctx, p1[0], p1[1], 4, {fill: 'white'});
            drawCircle(ctx, p2[0], p2[1], 4, {fill: 'white'});


            return function refract(props, step) {
                // distance to intersection point
                let r = pointToLine([props.x, props.y], p1, p2);
                let lineOpacity = 0.15;
                let dotOpacity = 0.10;
                let delta = 0;
                let color;

                if ((props.x > p1[0] && props.x < p2[0]) &&
                    (props.y > p1[1] && props.y < p2[1]) &&
                    r < 1.1) {
                    let ad = norm - props.theta;
                    let _ad = Math.abs(ad);
                    sign = ad/_ad;

                    if (_ad > 3 * Math.PI/2) {
                        // high quad
                        //drawCircle(ctx, props.x, props.y, 2, {fill: 'blue'})
                        props.color = 'blue';
                    } else if (_ad > Math.PI) {
                        ad = (ad - Math.PI);
                        //drawCircle(ctx, props.x, props.y, 2, {fill: 'green'})
                        props.color = 'green';
                    } else if (_ad > Math.PI/2) {
                        ad = (ad - Math.PI);
                        //drawCircle(ctx, props.x, props.y, 2, {fill: 'red'})
                        props.color = 'red';
                    } else {
                        // narrow angle
                        //drawCircle(ctx, props.x, props.y, 2, {fill: 'black'})
                        props.color = 'black';
                    }

                    delta = refraction * Math.sin(ad);

                    color = (delta > 0 )?
                        `${255 - delta * dotChroma * 2}, 255, 255, ${lineOpacity}`:
                        `255, ${255 + delta * dotChroma * 2}, 255, ${lineOpacity}`;
                    drawCircle(ctx, props.x, props.y, 1, {fill: `rgba(${color})`});

                    // the point is near our line, change theta
                    props.theta += delta;
                    color = (delta > 0 )?
                        `${255 - delta * lineChroma}, 255, 255, ${dotOpacity}`:
                        `255, ${255 + delta * lineChroma}, 255, ${dotOpacity}`;
                    props.color = `rgba(${color})`;
                }
                return props;
            }
        }

        let refract = makeRefractor(
                        [randomInRange(.25, .75), randomInRange(0.25, .75)],
                        [randomInRange(.25, .75), randomInRange(0.25, .75)]
                        );



        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'normal';


        function createPoint(steps = 100, loop = 0, d = 10, color = 'black') {
            return {
                color: color,
                steps: steps,
                loop: loop,
                d: d,
                x: 0,
                y: 0,
                theta: 0
            }
        }

        function placePointOnRing(props, loop) {
            var theta = randomInRange(0, Math.PI * 2);
            var _R = Math.min(cw, ch) * 1;
            var R = randomInRange(_R * 0.15, _R * 0.155);
            return Object.assign(props, {
                x: cw/2 + R * Math.cos(theta),
                y: ch/2 + R * Math.sin(theta),
                theta: theta,
                color: `rgba(240, 240, 240, 0.007)`
                //color: `rgba(${randomInRange(60, 180)},${randomInRange(60, 180)},${randomInRange(60, 180)})`
            });
        }

        function placeOnMovingRing(props, loop) {
            var theta = randomInRange(0, Math.PI * 2);
            var _R = Math.min(cw, ch) * 0.5;
            var R = randomInRange(_R * 0.5, _R * 0.5);
            let _x = cw/2;
            let _y = ch/2;
            let stepx = 5 * randomInRange(-1, 1);
            let stepy = 5 * randomInRange(-1, 1);
            let jitter = randomInRange(0, 1);
            return Object.assign(props, {
                x: _x + (loop * stepx) + jitter * randomInRange(-1,1) + R * Math.cos(theta),
                y: _y + (loop * stepy) + jitter * randomInRange(-1,1) + R * Math.sin(theta),
                theta: theta
            });
        }

        function placePointOnExpandingRing(props, loop) {
            var theta = randomInRange(0, Math.PI * 2);
            var _R = Math.min(cw, ch) * 0.5;
            var R = randomInRange(_R * 0.15, _R * 0.25) + loop * _R/20;
            return Object.assign(props, {
                x: w/2 + R * Math.cos(theta),
                y: h/2 + R * Math.sin(theta),
                theta: theta
            });
        }

        // random placement in area
        function placeRandomPoint(props, loop) {
            var x = randomInRange(0, w);
            var y = randomInRange(0, h);
            var theta = Math.PI * 2 * Math.random();
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
            p = createPoint(
                1 * Math.round(randomInRange(80, 100)), // steps
                10 * Math.round(randomInRange(2, 4)), // loops
                1 * randomInRange(2,6), // distance
                'black'
            )
            points.push(p);
        }

        var transforms = [wander, wanderAndFade, decayColor, spiral, straight];
        var placements = [placePointOnRing, placeOnMovingRing, placeRandomPoint];
        var renderers = [drawSegment, drawPoint];

        let fInit = randItem(placements);
        let fLoop = randItem(placements);
        let fStep = randItem(transforms);
        let fDraw = randItem(renderers);

        fInit = placePointOnRing;
        fLoop = placePointOnRing;
        fStep = refract;
        fDraw = drawSegment;

        ctx.lineWidth = 1;
        points.forEach(function(p, i) {
            fiberFactory(fDraw, fLoop, fStep)(fInit(p));
        });


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
