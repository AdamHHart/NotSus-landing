/* home/home.js
 *
 * The filter, and the card. Everything here is an enhancement: the page is
 * complete and every tile is a working link before this file runs.
 *
 * No framework, no build step, no storage beyond the card's dismissal.
 */

(function () {
  'use strict';

  var tiles = Array.prototype.slice.call(document.querySelectorAll('.app-button'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.app-section'));
  var q = document.getElementById('q');
  var clearBtn = document.getElementById('clear');
  var age = document.getElementById('age');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var count = document.getElementById('result-count');
  var miss = document.getElementById('miss');

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

  var picked = Object.create(null);

  function activeChips() {
    return Object.keys(picked).filter(function (k) { return picked[k]; });
  }

  // Several chips widen the result rather than narrowing it. A child picking
  // Art and Music means "either of those", not "both at once".
  function matchesChips(item) {
    var on = activeChips();
    return on.length === 0 || on.indexOf(item.cat) !== -1;
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
      var ok = matchesChips(item) && matchesAge(item, maxAge) && matchesWords(item, words);
      item.el.hidden = !ok;
      if (ok) shown++;
    });

    // A heading with nothing under it reads like a broken page.
    sections.forEach(function (sec) {
      var any = sec.querySelector('.app-button:not([hidden])');
      sec.hidden = !any;
    });

    clearBtn.hidden = text.length === 0;

    var filtering = words.length > 0 || activeChips().length > 0 || maxAge !== 99;
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

  q.addEventListener('input', apply);
  age.addEventListener('change', apply);

  clearBtn.addEventListener('click', function () {
    q.value = '';
    q.focus();
    apply();
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var cat = chip.getAttribute('data-chip');
      picked[cat] = !picked[cat];
      chip.setAttribute('aria-pressed', picked[cat] ? 'true' : 'false');
      apply();
    });
  });

  // Escape clears the search before it reaches the card, because a child who
  // has typed something wants that gone first.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.activeElement === q && q.value) {
      q.value = '';
      apply();
      return;
    }
    dismissCard();
  });

  apply();

  /* ------------------------------------------------------------------ card */

  var cta = document.getElementById('cta');
  var ctaOpen = document.getElementById('cta-open');
  var ctaMore = document.getElementById('cta-more');
  var ctaClose = document.getElementById('cta-close');

  var KEY = 'notsus.cta.dismissedAt';
  var THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  function dismissedRecently() {
    try {
      var at = parseInt(window.localStorage.getItem(KEY), 10);
      return Number.isFinite(at) && Date.now() - at < THIRTY_DAYS;
    } catch (e) {
      // Private windows and blocked site data both throw here. Showing the
      // card is the right fallback; it is dismissable either way.
      return false;
    }
  }

  function dismissCard() {
    if (!cta || cta.hidden) return;
    cta.classList.remove('is-in');
    cta.hidden = true;
    try { window.localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* nothing to do */ }
  }

  if (cta && !dismissedRecently()) {
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
    });
  }
  if (ctaClose) ctaClose.addEventListener('click', dismissCard);
})();
