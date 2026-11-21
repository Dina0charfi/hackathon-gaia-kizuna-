/* ==========================================================================
   Gaia AI engine — demonstration of the reasoning shape.

   This is a hand-written scoring function, not a trained model. Each practice
   declares the conditions it needs; the engine scores what the user selected
   against them and explains both the match and the rejections.

   To make it real: replace score() with a call to your model, keep the same
   {fit, why, blockers} shape, and the interface will not need to change.
   ========================================================================== */

(function () {
  'use strict';

  var run = document.getElementById('engineRun');
  if (!run) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- the table */

  var PRACTICES = [
    {
      id: 'tanada',
      name: 'Tanada terracing, crossed with jessour',
      jp: 'Stepped terraces joined by overflow sills, from Japan’s mountain valleys.',
      needs: { terrain: ['slope', 'terraced'], water: ['scarce', 'well'] },
      helps: 'Levels the catchment so water walks down the hill one step at a time instead of running off it.',
      blockedBy: { terrain: ['flat'] },
      blockReason: 'Terracing earns nothing on flat ground — there is no fall to interrupt.',
      actions: ['Level a four-metre band along the contour', 'Open a 30 cm spill sill at each low point', 'Mulch the tree bases before the rain']
    },
    {
      id: 'solar',
      name: 'Solar sharing, oasis-style',
      jp: 'Panels raised above the crop so both the field and the array use the same ground.',
      needs: { power: ['diesel', 'grid'], crop: ['veg', 'dates'] },
      helps: 'The shade cuts the ground temperature for crops that suffer in full sun, and the array can run the pump.',
      blockedBy: { power: ['none'] },
      blockReason: 'Without a pump or a grid connection there is nothing on the farm for the electricity to do yet, so the panels would only be a shade structure.',
      actions: ['Measure the light your crop actually needs', 'Model panel height and spacing', 'Check the grid connection and tariff']
    },
    {
      id: 'yui',
      name: 'A published irrigation turn',
      jp: 'The Japanese rotating village turn: whose turn it is, is public, and a skipped turn passes to whoever needs it more.',
      needs: { water: ['well', 'network'] },
      helps: 'Spreads peak demand across the week so the shared water table has time to recover.',
      blockedBy: { water: ['scarce'] },
      blockReason: 'There is nothing to schedule on a rain-only parcel — the rain does not take turns.',
      actions: ['List the farms on the same source', 'Publish the week’s turn', 'Allow slot trades between neighbours']
    },
    {
      id: 'satoyama',
      name: 'Layered planting, satoyama logic',
      jp: 'Woodland, field and village managed as one system, each layer feeding the next.',
      needs: { crop: ['dates', 'veg'], terrain: ['flat', 'terraced'] },
      helps: 'Puts a shade layer over the ground crop and spreads the harvest across more than one window.',
      blockedBy: {},
      blockReason: '',
      actions: ['Map what already grows at each height', 'Add the missing middle layer', 'Thin the top layer for light']
    },
    {
      id: 'mulch',
      name: 'Ground cover from your own prunings',
      jp: 'Japanese orchards keep a cut-grass layer over the soil year round so the surface never bakes.',
      needs: { crop: ['trees'], water: ['scarce', 'well'] },
      helps: 'Cuts evaporation from bare soil, and costs nothing but the labour of chipping what you already prune.',
      blockedBy: {},
      blockReason: '',
      actions: ['Chip this winter’s prunings', 'Lay a ring at the drip line, not against the trunk', 'Replace once a year after the first rains']
    }
  ];

  /* ------------------------------------------------------------- selection */

  function selection() {
    var picked = {};
    document.querySelectorAll('.chips').forEach(function (group) {
      var key = group.getAttribute('data-group');
      picked[key] = null;
      group.querySelectorAll('.chip').forEach(function (chip) {
        if (chip.getAttribute('aria-pressed') === 'true') picked[key] = chip.getAttribute('data-v');
      });
    });
    return picked;
  }

  document.querySelectorAll('.chips').forEach(function (group) {
    group.addEventListener('click', function (event) {
      var chip = event.target.closest('.chip');
      if (!chip) return;
      group.querySelectorAll('.chip').forEach(function (c) {
        c.setAttribute('aria-pressed', String(c === chip));
      });
    });
  });

  /* ---------------------------------------------------------------- scoring */

  function score(practice, picked) {
    var blockers = [];
    Object.keys(practice.blockedBy || {}).forEach(function (key) {
      if (practice.blockedBy[key].indexOf(picked[key]) !== -1) blockers.push(practice.blockReason);
    });

    var met = 0, total = 0, why = [];
    Object.keys(practice.needs).forEach(function (key) {
      total += 1;
      if (practice.needs[key].indexOf(picked[key]) !== -1) {
        met += 1;
        why.push(key);
      }
    });

    return {
      practice: practice,
      fit: total ? Math.round((met / total) * 100) : 0,
      blockers: blockers,
      matched: why
    };
  }

  /* ----------------------------------------------------------------- output */

  var STEPS = [
    ['Reading the conditions', function (p) {
      return 'Terrain: ' + p.terrain + '. Water: ' + p.water + '. Power: ' + (p.power || 'not stated') + '. Crop: ' + p.crop + '.';
    }],
    ['Searching the practice table', function () {
      return PRACTICES.length + ' documented practices, Japanese and Tunisian, each with the conditions it needs.';
    }],
    ['Checking what would fail here', function (res) {
      var out = res.filter(function (r) { return r.blockers.length; });
      return out.length
        ? out.length + ' ruled out before scoring, for reasons listed on the right.'
        : 'Nothing is ruled out outright by your conditions.';
    }],
    ['Scoring what is left', function (res) {
      var ok = res.filter(function (r) { return !r.blockers.length; });
      return ok.length + ' practices scored on how many of their conditions your parcel meets.';
    }],
    ['Writing the recommendation', function () {
      return 'The highest-scoring practice, with the field actions it implies.';
    }]
  ];

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function renderTrace(results, picked, done) {
    var list = document.getElementById('engineTrace');
    list.textContent = '';

    STEPS.forEach(function (step, i) {
      var li = el('li');
      var dot = el('span', 'dot', String(i + 1));
      var body = el('div');
      body.appendChild(el('strong', null, step[0]));
      body.appendChild(el('span', 'note', step[1](i === 0 ? picked : results)));
      li.appendChild(dot);
      li.appendChild(body);
      list.appendChild(li);
    });

    var dots = list.querySelectorAll('.dot');
    if (reduceMotion) {
      dots.forEach(function (d) { d.classList.add('on'); });
      done();
      return;
    }
    dots.forEach(function (d, i) {
      window.setTimeout(function () {
        d.classList.add('on');
        if (i === dots.length - 1) done();
      }, 260 * (i + 1));
    });
  }

  function renderVerdict(best, picked) {
    var box = document.getElementById('engineVerdict');
    box.textContent = '';

    box.appendChild(el('p', 'eyebrow', 'Best fit for your parcel'));

    var h = el('h3');
    h.textContent = best.practice.name;
    box.appendChild(h);

    box.appendChild(el('p', null, best.practice.jp));
    box.appendChild(el('p', null, best.practice.helps));

    var fit = el('div', 'fit');
    fit.appendChild(el('span', null, 'Condition match'));
    var bar = el('div', 'fit-bar');
    var i = document.createElement('i');
    i.style.width = best.fit + '%';
    if (best.fit < 60) i.style.background = '#C9A227';
    bar.appendChild(i);
    fit.appendChild(bar);
    var b = document.createElement('b');
    b.textContent = best.fit + '%';
    fit.appendChild(b);
    box.appendChild(fit);

    var caveat = el('p', 'hint',
      best.fit === 100
        ? 'Every condition this practice needs is present on your parcel.'
        : 'Some conditions are missing, so this is a candidate rather than an answer. A real model would ask you for the missing ones.');
    box.appendChild(caveat);

    box.appendChild(el('p', 'eyebrow', 'What that means in the field'));
    var ol = el('ol');
    ol.style.margin = '10px 0 0 18px';
    ol.style.color = 'var(--ink-soft)';
    ol.style.fontSize = '15px';
    best.practice.actions.forEach(function (a) {
      var li = el('li', null, a);
      li.style.marginTop = '6px';
      ol.appendChild(li);
    });
    box.appendChild(ol);
  }

  function renderRejected(results) {
    var box = document.getElementById('engineRejected');
    var body = document.getElementById('rejectedBody');
    var out = results.filter(function (r) { return r.blockers.length; });

    body.textContent = '';
    if (!out.length) { box.hidden = true; return; }
    box.hidden = false;

    out.forEach(function (r) {
      var h = el('h3', null, r.practice.name);
      h.style.fontSize = '19px';
      h.style.marginTop = '14px';
      body.appendChild(h);
      body.appendChild(el('p', null, r.blockers[0]));
    });
  }

  run.addEventListener('click', function () {
    var picked = selection();
    var results = PRACTICES.map(function (p) { return score(p, picked); });

    var viable = results.filter(function (r) { return !r.blockers.length; })
                        .sort(function (a, b) { return b.fit - a.fit; });

    renderTrace(results, picked, function () {
      if (viable.length) {
        renderVerdict(viable[0], picked);
      } else {
        var box = document.getElementById('engineVerdict');
        box.textContent = '';
        box.appendChild(el('p', 'eyebrow', 'No candidate'));
        box.appendChild(el('h3', null, 'Nothing in the table fits these conditions'));
        box.appendChild(el('p', null, 'That is the honest answer rather than a forced one. A larger practice library, or a different combination of conditions, would give the engine something to work with.'));
      }
      renderRejected(results);
    });
  });
}());
