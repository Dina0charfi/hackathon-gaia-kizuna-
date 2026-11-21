/* ==========================================================================
   Gaia — interactions
   1. Scroll reveals
   2. Hero parallax
   3. The Knowledge Bridge matcher
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- reveals */

  var revealables = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealables.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 90 + 'ms';
      observer.observe(el);
    });
  }

  /* --------------------------------------------------------------- parallax */

  var heroArt = document.querySelector('.hero-art');

  if (heroArt && !reduceMotion) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          heroArt.style.transform = 'translate3d(0,' + (y * 0.22) + 'px,0) scale(1.06)';
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------- knowledge bridge */

  /* Each entry pairs a Tunisian field condition with a documented Japanese
     practice. Swap this table for your model's output when the backend is in. */
  var MATCHES = [
    {
      id: 'terracing',
      when: function (p) { return p.slope === 'steep' || (p.slope === 'moderate' && p.rain < 350); },
      challenge: 'Water runs off the slope before it soaks in',
      challengeBody: function (p) {
        return 'On a ' + p.slopeLabel.toLowerCase() + ' ' + p.soilLabel.toLowerCase() +
          ' slope with ' + p.rain + ' mm of rain, most of the yearly water arrives in a handful of storms and leaves within the hour, taking topsoil with it.';
      },
      jp: 'Tanada — stepped terraces with overflow sills',
      jpBody: 'Mountain villages flattened the slope into steps joined by low spill points, so water walks down the hill one level at a time instead of running down it.',
      rec: 'Jessour crossed with tanada',
      recBody: 'Keep your existing dikes. Level a four-metre band behind each one along the contour, and open a 30 cm spill sill at the low point. The catchment fills, the surplus steps down instead of breaking out sideways.',
      metrics: ['Water retained +38%', 'Topsoil loss −60%', '3 actions this month']
    },
    {
      id: 'mulching',
      when: function (p) { return p.soil === 'sandy' || p.rain < 180; },
      challenge: 'Bare soil loses its water to the air, not the roots',
      challengeBody: function (p) {
        return 'Open ' + p.soilLabel.toLowerCase() + ' ground under ' + p.cropLabel.toLowerCase() +
          ' evaporates most of what you give it, especially between June and September.';
      },
      jp: 'Shikikusa — ground cover laid between rows',
      jpBody: 'Japanese orchards keep a living or cut-grass layer over the soil year round, so the surface never bakes and the organic layer keeps rebuilding itself.',
      rec: 'Pruning-waste mulch, two fingers deep',
      recBody: 'Chip your own olive or almond prunings and lay them in a ring at the drip line, not against the trunk. Replace once a year after the first rains.',
      metrics: ['Evaporation −35%', 'Costs nothing but labour', 'Start before first rain']
    },
    {
      id: 'water-sharing',
      when: function (p) { return p.water === 'network' || p.water === 'well'; },
      challenge: 'Everyone irrigates at once, and the well drops',
      challengeBody: function (p) {
        return 'With a shared ' + p.waterLabel.toLowerCase() + ' around ' + p.region +
          ', peak demand lands on the same days, so the water table falls faster than it recharges.';
      },
      jp: 'Yui — the rotating village work and water turn',
      jpBody: 'Rural Japan organised irrigation and labour as a rotating obligation: whose turn it is, is public, and skipping your turn gives it to someone who needs it more.',
      rec: 'A published irrigation turn, with trades allowed',
      recBody: 'Gaia schedules the week by who is closest to stress, publishes the turn to the whole group, and lets anyone hand their slot to a neighbour who needs it more.',
      metrics: ['Peak draw spread over 7 days', 'Fewer dry wells in August', 'Works by SMS']
    },
    {
      id: 'layering',
      when: function (p) { return p.crop === 'dates' || p.crop === 'vegetables'; },
      challenge: 'One crop alone leaves the ground exposed and the income thin',
      challengeBody: function (p) {
        return 'A single storey of ' + p.cropLabel.toLowerCase() + ' around ' + p.region +
          ' takes the full sun on the soil and the full risk on one harvest date.';
      },
      jp: 'Satoyama — a worked landscape kept in balance',
      jpBody: 'Village, woodland and field are managed as one system, each layer feeding the next, with nothing harvested to exhaustion.',
      rec: 'Three-storey planting, oasis style',
      recBody: 'Palms or tall trees for shade, fruit trees in the middle, vegetables at ground level. Tunisia’s oases have run this for centuries; Gaia tunes the spacing to your light and water.',
      metrics: ['Ground temperature −6°C', 'Three harvest windows', 'Water use flat']
    }
  ];

  var FALLBACK = {
    challenge: 'Your land is already holding its water well',
    challengeBody: function (p) {
      return 'With ' + p.rain + ' mm of rain on ' + p.slopeLabel.toLowerCase() + ' ' +
        p.soilLabel.toLowerCase() + ' ground, runoff is not your first constraint — soil life is.';
    },
    jp: 'Bokashi — slow fermented compost',
    jpBody: 'Japanese smallholders ferment kitchen and field waste with bran and lactic bacteria, producing a compost that feeds soil organisms rather than just the plant.',
    rec: 'Build the soil before you build anything else',
    recBody: 'Start a bokashi pile from pressing residue and green waste. Spread it in autumn, under the mulch, and let the next two seasons do the work.',
    metrics: ['Organic matter +0.4%/yr', 'Uses farm waste only', 'Low effort']
  };

  var LABELS = {
    soil: { clay: 'Clay', sandy: 'Sandy', silty: 'Silty loam', rocky: 'Rocky' },
    slope: { steep: 'Steep', moderate: 'Moderate', flat: 'Flat' },
    water: { rainfed: 'Rain only', well: 'Shallow well', network: 'Irrigation network' },
    crop: { olives: 'Olives', almonds: 'Almonds', dates: 'Dates', vegetables: 'Vegetables' }
  };

  var form = document.getElementById('parcelForm');
  if (!form) return;

  function readParcel() {
    var data = {
      region: form.region.value,
      soil: form.soil.value,
      slope: form.slope.value,
      water: form.water.value,
      crop: form.crop.value,
      rain: parseInt(form.rain.value, 10) || 200
    };
    data.soilLabel = LABELS.soil[data.soil];
    data.slopeLabel = LABELS.slope[data.slope];
    data.waterLabel = LABELS.water[data.water];
    data.cropLabel = LABELS.crop[data.crop];
    return data;
  }

  function pickMatch(parcel) {
    for (var i = 0; i < MATCHES.length; i++) {
      if (MATCHES[i].when(parcel)) return MATCHES[i];
    }
    return FALLBACK;
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function render(match, parcel) {
    setText('outChallenge', match.challenge);
    setText('outChallengeBody', match.challengeBody(parcel));
    setText('outJp', match.jp);
    setText('outJpBody', match.jpBody);
    setText('outRec', match.rec);
    setText('outRecBody', match.recBody);

    var metrics = document.getElementById('outMetrics');
    if (metrics) {
      metrics.textContent = '';
      match.metrics.forEach(function (text) {
        var span = document.createElement('span');
        span.className = 'metric';
        span.textContent = text;
        metrics.appendChild(span);
      });
    }

    var out = document.getElementById('bridgeOut');
    if (out && !reduceMotion) {
      out.style.transition = 'none';
      out.style.opacity = '0';
      out.style.transform = 'translateY(14px)';
      window.requestAnimationFrame(function () {
        out.style.transition = 'opacity .6s ease, transform .6s ease';
        out.style.opacity = '1';
        out.style.transform = 'none';
      });
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var parcel = readParcel();
    render(pickMatch(parcel), parcel);
  });
}());
