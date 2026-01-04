// ★ここだけ自分のCloudFrontドメインに合わせてね（末尾スラッシュなし）
const CDN_BASE = "https://akadra-family.com";

const INDEX_URL = `${CDN_BASE}/photos/hime/index.json`;

async function main() {
  const gallery = document.getElementById("gallery");

  const res = await fetch(INDEX_URL, { cache: "no-store" });
  if (!res.ok) {
    gallery.textContent = `index.json 読み込み失敗: ${res.status}`;
    return;
  }

  const data = await res.json();
  const items = data.items ?? [];

  if (items.length === 0) {
    gallery.textContent = "写真がありません";
    return;
  }

  for (const item of items) {
    const url = `${CDN_BASE}/${item.key}`;

    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";
    img.alt = "hime photo";
    img.style.width = "100%";
    img.style.aspectRatio = "1 / 1";
    img.style.objectFit = "cover";
    img.style.borderRadius = "10px";

    gallery.appendChild(img);
  }
}

main();
