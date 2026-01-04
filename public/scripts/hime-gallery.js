const BASE = "https://akadra-family.com";
const INDEX_URL = `${BASE}/photos/hime/index.json`;

async function main() {
  const gallery = document.getElementById("gallery");
  const countEl = document.getElementById("photoCount");
  const updatedEl = document.getElementById("updatedAt");

  const res = await fetch(INDEX_URL, { cache: "no-store" });
  if (!res.ok) {
    gallery.textContent = `index.json 読み込み失敗: ${res.status}`;
    return;
  }

  const data = await res.json();
  const items = data.items ?? [];

  // スケルトン消す
  gallery.innerHTML = "";

  countEl && (countEl.textContent = String(items.length));
  if (updatedEl) updatedEl.textContent = (data.updatedAt ?? "-");

  for (const item of items) {
    const url = `${BASE}/${item.key}`;

    const shot = document.createElement("div");
    shot.className = "shot";

    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";
    img.alt = "hime photo";

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    shot.appendChild(img);
    shot.appendChild(overlay);
    gallery.appendChild(shot);
  }
}

main();
