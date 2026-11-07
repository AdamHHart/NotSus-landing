/* home/home.js
 *
 * The filter, and the card. Everything here is an enhancement: the page is
 * complete and every tile is a working link before this file runs.
 *
 * No framework, no build step, no storage of any kind.
 */

(function () {
  'use strict';

  var tiles = Array.prototype.slice.call(document.querySelectorAll('.everything .app-button'));
  // Only the twelve category sections. The two picks rows are shown or hidden
  // as a block, not swept one heading at a time.
  var sections = Array.prototype.slice.call(document.querySelectorAll('.app-section:not(.picks)'));
  var q = document.getElementById('q');
  var clearBtn = document.getElementById('clear');
  var age = document.getElementById('age');
  var cat = document.getElementById('cat');
  var count = document.getElementById('result-count');
  var miss = document.getElementById('miss');
  var picks = document.getElementById('picks');

  var missData = {};
  try {
    missData = JSON.parse(document.getElementById('miss-data').textContent);
  } catch (e) {
    missData = { notCarried: {} };
  }

  // Read each tile once. Reading data attributes on every keystroke across a
  // hundred tiles is the one thing that would make this feel slow.
  var items = tiles.map(function (el) {
    return {
      el: el,
      cat: el.getAttribute('data-cat'),
      ageMin: parseInt(el.getAttribute('data-agemin'), 10) || 0,
      terms: el.getAttribute('data-terms') || '',
      name: (el.querySelector('.app-name') || {}).textContent || ''
    };
  });

  function matchesCategory(item) {
    return !cat.value || item.cat === cat.value;
  }

  // A site shows for a band when its youngest suitable age is at or below that
  // band's top age. Same rule the app uses, so the two agree.
  function matchesAge(item, maxAge) {
    return item.ageMin <= maxAge;
  }

  // Every typed word has to appear somewhere in the tile's terms. Two words
  // narrow; they do not have to sit next to each other, because a child types
  // "game maker" and the words are apart in the description.
  function matchesWords(item, words) {
    for (var i = 0; i < words.length; i++) {
      if (item.terms.indexOf(words[i]) === -1) return false;
    }
    return true;
  }

  function wordsOf(text) {
    return text.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 0; });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // The brands children type that this page has no answer for. Matched on the
  // whole typed phrase and on each word, so "minecraft mods" still lands.
  function askedForSomethingMissing(text) {
    var typed = text.toLowerCase().trim();
    if (!typed) return null;
    var keys = Object.keys(missData.notCarried || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typed === k || typed.indexOf(k) !== -1) {
        return { asked: k, suggest: missData.notCarried[k] || [] };
      }
    }
    return null;
  }

  function fill(template, asked) {
    return String(template || '').replace('{asked}', asked);
  }

  function titleCase(s) {
    return s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }

  function showMiss(asked, suggestions, anyVisible) {
    var label = titleCase(asked);
    var html = '';

    if (suggestions.length && anyVisible) {
      html += '<p>' + escapeHtml(fill(missData.missLine, label)) + '</p>';
      html += '<div class="miss-suggest">';
      suggestions.forEach(function (name) {
        var item = items.filter(function (it) { return it.name === name; })[0];
        if (item) {
          html += '<a href="' + escapeHtml(item.el.getAttribute('href')) +
            '" target="_blank" rel="noopener noreferrer">' + escapeHtml(name) + '</a>';
        }
      });
      html += '</div>';
    } else {
      html += '<p>' + escapeHtml(fill(missData.emptyLine, label)) + '</p>';
    }

    html += '<p>' + escapeHtml(missData.downloadLine) + '</p>';
    html += '<a class="miss-get" href="/downloads">Get the browser</a>';

    miss.innerHTML = html;
    miss.hidden = false;
  }

  function showNothingFound(text) {
    miss.innerHTML =
      '<p>Nothing here matches &ldquo;' + escapeHtml(text) + '&rdquo;. Try fewer words, or tap one of the buttons above.</p>' +
      '<p>' + escapeHtml(missData.downloadLine) + '</p>' +
      '<a class="miss-get" href="/downloads">Get the browser</a>';
    miss.hidden = false;
  }

  function apply() {
    var text = q.value;
    var words = wordsOf(text);
    var maxAge = parseInt(age.value, 10) || 99;
    var shown = 0;

    items.forEach(function (item) {
      var ok = matchesCategory(item) && matchesAge(item, maxAge) && matchesWords(item, words);
      item.el.hidden = !ok;
      if (ok) shown++;
    });

    // The two rows the browser opens with are the view for someone who has
    // not asked for anything yet. The moment a filter is on they go, so a
    // site cannot appear twice in one result.
    var filtering = words.length > 0 || Boolean(cat.value) || age.selectedIndex > 0;
    if (picks) picks.hidden = filtering;

    // The first screen stops holding a screenful open while a filter is on,
    // so the results start under the search bar rather than below the fold.
    var wasFiltering = document.body.classList.contains('is-filtering');
    document.body.classList.toggle('is-filtering', filtering);

    // Somebody who scrolled down and then typed is looking at the search bar,
    // not at wherever they had got to. Only on the way in, and only if they
    // had actually scrolled, so it never fights with typing.
    if (filtering && !wasFiltering && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // A heading with nothing under it reads like a broken page.
    sections.forEach(function (sec) {
      var any = sec.querySelector('.app-button:not([hidden])');
      sec.hidden = !any;
    });

    clearBtn.hidden = text.length === 0;

    // A dropdown that is narrowing the page should not look like one that is
    // not, so it carries a class the stylesheet colours.
    cat.parentNode.className = 'capsule-pick' + (cat.value ? ' is-set' : '');
    age.parentNode.className = 'capsule-pick' + (age.selectedIndex > 0 ? ' is-set' : '');

    if (!filtering) {
      count.textContent = '';
    } else if (shown === 0) {
      count.textContent = 'Nothing found';
    } else {
      count.textContent = shown === 1 ? '1 site' : shown + ' sites';
    }

    miss.hidden = true;
    miss.innerHTML = '';

    var missing = askedForSomethingMissing(text);
    if (missing) {
      showMiss(missing.asked, missing.suggest, shown > 0);
    } else if (words.length > 0 && shown === 0) {
      showNothingFound(text);
    }
  }

  // Search as you type. There is no button, and nothing to press.
  q.addEventListener('input', apply);
  age.addEventListener('change', apply);
  cat.addEventListener('change', apply);

  clearBtn.addEventListener('click', function () {
    q.value = '';
    q.focus();
    apply();
  });

  // Escape clears the search. It used to close the card as well; the card
  // does not close any more.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.activeElement === q && q.value) {
      q.value = '';
      apply();
    }
  });

  apply();

  /* ------------------------------------------------------------------ card */

  var cta = document.getElementById('cta');
  var ctaOpen = document.getElementById('cta-open');
  var ctaMore = document.getElementById('cta-more');

  /*
   * The card stays. It used to remember being dismissed for thirty days in
   * localStorage, which meant a parent who closed it once on a shared family
   * machine never saw the only thing on the page that explains what NotSus
   * is. Adam, 2026-11-07: it does not disappear.
   *
   * It still arrives half a second after load rather than with the page, so
   * it reads as having been handed over rather than having always been there.
   */
  if (cta) {
    window.setTimeout(function () {
      cta.hidden = false;
      // Two frames, so the transition has a start state to move from.
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { cta.classList.add('is-in'); });
      });
    }, 500);
  }

  if (ctaOpen) {
    ctaOpen.addEventListener('click', function () {
      ctaMore.hidden = false;
      ctaOpen.hidden = true;
      ctaOpen.setAttribute('aria-expanded', 'true');
    });
  }

  // Both options lead to the same list of devices, because they lead to the
  // same download. The difference between them is lived inside the browser,
  // not chosen here.
  Array.prototype.forEach.call(document.querySelectorAll('[data-to-devices]'), function (b) {
    b.addEventListener('click', function () {
      ctaMore.hidden = true;
      ctaDevices.hidden = false;
      startHumanCheck();
    });
  });

  if (ctaBack) {
    ctaBack.addEventListener('click', function () {
      ctaDevices.hidden = true;
      ctaMore.hidden = false;
    });
  }

  /* ----------------------------------------------------------- the check */

  /*
   * Cloudflare Turnstile, drawn only once the card is opened. Nobody should
   * pay for a widget they never see, and a challenge that loads on every page
   * view is a challenge that runs for every child too.
   *
   * It sits on the device step, immediately before a download, rather than
   * two screens earlier where it would have been a toll on reading the page.
   * The device links are inert until the server has checked the token and set
   * its cookie. The gate is not in the page at all unless a site key was set
   * when the page was built.
   */
  var gate = document.getElementById('cta-gate');
  var devices = Array.prototype.slice.call(document.querySelectorAll('.cta-device'));
  var checkStarted = false;

  function lockDevices() {
    devices.forEach(function (d) {
      d.classList.add('is-locked');
      d.setAttribute('aria-disabled', 'true');
      d.dataset.href = d.getAttribute('href');
      d.removeAttribute('href');
    });
  }

  function unlockDevices() {
    devices.forEach(function (d) {
      d.classList.remove('is-locked');
      d.removeAttribute('aria-disabled');
      if (d.dataset.href) d.setAttribute('href', d.dataset.href);
    });
    if (gate) gate.remove();
  }

  function startHumanCheck() {
    if (!gate || checkStarted) return;
    checkStarted = true;
    lockDevices();

    function render() {
      if (!window.turnstile) { window.setTimeout(render, 120); return; }
      window.turnstile.render('#cta-turnstile', {
        sitekey: gate.getAttribute('data-sitekey'),
        theme: 'dark',
        callback: function (token) {
          fetch('/api/verify-human', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
          })
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d.success) unlockDevices(); })
            .catch(function () { /* leave it locked; the page still works */ });
        }
      });
    }
    render();
  }
})();
