import {
  DAYS,
  TARGETS,
  analyzeWarfarinCase,
  describeSchedule,
  expandPattern,
  formatDate,
  formatMg,
  formatNumber,
  formatTablets,
  isoDateToday,
  parseDosePattern,
  sumSchedule,
  tabletsToMg
} from "./warfarin.js";

// ─── Drug Interactions ──────────────────────────────────────────────

const DRUG_INTERACTIONS = [
  {
    name: "amiodaron",
    aliases: ["amiodaron", "cordarone"],
    direction: "increase",
    severity: "major",
    mechanism: "CYP2C9/1A2/3A4 inhibisyonu",
    note: "INR yavaş yükselir; etki 6-8 haftaya yayılabilir.",
    action: "Yakın INR izlemi; seri ayarlamalarla %25-50 bakım dozu azaltımı gerekebilir."
  },
  {
    name: "flukonazol",
    aliases: ["flukonazol", "fluconazole"],
    direction: "increase",
    severity: "major",
    mechanism: "CYP2C9 inhibisyonu",
    note: "INR artışı belirgin olabilir.",
    action: "Tek dozda bir doz atlama düşünülebilir; uzun kürde %25-50 azaltım ve yakın INR."
  },
  {
    name: "metronidazol",
    aliases: ["metronidazol", "flagyl"],
    direction: "increase",
    severity: "major",
    mechanism: "CYP2C9 inhibisyonu",
    note: "INR artışı beklenir.",
    action: "%25-50 azaltım gerekebilir; INR kısa aralıkla kontrol edilmeli."
  },
  {
    name: "TMP-SMX",
    aliases: ["kotrimoksazol", "trimetoprim", "sulfametoksazol", "sulfamethoxazole", "bactrim", "septra", "tmp-smx"],
    direction: "increase",
    severity: "major",
    mechanism: "CYP2C9 inhibisyonu + barsak florası etkisi",
    note: "INR ve kanama riski belirgin artabilir.",
    action: "%25-50 azaltım gerekebilir; antibiyotik başlama/bitirme sonrası yakın INR."
  },
  {
    name: "rifampisin",
    aliases: ["rifampisin", "rifampin", "rifadin"],
    direction: "decrease",
    severity: "major",
    mechanism: "Güçlü CYP indüksiyonu",
    note: "INR belirgin düşebilir; etki başlarken ve kesilince gecikmeli değişir.",
    action: "Doz gereksinimi 2-5 kat artabilir; kesilince hızlı doz düşürme ve sık INR gerekir."
  },
  {
    name: "karbamazepin",
    aliases: ["karbamazepin", "carbamazepine", "tegretol"],
    direction: "decrease",
    severity: "major",
    mechanism: "CYP indüksiyonu",
    note: "INR düşebilir.",
    action: "Başlama/kesme sonrası sık INR; bakım dozu ihtiyacı değişebilir."
  },
  {
    name: "fenitoin",
    aliases: ["fenitoin", "phenytoin", "epdantoin"],
    direction: "mixed",
    severity: "major",
    mechanism: "Kompleks protein bağlanma ve CYP etkisi",
    note: "Başta INR artabilir, uzamış kullanımda düşebilir; fenitoin düzeyi de etkilenebilir.",
    action: "Yakın INR ve klinik izlem; tek yönlü otomatik doz varsayımı yapmayın."
  },
  {
    name: "florokinolon",
    aliases: ["siprofloksasin", "ciprofloxacin", "levofloksasin", "levofloxacin", "moksifloksasin", "moxifloxacin", "florokinolon", "fluoroquinolone"],
    direction: "increase",
    severity: "moderate",
    mechanism: "CYP/intestinal flora ve hastalık etkisi",
    note: "INR artabilir; her hastada klinik olarak anlamlı olmayabilir.",
    action: "Antibiyotik süresince ve kesilince INR izlemi."
  },
  {
    name: "makrolid",
    aliases: ["eritromisin", "erythromycin", "klaritromisin", "clarithromycin", "azitromisin", "azithromycin", "makrolid", "macrolide"],
    direction: "increase",
    severity: "moderate",
    mechanism: "CYP3A4/intestinal flora etkisi",
    note: "INR artabilir.",
    action: "Başlama/kesme sonrası INR kontrolü; klinik kanama bulguları sorgulanmalı."
  },
  {
    name: "doksisiklin",
    aliases: ["doksisiklin", "doxycycline"],
    direction: "increase",
    severity: "moderate",
    mechanism: "Protein bağlanma/intestinal flora etkisi",
    note: "INR artabilir; her hastada belirgin olmayabilir.",
    action: "Sistemik hastalık varsa daha yakın INR izlemi."
  },
  {
    name: "NSAID",
    aliases: ["ibuprofen", "naproksen", "naproxen", "diklofenak", "diclofenac", "piroksikam", "piroxicam", "indometazin", "indomethacin", "meloksikam", "meloxicam", "etodolak", "etodolac", "celecoxib", "selekoksib", "nsaid", "nsaii"],
    direction: "bleeding",
    severity: "major",
    mechanism: "Platelet/GİS hasarı; INR değişmeden kanama artabilir",
    note: "Kanama riski artar.",
    action: "Mümkünse kaçın; zorunluysa endikasyon, mide koruma ve yakın kanama izlemi."
  },
  {
    name: "aspirin/antiplatelet",
    aliases: ["aspirin", "asa", "asetilsalisilik", "klopidogrel", "clopidogrel", "prasugrel", "tikagrelor", "ticagrelor", "antiplatelet"],
    direction: "bleeding",
    severity: "major",
    mechanism: "Antiplatelet + antikoagülan etki",
    note: "INR değişmeden kanama riski artabilir.",
    action: "Endikasyon doğrulanmalı; gereksiz kombinasyondan kaçınılmalı."
  },
  {
    name: "SSRI/SNRI",
    aliases: ["fluoksetin", "fluoxetine", "sertralin", "sertraline", "paroksetin", "paroxetine", "sitalopram", "citalopram", "essitalopram", "escitalopram", "venlafaksin", "venlafaxine", "duloksetin", "duloxetine", "ssri", "snri"],
    direction: "bleeding",
    severity: "moderate",
    mechanism: "Platelet serotonin etkisi; bazı ajanlarda CYP etkisi",
    note: "Kanama riski artabilir; bazı ajanlar INR'yi yükseltebilir.",
    action: "Başlama/kesme sonrası INR ve kanama bulguları izlenmeli."
  },
  {
    name: "parasetamol",
    aliases: ["parasetamol", "acetaminophen", "asetaminofen", "apap"],
    direction: "increase",
    severity: "moderate",
    mechanism: "Doza bağlı INR artışı",
    note: "Yüksek doz veya birkaç gün üst üste kullanım INR'yi artırabilir.",
    action: "Günlük 2000 mg üstünden kaçın; gerekiyorsa INR kontrolü."
  },
  {
    name: "alkol",
    aliases: ["alkol", "alcohol", "etanol"],
    direction: "mixed",
    severity: "moderate",
    mechanism: "Akut alım INR artırabilir, kronik yoğun kullanım azaltabilir",
    note: "Değişken alım INR'yi oynatır.",
    action: "Aşırı ve düzensiz alımdan kaçın; belirgin değişiklikte INR kontrolü."
  },
  {
    name: "K vitamini",
    aliases: ["k vitamini", "vitamin k", "fitonadion", "phytonadione"],
    direction: "decrease",
    severity: "major",
    mechanism: "Farmakodinamik antagonizma",
    note: "Yüksek veya değişken K vitamini alımı INR'yi düşürebilir.",
    action: "Diyet ve takviyelerde ani değişimden kaçın; değişimde INR sıklaştırılır."
  },
  {
    name: "sarıkantaron",
    aliases: ["sarikantaron", "sarıkantaron", "st john", "st. john", "hypericum"],
    direction: "decrease",
    severity: "major",
    mechanism: "CYP/P-gp indüksiyonu",
    note: "INR düşebilir.",
    action: "Birlikte kullanım genellikle kaçınılacak grup; başlama/kesme sonrası sık INR."
  },
  {
    name: "kolestiramin",
    aliases: ["kolestiramin", "cholestyramine"],
    direction: "decrease",
    severity: "moderate",
    mechanism: "Emilim azalması",
    note: "Varfarin emilimini azaltabilir.",
    action: "Dozları ayırın; INR yanıtına göre izleyin."
  },
  {
    name: "tiroid replasmanı",
    aliases: ["levotiroksin", "levothyroxine", "tiroksin", "thyroxine", "thyroid"],
    direction: "increase",
    severity: "moderate",
    mechanism: "Pıhtılaşma faktörü döngüsü değişimi",
    note: "Tiroid replasmanı veya tiroid durum değişikliği INR'yi artırabilir.",
    action: "Başlama/doz değişimi sonrası INR izlemi."
  },
  {
    name: "kortikosteroid",
    aliases: ["prednizon", "prednisone", "prednizolon", "prednisolone", "metilprednizolon", "methylprednisolone", "deksametazon", "dexamethasone", "kortizon", "cortisone", "steroid", "glukokortikoid", "glucocorticoid"],
    direction: "mixed",
    severity: "major",
    mechanism: "VKA yanıtı değişebilir; GİS kanama ve doku kırılganlığı artabilir",
    note: "INR artabilir veya azalabilir; GİS kanama riski eklenir.",
    action: "Başlama, doz değişimi ve kesme döneminde INR ve kanama bulguları yakın izlenmeli."
  },
  {
    name: "azatioprin / 6-MP",
    aliases: ["azatioprin", "azathioprine", "imuran", "merkaptopurin", "mercaptopurine", "6-mp", "6 mp"],
    direction: "decrease",
    severity: "major",
    mechanism: "Warfarinin hipoprotrombinemik etkisini azaltabilir",
    note: "INR düşebilir; kesilince tersine INR yükselip kanama riski doğabilir.",
    action: "Başlama/kesme sonrası sık INR; warfarin dozu yalnız INR yanıtına göre ayarlanmalı."
  },
  {
    name: "leflunomid",
    aliases: ["leflunomid", "leflunomide", "arava", "teriflunomid", "teriflunomide"],
    direction: "mixed",
    severity: "major",
    mechanism: "Teriflunomid ve warfarin etkileşimi; etki yönü kaynaklarda değişken bildirildi",
    note: "INR azalması veya artışı görülebilir.",
    action: "Başlama/kesme ve kolestiramin eliminasyon protokolünde INR yakın izlenmeli."
  },
  {
    name: "sulfasalazin",
    aliases: ["sulfasalazin", "sulfasalazine", "sulphasalazine", "salazopyrin"],
    direction: "mixed",
    severity: "moderate",
    mechanism: "Vaka bildirimlerinde INR artışı veya warfarin direnci",
    note: "Etki yönü öngörülemez; ayrıca kan sayımı/karaciğer izlem gerektirir.",
    action: "Başlama/kesme sonrası INR kontrolü; morarma/kanama veya subterapötik INR açısından izlem."
  },
  {
    name: "metotreksat",
    aliases: ["metotreksat", "methotrexate", "mtx"],
    direction: "bleeding",
    severity: "moderate",
    mechanism: "Protein bağlanma ve kemik iliği/trombosit toksisitesi klinik riski artırabilir",
    note: "Doğrudan INR yönü tutarlı değildir; NSAID/aspirin eşliği riski büyütür.",
    action: "INR yanında tam kan sayımı, karaciğer/böbrek fonksiyonu ve kanama bulguları izlenmeli."
  },
  {
    name: "allopurinol",
    aliases: ["allopurinol", "allopurinol", "zyloric"],
    direction: "increase",
    severity: "moderate",
    mechanism: "Kumarin antikoagülan etkisini artırabilir; mekanizma net değil",
    note: "INR artışı görülebilir.",
    action: "Allopurinol eklenince INR sık değerlendirilmeli ve warfarin dozu INR'ye göre ayarlanmalı."
  },
  {
    name: "IL-6 inhibitörü",
    aliases: ["tocilizumab", "tosilizumab", "actemra", "sarilumab", "kevzara", "il-6", "il6"],
    direction: "decrease",
    severity: "moderate",
    mechanism: "IL-6 blokajı CYP450 aktivitesini artırıp CYP substratlarının etkisini azaltabilir",
    note: "Warfarin etkisi azalabilir; kesilince ters yönde değişebilir.",
    action: "Başlama veya kesmede INR izlemi; doz, ölçülen INR yanıtına göre ayarlanır."
  },
  {
    name: "hidroksiklorokin",
    aliases: ["hidroksiklorokin", "hydroxychloroquine", "plaquenil", "hcq"],
    direction: "monitor",
    severity: "minor",
    mechanism: "Doğrudan warfarin-INR etkileşimi için güçlü sinyal yok",
    note: "Tek başına yüksek riskli warfarin etkileşimi olarak işaretlenmez.",
    action: "Yeni başlama/kesme, eş NSAID/steroid/antibiyotik veya hastalık alevlenmesinde INR izlenmeli."
  }
];

function normalizeDrugText(text) {
  return String(text)
    .toLowerCase()
    .replace(/[çÇ]/g, "c")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[İ]/g, "i")
    .replace(/[ıI]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

function interactionMatches(term, drug) {
  const normalizedAliases = [drug.name, ...(drug.aliases ?? [])].map(normalizeDrugText);
  return normalizedAliases.some((alias) => {
    if (alias.length < 4 || term.length < 4) return term === alias;
    return term.includes(alias) || alias.includes(term);
  });
}

function checkDrugInteractions(drugText) {
  if (!drugText || !drugText.trim()) return [];

  const terms = normalizeDrugText(drugText)
    .split(/[,;\n]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const found = [];

  for (const term of terms) {
    for (const drug of DRUG_INTERACTIONS) {
      if (interactionMatches(term, drug) && !found.some((item) => item.name === drug.name)) {
        found.push(drug);
      }
    }
  }

  return found.sort((left, right) => {
    const rank = { major: 0, moderate: 1, minor: 2 };
    return rank[left.severity] - rank[right.severity];
  });
}

// ─── Dose History (localStorage) ────────────────────────────────────

const HISTORY_KEY = "varfarin_dose_history";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistoryEntry(entry) {
  const history = loadHistory();
  history.push(entry);
  if (history.length > 50) history.splice(0, history.length - 50);
  saveHistory(history);
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function calculateTTR(history, target) {
  if (history.length < 2) return null;

  const sorted = [...history]
    .filter((h) => h.date && h.inr)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 2) return null;

  let totalDays = 0;
  let inRangeDays = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = new Date(`${sorted[i].date}T00:00:00`);
    const end = new Date(`${sorted[i + 1].date}T00:00:00`);
    const days = Math.round((end - start) / 86400000);
    if (days <= 0 || days > 90) continue;

    const inr1 = sorted[i].inr;
    const inr2 = sorted[i + 1].inr;

    totalDays += days;

    const both1InRange = inr1 >= target.low && inr1 <= target.high;
    const both2InRange = inr2 >= target.low && inr2 <= target.high;

    if (both1InRange && both2InRange) {
      inRangeDays += days;
    } else if (both1InRange || both2InRange) {
      inRangeDays += days * 0.5;
    }
  }

  if (totalDays === 0) return null;
  return Math.round((inRangeDays / totalDays) * 100);
}

function renderHistory() {
  const section = document.querySelector("#history-section");
  const tableRoot = document.querySelector("#history-table-root");
  const chartRoot = document.querySelector("#history-chart");
  const history = loadHistory();

  if (history.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "";
  const targetKey = document.querySelector("#target-range").value;
  const target = TARGETS[targetKey] ?? TARGETS.standard;
  const ttr = calculateTTR(history, target);

  const ttrHtml = ttr !== null
    ? `<div style="margin-bottom:12px">
        <strong style="font-size:0.84rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)">TTR (Terapötik Aralıkta Kalma)</strong>
        <span class="ttr-badge ${ttr >= 60 ? "ttr-good" : "ttr-warn"}">${ttr}%</span>
        ${ttr < 60 ? '<small style="color:var(--alert);margin-left:8px">TTR < %60: Alternatif antikoagülan değerlendirmesi düşünülebilir</small>' : ""}
       </div>`
    : "";

  const last10 = history.slice(-10).reverse();
  const rows = last10.map((h) => `
    <tr>
      <td>${formatDate(h.date)}</td>
      <td>${formatNumber(h.inr, 1)}</td>
      <td>${formatNumber(h.weeklyDose, 1)}</td>
      <td>${formatNumber(h.recommendation, 1)}</td>
    </tr>
  `).join("");

  tableRoot.innerHTML = `
    ${ttrHtml}
    <table class="history-table">
      <thead>
        <tr>
          <th>Tarih</th>
          <th>INR</th>
          <th>Mevcut Doz</th>
          <th>Onerilen Doz</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  renderHistoryChart(history, target, chartRoot);
}

function renderHistoryChart(history, target, container) {
  const sorted = [...history]
    .filter((h) => h.date && h.inr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20);

  if (sorted.length < 2) {
    container.innerHTML = "";
    return;
  }

  const canvas = container.querySelector("canvas") || document.createElement("canvas");
  if (!container.contains(canvas)) {
    container.innerHTML = "";
    container.appendChild(canvas);
  }

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth || 600;
  const height = 200;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const inrValues = sorted.map((h) => h.inr);
  const minInr = Math.min(...inrValues, target.low - 0.5);
  const maxInr = Math.max(...inrValues, target.high + 0.5);

  const xScale = (i) => pad.left + (i / (sorted.length - 1)) * cw;
  const yScale = (v) => pad.top + ch - ((v - minInr) / (maxInr - minInr)) * ch;

  const style = getComputedStyle(document.documentElement);
  const goodColor = style.getPropertyValue("--good").trim() || "#235f49";
  const accentColor = style.getPropertyValue("--accent").trim() || "#145c6d";
  const mutedColor = style.getPropertyValue("--muted").trim() || "#5f7278";
  const inkColor = style.getPropertyValue("--ink").trim() || "#20313a";

  ctx.fillStyle = `${goodColor}18`;
  ctx.beginPath();
  ctx.rect(pad.left, yScale(target.high), cw, yScale(target.low) - yScale(target.high));
  ctx.fill();

  ctx.strokeStyle = `${goodColor}60`;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, yScale(target.low));
  ctx.lineTo(pad.left + cw, yScale(target.low));
  ctx.moveTo(pad.left, yScale(target.high));
  ctx.lineTo(pad.left + cw, yScale(target.high));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  sorted.forEach((h, i) => {
    const x = xScale(i);
    const y = yScale(h.inr);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  sorted.forEach((h, i) => {
    const x = xScale(i);
    const y = yScale(h.inr);
    const inRange = h.inr >= target.low && h.inr <= target.high;
    ctx.fillStyle = inRange ? goodColor : accentColor;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = mutedColor;
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  const step = Math.max(1, Math.floor(sorted.length / 6));
  sorted.forEach((h, i) => {
    if (i % step === 0 || i === sorted.length - 1) {
      const label = h.date.slice(5);
      ctx.fillText(label, xScale(i), height - 6);
    }
  });

  ctx.textAlign = "right";
  const yTicks = 5;
  for (let t = 0; t <= yTicks; t++) {
    const val = minInr + ((maxInr - minInr) * t) / yTicks;
    ctx.fillStyle = mutedColor;
    ctx.fillText(val.toFixed(1), pad.left - 6, yScale(val) + 4);
  }
}

// ─── DOM References ─────────────────────────────────────────────────

const form = document.querySelector("#warfarin-form");
const patternInput = document.querySelector("#pattern-input");
const parsePatternButton = document.querySelector("#parse-pattern");
const weekGrid = document.querySelector("#week-grid");
const weeklySummary = document.querySelector("#weekly-summary");
const resultRoot = document.querySelector("#result-root");
const currentDateInput = document.querySelector("#current-date");
const tabletStrengthInput = document.querySelector("#tablet-strength");
const themeToggle = document.querySelector("#theme-toggle");
const drugInput = document.querySelector("#drug-input");
const clearHistoryButton = document.querySelector("#clear-history");

// ─── Language Toggle ─────────────────────────────────────────────────

let _appLang = 'tr';
window.toggleLang = function() {
  _appLang = _appLang === 'tr' ? 'en' : 'tr';
  const btn = document.getElementById('langBtn');
  if (btn) btn.textContent = _appLang === 'tr' ? 'EN' : 'TR';
  document.documentElement.lang = _appLang;
  document.querySelectorAll('[data-tr]').forEach(el => {
    el.textContent = el.getAttribute('data-' + _appLang);
  });

  // Footer update
  const ft = document.getElementById('footer-text');
  if (ft) ft.textContent = _appLang === 'en' ? 'All rights reserved.' : 'Tüm hakları saklıdır.';
  const labels = {
    en: { privacy: 'Privacy', terms: 'Terms', about: 'About', disclaimer: 'Disclaimer' },
    tr: { privacy: 'Gizlilik', terms: 'Şartlar', about: 'Hakkımızda', disclaimer: 'Sorumluluk Reddi' }
  };
  const l = labels[_appLang];
  if (document.getElementById('link-privacy')) {
    document.getElementById('link-privacy').textContent = l.privacy;
    document.getElementById('link-terms').textContent = l.terms;
    document.getElementById('link-about').textContent = l.about;
    document.getElementById('link-disclaimer').textContent = l.disclaimer;
  }
}

// ─── Theme ──────────────────────────────────────────────────────────

function initTheme() {
  const stored = localStorage.getItem("varfarin_theme");
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("varfarin_theme", next);
}

// ─── Weekly Grid ────────────────────────────────────────────────────

function createWeekGrid() {
  weekGrid.innerHTML = "";

  DAYS.forEach((day, index) => {
    const cell = document.createElement("div");
    cell.className = "dose-cell";
    cell.innerHTML = `
      <label>
        <span class="dose-day">${day.short}</span>
        <input
          type="number"
          min="0"
          step="0.5"
          value="1"
          data-day-index="${index}"
          aria-label="${day.long} dozu"
        />
      </label>
    `;
    weekGrid.appendChild(cell);
  });
}

function readWeeklySchedule() {
  return [...weekGrid.querySelectorAll("input")].map((input) => Number(input.value));
}

function writeWeeklySchedule(schedule) {
  const inputs = [...weekGrid.querySelectorAll("input")];
  inputs.forEach((input, index) => {
    input.value = schedule[index] ?? 0;
  });
  updateWeeklySummary();
}

function updateWeeklySummary() {
  const tabletStrengthMg = Number(tabletStrengthInput.value || 5);
  const weeklyTablets = sumSchedule(readWeeklySchedule());
  const weeklyMg = tabletsToMg(weeklyTablets, tabletStrengthMg);
  weeklySummary.textContent = `Haftalik toplam: ${formatNumber(weeklyTablets, 2)} tablet (${formatMg(weeklyMg)})`;
}

// ─── Render Helpers ─────────────────────────────────────────────────

function renderMessage(message, variant = "empty") {
  const className =
    variant === "warning"
      ? "warning-banner"
      : variant === "success"
        ? "success-banner"
        : "empty-state";

  resultRoot.innerHTML = `<div class="${className}">${message}</div>`;
}

function renderHighRisk(result) {
  resultRoot.innerHTML = `
    <div class="result-panel">
      <div class="warning-banner">
        <strong>&#9888; ${result.title}</strong><br />
        ${result.message}
      </div>
      <div class="metric-card">
        <strong>Ne yapilmali?</strong>
        <ul class="reason-list">
          ${result.guidance.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
  resultRoot.focus();
}

function buildTrendHtml(currentInr, previousInr) {
  if (!Number.isFinite(previousInr)) return "";

  const diff = currentInr - previousInr;
  let arrow, cls;
  if (Math.abs(diff) < 0.15) {
    arrow = "&#8594;";
    cls = "stable";
  } else if (diff > 0) {
    arrow = "&#8593;";
    cls = "up";
  } else {
    arrow = "&#8595;";
    cls = "down";
  }

  return `<span class="inr-trend">(${formatNumber(previousInr, 1)} <span class="trend-arrow ${cls}">${arrow}</span> ${formatNumber(currentInr, 1)})</span>`;
}

function severityLabel(severity) {
  if (severity === "major") return "majör";
  if (severity === "moderate") return "orta";
  return "minör";
}

function directionLabel(direction) {
  if (direction === "increase") return "INR artışı";
  if (direction === "decrease") return "INR düşüşü";
  if (direction === "bleeding") return "kanama riski";
  if (direction === "monitor") return "izlem";
  return "değişken etki";
}

function renderInteractionHtml(interactions, hasDrugText) {
  if (interactions.length > 0) {
    return `<div class="interaction-banner">
      <strong>&#9888; İlaç / takviye etkileşim uyarısı</strong>
      <ul class="reason-list">
        ${interactions.map((drug) => `
          <li>
            <strong>${drug.name}</strong>
            <span class="interaction-tag">${severityLabel(drug.severity)} / ${directionLabel(drug.direction)}</span><br />
            ${drug.note} <em>${drug.action}</em>
            <small>${drug.mechanism}</small>
          </li>
        `).join("")}
      </ul>
      <div class="source-note">Yeni başlanan, kesilen veya düzensiz alınan her ilaçta INR takibini sıklaştırın.</div>
    </div>`;
  }

  if (hasDrugText) {
    return `<div class="interaction-info">
      Girilen ilaçlarda yerleşik listede yüksek-risk eşleşme bulunmadı. Liste tüm etkileşimleri kapsamaz; yeni başlama/kesme, antibiyotik, antifungal, NSAID, antiplatelet, takviye veya belirgin diyet değişiminde INR takibini sıklaştırın.
    </div>`;
  }

  return "";
}

function renderResult(result, tabletStrengthMg, interactions, hasDrugText) {
  const adjustedText =
    result.adjustmentPercent === 0
      ? "Doz degisikligi yok"
      : `${result.adjustmentPercent > 0 ? "Artis" : "Azalis"} ${Math.abs(result.adjustmentPercent)}%`;

  const nextInrText = result.nextInrDate
    ? `${result.nextInrDays} gun sonra (${formatDate(result.nextInrDate)})`
    : `${result.nextInrDays} gun sonra`;

  const historyHtml = result.historySummary
    ? `
      <div class="metric-card">
        <strong>Ara donem kullanim</strong>
        <span>${result.historySummary.modeledDays} gun boyunca ${formatNumber(result.historySummary.totalTablets, 2)} tablet</span>
      </div>
    `
    : "";

  const trendHtml = buildTrendHtml(result.currentInr, result.previousInr);

  const interactionsHtml = renderInteractionHtml(interactions, hasDrugText);

  resultRoot.innerHTML = `
    <div class="result-panel">
      ${interactionsHtml}

      <div class="result-banner">
        <strong>&#10003; Durum:</strong> Bugunku INR ${formatNumber(result.currentInr, 1)} ve sonuc ${result.statusLabel}. ${trendHtml}<br />
        <strong>Hemen yapilacak:</strong> ${result.immediateAction}
      </div>

      <div class="result-actions">
        <button type="button" class="secondary-button small-button" id="copy-result">Kopyala</button>
        <button type="button" class="secondary-button small-button" id="print-result">Yazdir</button>
      </div>

      <div class="result-grid">
        <div class="metric-card">
          <strong>Temel haftalik doz</strong>
          <span>${formatNumber(result.basisWeeklyDoseTablets, 2)} tablet (${formatMg(result.basisWeeklyDoseMg)})</span>
        </div>
        <div class="metric-card">
          <strong>Onerilen degisim</strong>
          <span>${adjustedText}</span>
        </div>
        <div class="metric-card">
          <strong>Yeni haftalik doz</strong>
          <span>${formatNumber(result.recommendedWeeklyTablets, 2)} tablet (${formatMg(result.recommendedWeeklyMg)})</span>
        </div>
        <div class="metric-card">
          <strong>Sonraki INR</strong>
          <span>${nextInrText}</span>
        </div>
        ${historyHtml}
        <div class="metric-card">
          <strong>Hedef aralik</strong>
          <span>${TARGETS[result.target.key].label}</span>
        </div>
      </div>

      <div class="metric-card">
        <strong>Onerilen 7 gunluk kullanim</strong>
        <div>${describeSchedule(result.recommendedSchedule, tabletStrengthMg)}</div>
        <ul class="schedule-list">
          ${result.recommendedSchedule
            .map((dose, index) => {
              const mg = tabletsToMg(dose, tabletStrengthMg);
              return `<li>${DAYS[index].long}: ${formatTablets(dose)} tablet (${formatMg(mg)})</li>`;
            })
            .join("")}
        </ul>
      </div>

      <div class="metric-card">
        <strong>Kararin gerekcesi</strong>
        <ul class="reason-list">
          ${result.reasons.map((reason) => `<li>${reason}</li>`).join("")}
        </ul>
      </div>

      <div class="success-banner">
        &#10003; Uygulama, yarim tablet adimlariyla dengeli bir 7 gunluk plan uretir. Klinik
        yargiyla mevcut tablet gucune ve hastanin uyum kapasitesine gore sadelestirme yapabilirsiniz.
      </div>
    </div>
  `;

  resultRoot.focus();

  document.querySelector("#copy-result").addEventListener("click", copyResult);
  document.querySelector("#print-result").addEventListener("click", () => window.print());
}

function copyResult() {
  const panel = resultRoot.querySelector(".result-panel");
  if (!panel) return;

  const text = panel.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector("#copy-result");
    const original = btn.textContent;
    btn.textContent = "Kopyalandi!";
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}

// ─── Pattern Parsing ────────────────────────────────────────────────

function parsePatternIntoWeek() {
  const tabletStrengthMg = Number(tabletStrengthInput.value || 5);
  const parsed = parseDosePattern(patternInput.value, tabletStrengthMg);

  if (!parsed.ok) {
    renderMessage(parsed.error, "warning");
    return;
  }

  const weeklySchedule = expandPattern(parsed.cycle, 7);
  writeWeeklySchedule(weeklySchedule);
  renderMessage("Patern cozuldu ve 7 gunluk tabloya aktarildi. Isterseniz hucreleri elle duzeltebilirsiniz.", "success");
}

// ─── Form Submit ────────────────────────────────────────────────────

function handleSubmit(event) {
  event.preventDefault();

  const targetKey = document.querySelector("#target-range").value;
  const tabletStrengthMg = Number(document.querySelector("#tablet-strength").value);
  const currentInr = Number(document.querySelector("#current-inr").value);
  const currentDate = document.querySelector("#current-date").value;
  const previousInrRaw = document.querySelector("#previous-inr").value;
  const previousInr = previousInrRaw ? Number(previousInrRaw) : undefined;
  const previousDate = document.querySelector("#previous-date").value;
  const intervalPattern = document.querySelector("#interval-pattern").value;
  const transientFactor = document.querySelector("#transient-factor").value;
  const activeBleeding = document.querySelector("#active-bleeding").checked;
  const highBleedingRisk = document.querySelector("#high-bleeding-risk").checked;
  const weeklySchedule = readWeeklySchedule();

  const result = analyzeWarfarinCase({
    targetKey,
    tabletStrengthMg,
    currentInr,
    currentDate,
    previousInr,
    previousDate,
    weeklySchedule,
    intervalPattern,
    transientFactor,
    activeBleeding,
    highBleedingRisk
  });

  if (!result.ok) {
    renderMessage(result.errors.join("<br />"), "warning");
    return;
  }

  if (result.highRisk) {
    renderHighRisk(result);
    return;
  }

  const interactions = checkDrugInteractions(drugInput.value);
  renderResult(result, tabletStrengthMg, interactions, Boolean(drugInput.value.trim()));

  addHistoryEntry({
    date: currentDate,
    inr: currentInr,
    weeklyDose: result.basisWeeklyDoseTablets,
    recommendation: result.recommendedWeeklyTablets
  });

  renderHistory();
}

// ─── Quick Patterns ─────────────────────────────────────────────────

function handleQuickPattern(event) {
  const btn = event.target.closest("[data-pattern]");
  if (!btn) return;
  patternInput.value = btn.dataset.pattern;
  parsePatternIntoWeek();
}

// ─── Init ───────────────────────────────────────────────────────────

initTheme();
createWeekGrid();
currentDateInput.value = isoDateToday();
writeWeeklySchedule(expandPattern([1], 7));
renderHistory();

weekGrid.addEventListener("input", updateWeeklySummary);
tabletStrengthInput.addEventListener("input", updateWeeklySummary);
parsePatternButton.addEventListener("click", parsePatternIntoWeek);
form.addEventListener("submit", handleSubmit);
themeToggle.addEventListener("click", toggleTheme);
clearHistoryButton.addEventListener("click", clearHistory);
document.querySelector(".quick-patterns").addEventListener("click", handleQuickPattern);
