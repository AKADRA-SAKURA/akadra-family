const BASE = "https://akadra-family.com";
// ✅ Chromeキャッシュ対策: クエリで必ず最新を取りに行く
const INDEX_URL = `${BASE}/photos/hime/index.json?t=${Date.now()}`;

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
  const start = new Date(
    BIRTHDAY.year + ageYear,
    BIRTHDAY.month - 1,
    BIRTHDAY.day
  );
  const end = addDays(
    new Date(BIRTHDAY.year + ageYear + 1, BIRTHDAY.month - 1, BIRTHDAY.day),
    -1
  );
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

function setChipActive(chip, active) {
  // ✅ astro側CSSが data-active="1" を見てスタイルを当てる
  chip.dataset.active = active ? "1" : "0";
}

function observeSectionsAndSyncChips(sectionIds, chipMap) {
  const observer = new IntersectionObserver(
    (entries) => {
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
      // ✅ stickyバー分を避ける（上20%は無視、下70%も無視気味）
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
  const galleryRoot = document.getElementById("gallery"); // .galleryRoot
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

  if (ageKeys.length === 0) {
    galleryRoot.textContent = "写真がありません。";
    return;
  }

  // --- sticky chips bar ---
  const chipsBar = document.createElement("div");
  chipsBar.id = "ageChips"; // ✅ astro側CSSでスタイルされる
  galleryRoot.appendChild(chipsBar);

  const chipMap = new Map(); // sectionId -> chip button
  const sectionIds = [];

  // --- render sections ---
  ageKeys.forEach((ageYear, sectionIndex) => {
    const groupItems = groups.get(ageYear) || [];
    if (groupItems.length === 0) return; // 念のため

    const sectionId = ageYear === -1 ? "age-unknown" : `age-${ageYear}`;
    sectionIds.push(sectionId);

    const section = document.createElement("section");
    section.id = sectionId;
    section.className = "ageBlock";

    // 見出し
    const h = document.createElement("h3");
    h.className = "ageTitle";
    h.textContent = ageYear === -1 ? "年齢不明" : ageRangeLabel(ageYear);

    // 件数バッジ（任意、かわいい）
    const badge = document.createElement("span");
    badge.className = "count";
    badge.textContent = `${groupItems.length}枚`;
    h.appendChild(badge);

    // ✅ 写真タイル専用グリッド（astro側CSSは .galleryGrid を想定）
    const grid = document.createElement("div");
    grid.className = "galleryGrid";

    groupItems.forEach((it, idx) => {
      const url = `${BASE}/${it.key}`;
      const shot = createShot(url, `hime photo ${ageYear}:${idx + 1}`);
      grid.appendChild(shot);
    });

    section.appendChild(h);
    section.appendChild(grid);
    galleryRoot.appendChild(section);

    // ---- chips ----
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent =
      ageYear === -1 ? `不明 (${groupItems.length})` : `${ageYear}歳 (${groupItems.length})`;

    chip.addEventListener("click", () => {
      const target = document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      // クリック直後にactive即反映
      for (const [sid, c] of chipMap.entries()) setChipActive(c, sid === sectionId);
    });

    // 最初のチップをactiveに
    if (sectionIndex === 0) setChipActive(chip, true);

    chipMap.set(sectionId, chip);
    chipsBar.appendChild(chip);
  });

  // スクロールに追随してactive切替
  observeSectionsAndSyncChips(sectionIds, chipMap);
}

main().catch((e) => {
  // 何か起きたら画面にも出るように（静かに死ぬのを防ぐ）
  const galleryRoot = document.getElementById("gallery");
  if (galleryRoot) {
    galleryRoot.textContent = `表示処理でエラー: ${e?.message || e}`;
  }
  console.error(e);
});
