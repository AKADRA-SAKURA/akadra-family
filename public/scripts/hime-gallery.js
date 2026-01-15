const BASE = "https://akadra-family.com";
const INDEX_URL = `${BASE}/photos/hime/index.json`;

// 誕生日（姫芽） ※必要ならpetごとに分けてもOK
const BIRTHDAY = { year: 2025, month: 2, day: 16 };

// Lightbox elements (hime.astro側に用意しておく)
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

function openLightbox(src, alt = "") {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
}
function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImg.src = "";
}
if (lightbox) lightbox.addEventListener("click", closeLightbox);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// ---- date helpers ----
function fmtYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function ageRangeLabel(ageYear) {
  // 0歳: birthday〜birthday+1y-1day
  // 1歳: birthday+1y〜birthday+2y-1day
  const start = new Date(BIRTHDAY.year + ageYear, BIRTHDAY.month - 1, BIRTHDAY.day);
  const end = addDays(new Date(BIRTHDAY.year + ageYear + 1, BIRTHDAY.month - 1, BIRTHDAY.day), -1);
  return `${ageYear}歳（${fmtYMD(start)}～${fmtYMD(end)}）`;
}

// ---- UI builders ----
function createShot(url, alt) {
  const shot = document.createElement("div");
  shot.className = "shot";

  const img = document.createElement("img");
  img.src = url;
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = alt;

  img.addEventListener("click", (e) => {
    e.stopPropagation();
    openLightbox(url, img.alt);
  });

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  shot.appendChild(img);
  shot.appendChild(overlay);
  return shot;
}

// sticky chips bar（CSSはJSから最小付与。気に入ったらastro側に移してOK）
function createChipsBar() {
  const bar = document.createElement("div");
  bar.id = "ageChips";
  bar.style.position = "sticky";
  bar.style.top = "10px";
  bar.style.zIndex = "30";
  bar.style.margin = "12px 0 10px";
  bar.style.padding = "10px";
  bar.style.borderRadius = "18px";
  bar.style.border = "1px solid rgba(120,90,70,.18)";
  bar.style.background = "rgba(255,255,255,.85)";
  bar.style.backdropFilter = "blur(10px)";
  bar.style.boxShadow = "0 10px 22px rgba(50,35,25,.10)";
  bar.style.display = "flex";
  bar.style.flexWrap = "wrap";
  bar.style.gap = "8px";
  return bar;
}

function makeChip(label, onClick) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.textContent = label;
  chip.style.cursor = "pointer";
  chip.style.border = "1px solid rgba(120,90,70,.18)";
  chip.style.background = "#fff";
  chip.style.borderRadius = "999px";
  chip.style.padding = "8px 10px";
  chip.style.fontSize = "12px";
  chip.style.fontWeight = "850";
  chip.style.color = "rgba(59,47,42,.82)";
  chip.style.boxShadow = "0 6px 14px rgba(50,35,25,.08)";
  chip.addEventListener("click", onClick);
  return chip;
}

function setChipActive(chip, active) {
  chip.dataset.active = active ? "1" : "0";
  chip.style.borderColor = active ? "rgba(198,132,68,.45)" : "rgba(120,90,70,.18)";
  chip.style.background = active ? "linear-gradient(180deg, #ffedd1, #ffe2bd)" : "#fff";
}

function observeSectionsAndSyncChips(sectionIds, chipMap) {
  // どのセクションが中央付近にいるかでactiveを切替
  const observer = new IntersectionObserver(
    (entries) => {
      // 画面に一番出てるやつを選ぶ（intersectionRatio最大）
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const id = visible.target.id;
      for (const [sid, chip] of chipMap.entries()) {
        setChipActive(chip, sid === id);
      }
    },
    {
      // 上のstickyバーの分を少し避ける
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: [0.05, 0.15, 0.3, 0.5, 0.75],
    }
  );

  sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

async function main() {
  const galleryRoot = document.getElementById("gallery");
  const countEl = document.getElementById("photoCount");
  const updatedEl = document.getElementById("updatedAt");

  if (!galleryRoot) return;

  const res = await fetch(INDEX_URL, { cache: "no-store" });
  if (!res.ok) {
    galleryRoot.textContent = `index.json 読み込み失敗: ${res.status}`;
    return;
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  // スケルトン消す
  galleryRoot.innerHTML = "";

  if (countEl) countEl.textContent = String(items.length);
  if (updatedEl) updatedEl.textContent = data.updatedAt ?? "-";

  // age_yearが無いものは「不明」に寄せる
  for (const it of items) {
    if (typeof it.age_year !== "number") it.age_year = -1;
  }

  // --- group by age_year ---
  const groups = new Map();
  for (const it of items) {
    const k = it.age_year;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }

  // 年齢順（不明は最後）
  const ageKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === -1) return 1;
    if (b === -1) return -1;
    return a - b;
  });

  // 1枚もない年齢はそもそもgroupsに存在しないので表示されない ✅
  // ただし itemsが0なら何も出ない
  if (ageKeys.length === 0) {
    galleryRoot.textContent = "写真がありません。";
    return;
  }

  // --- sticky chips bar ---
  const chipsBar = createChipsBar();
  galleryRoot.appendChild(chipsBar);

  const chipMap = new Map(); // sectionId -> chip button
  const sectionIds = [];

  // --- render sections ---
  ageKeys.forEach((ageYear) => {
    const sectionId = ageYear === -1 ? "age-unknown" : `age-${ageYear}`;
    sectionIds.push(sectionId);

    const section = document.createElement("section");
    section.id = sectionId;
    section.style.marginTop = "18px";

    // 見出し
    const h = document.createElement("h3");
    h.style.margin = "10px 2px";
    h.style.fontSize = "14px";
    h.style.fontWeight = "900";
    h.style.color = "rgba(59,47,42,.78)";

    if (ageYear === -1) {
      h.textContent = "年齢不明";
    } else {
      h.textContent = ageRangeLabel(ageYear);
    }

    // タイルgrid（既存の.galleryスタイルを再利用）
    const grid = document.createElement("div");
    grid.className = "gallery";

    const groupItems = groups.get(ageYear) || [];
    groupItems.forEach((it, idx) => {
      const url = `${BASE}/${it.key}`;
      const shot = createShot(url, `hime photo ${ageYear}:${idx + 1}`);
      grid.appendChild(shot);
    });

    section.appendChild(h);
    section.appendChild(grid);
    galleryRoot.appendChild(section);

    // チップ追加
    const chipLabel =
      ageYear === -1
        ? "不明"
        : `${ageYear}歳 (${groupItems.length})`;
    const chip = makeChip(chipLabel, () => {
      const target = document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      // クリック直後の見た目も即反映
      for (const [sid, c] of chipMap.entries()) setChipActive(c, sid === sectionId);
    });

    // 最初の年齢をactiveに
    if (sectionIds.length === 1) setChipActive(chip, true);
    chipMap.set(sectionId, chip);
    chipsBar.appendChild(chip);
  });

  // スクロールに追随してactiveを切り替え
  observeSectionsAndSyncChips(sectionIds, chipMap);
}

main();
