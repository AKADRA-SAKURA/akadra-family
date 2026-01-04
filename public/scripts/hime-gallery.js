const BASE = "https://akadra-family.com";
const INDEX_URL = `${BASE}/photos/hime/index.json`;

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

// Close handlers
if (lightbox) {
  lightbox.addEventListener("click", closeLightbox);
}
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

async function main() {
  const gallery = document.getElementById("gallery");
  const countEl = document.getElementById("photoCount");
  const updatedEl = document.getElementById("updatedAt");

  if (!gallery) return;

  const res = await fetch(INDEX_URL, { cache: "no-store" });
  if (!res.ok) {
    gallery.textContent = `index.json 読み込み失敗: ${res.status}`;
    return;
  }

  const data = await res.json();
  const items = data.items ?? [];

  // スケルトン消す
  gallery.innerHTML = "";

  if (countEl) countEl.textContent = String(items.length);
  if (updatedEl) updatedEl.textContent = (data.updatedAt ?? "-");

  for (const [i, item] of items.entries()) {
    const url = `${BASE}/${item.key}`;

    const shot = document.createElement("div");
    shot.className = "shot";

    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = `hime photo ${i + 1}`;

    // クリックでライトボックス
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      openLightbox(url, img.alt);
    });

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    shot.appendChild(img);
    shot.appendChild(overlay);
    gallery.appendChild(shot);
  }
}

main();
