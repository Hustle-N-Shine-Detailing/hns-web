/* Optional Google Analytics 4 for public customer pages. No Google requests before consent. */
(function () {
  'use strict';
  var MEASUREMENT_ID = 'G-J37P33Q5CD';
  var STORAGE_KEY = 'hns_ga4_consent_v1';
  var selected = null;
  var started = false;
  var banner = null;

  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'granted' || saved === 'denied') selected = saved;
  } catch (error) { /* Booking works when storage is disabled. */ }

  function save(value) {
    selected = value;
    try { localStorage.setItem(STORAGE_KEY, value); } catch (error) {}
  }

  function beginGoogleAnalytics() {
    if (started) return;
    started = true;
    window['ga-disable-' + MEASUREMENT_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, { send_page_view: true });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (part) {
      var name = part.trim().split('=')[0];
      if (name === '_ga' || name.indexOf('_ga_') === 0) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
      }
    });
  }

  function choose(choice) {
    save(choice);
    if (choice === 'granted') {
      if (started && typeof window.gtag === 'function') {
        window['ga-disable-' + MEASUREMENT_ID] = false;
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
      } else {
        beginGoogleAnalytics();
      }
    } else {
      window['ga-disable-' + MEASUREMENT_ID] = true;
      if (started && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { analytics_storage: 'denied' });
      }
      clearAnalyticsCookies();
    }
    if (banner) { banner.remove(); banner = null; }
  }

  function showPreferences() {
    if (banner) return;
    banner = document.createElement('section');
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Optional website analytics');
    banner.style.cssText = 'box-sizing:border-box;position:relative;z-index:2;width:100%;margin:0;padding:12px 18px;border-bottom:1px solid #8d9ca9;background:#15212b;color:#fff;font:15px/1.5 system-ui,sans-serif;';
    var title = document.createElement('strong');
    title.textContent = 'Optional website analytics';
    var detail = document.createElement('p');
    detail.style.margin = '6px 0 12px';
    detail.textContent = 'Allow Google Analytics cookies to help us understand which pages bring customers. Booking works either way.';
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;';
    var allow = document.createElement('button');
    allow.type = 'button';
    allow.textContent = 'Allow analytics';
    allow.style.cssText = 'border:0;border-radius:8px;padding:10px 14px;min-height:42px;background:#ff7a36;color:#111;font-weight:700;cursor:pointer;';
    allow.addEventListener('click', function () { choose('granted'); });
    var decline = document.createElement('button');
    decline.type = 'button';
    decline.textContent = 'No thanks';
    decline.style.cssText = 'border:1px solid #b5c1cb;border-radius:8px;padding:9px 14px;min-height:42px;background:transparent;color:#fff;cursor:pointer;';
    decline.addEventListener('click', function () { choose('denied'); });
    var policy = document.createElement('a');
    policy.href = '/privacy/';
    policy.textContent = 'Privacy details';
    policy.style.cssText = 'color:#fff;text-decoration:underline;';
    actions.appendChild(allow);
    actions.appendChild(decline);
    actions.appendChild(policy);
    banner.appendChild(title);
    banner.appendChild(detail);
    banner.appendChild(actions);
    document.body.insertBefore(banner, document.body.firstChild);
  }

  window.hnsGaEvent = function (name) {
    if (selected !== 'granted' || !started || typeof window.gtag !== 'function') return;
    var events = {
      booking_open: ['booking_open', {}],
      calendar_click: ['schedule_click', {}],
      request_saved: ['generate_lead', {}],
      call_click: ['contact', { method: 'phone' }],
      text_click: ['contact', { method: 'sms' }]
    };
    var item = events[name];
    if (item) window.gtag('event', item[0], item[1]);
    // Never send customer names, contact information, or internal request tokens to GA4.
  };

  if (selected === 'granted') beginGoogleAnalytics();
  document.addEventListener('DOMContentLoaded', function () {
    var footer = document.querySelector('footer');
    if (footer) {
      var settings = document.createElement('button');
      settings.type = 'button';
      settings.textContent = 'Analytics privacy settings';
      settings.style.cssText = 'display:inline-block;margin:10px 0;padding:6px 0;border:0;background:transparent;color:inherit;text-decoration:underline;cursor:pointer;font:inherit;';
      settings.addEventListener('click', showPreferences);
      footer.appendChild(settings);
    }
    var manual = document.querySelector('[data-analytics-preferences]');
    if (manual) manual.addEventListener('click', showPreferences);
    if (selected === null) showPreferences();
  });
})();
