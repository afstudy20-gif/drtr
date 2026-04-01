// DrTR Ads — manual placement + adblock detection
// Replace SLOT_XXXXXX values with your AdSense ad unit IDs from
// https://www.google.com/adsense → Ads → By ad unit → Display ads

(function () {
  const CLIENT = 'ca-pub-5561716689369449';

  // ── Ad unit slot IDs ────────────────────────────────────────────
  // Create one "Display" ad unit per position in AdSense, copy the
  // data-ad-slot value here.
  const SLOTS = {
    top:    'SLOT_TOP_XXXX',     // between hero and first section
    mid:    'SLOT_MID_XXXX',     // between sections / mid-page
    bottom: 'SLOT_BOT_XXXX',     // above footer
  };
  // ────────────────────────────────────────────────────────────────

  // ── Inject adblock banner into DOM ──────────────────────────────
  function injectBanner() {
    if (document.getElementById('adblock-banner')) return;

    const style = document.createElement('style');
    style.textContent = `
      #adblock-banner {
        display: none;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        background: #1e293b;
        color: #e2e8f0;
        padding: 12px 20px;
        font-size: 13px;
        line-height: 1.5;
        align-items: center;
        justify-content: center;
        gap: 16px;
        z-index: 9999;
        box-shadow: 0 -2px 12px rgba(0,0,0,0.3);
      }
      #adblock-banner span { flex: 1; max-width: 600px; }
      #adblock-banner button {
        flex-shrink: 0;
        background: transparent;
        border: 1px solid rgba(255,255,255,0.3);
        color: #94a3b8;
        border-radius: 6px;
        padding: 6px 14px;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
      }
      #adblock-banner button:hover { color: #e2e8f0; border-color: rgba(255,255,255,0.6); }
      .ad-unit {
        max-width: 760px;
        margin: 12px auto;
        padding: 0 16px;
        display: none;
        text-align: center;
      }
      .ad-unit-label {
        font-size: 10px;
        color: #aaa;
        text-align: center;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    `;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.id = 'adblock-banner';
    banner.innerHTML =
      '<span>Bu site ücretsiz hizmet sunmak için reklam gelirlerine ihtiyaç duyar. ' +
      'Lütfen reklam engelleyicinizi kapatın veya drtr.uk\'u beyaz listeye ekleyin.</span>' +
      '<button onclick="dismissAdblockBanner()">Kapat</button>';
    document.body.appendChild(banner);
  }

  // ── Render ad units ─────────────────────────────────────────────
  function renderAds() {
    document.querySelectorAll('.ad-unit[data-slot]').forEach(function (wrap) {
      const slotKey = wrap.dataset.slot;
      const slotId  = SLOTS[slotKey];
      if (!slotId || slotId.startsWith('SLOT_')) return; // placeholder — skip

      // Add label
      const lbl = document.createElement('div');
      lbl.className = 'ad-unit-label';
      lbl.textContent = 'Reklam';
      wrap.insertBefore(lbl, wrap.firstChild);

      const ins = document.createElement('ins');
      ins.className            = 'adsbygoogle';
      ins.style.display        = 'block';
      ins.dataset.adClient     = CLIENT;
      ins.dataset.adSlot       = slotId;
      ins.dataset.adFormat     = 'auto';
      ins.dataset.fullWidthResponsive = 'true';
      wrap.appendChild(ins);

      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
      catch (e) {}

      wrap.style.display = 'block';
    });
  }

  // ── Adblock detection ───────────────────────────────────────────
  function detectAdblock() {
    const bait = document.createElement('div');
    bait.className = 'adsbox ad ads adsbygoogle';
    bait.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;top:-9999px';
    document.body.appendChild(bait);

    setTimeout(function () {
      const blocked = bait.offsetHeight === 0 ||
                      window.getComputedStyle(bait).display === 'none';
      document.body.removeChild(bait);
      if (blocked) showAdblockBanner();
    }, 100);
  }

  function showAdblockBanner() {
    if (localStorage.getItem('adblock_dismissed') === '1') return;
    const banner = document.getElementById('adblock-banner');
    if (banner) banner.style.display = 'flex';
  }

  function dismissAdblockBanner() {
    const banner = document.getElementById('adblock-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('adblock_dismissed', '1');
  }

  window.dismissAdblockBanner = dismissAdblockBanner;

  // ── Init ────────────────────────────────────────────────────────
  function init() {
    injectBanner();
    renderAds();
    setTimeout(detectAdblock, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
