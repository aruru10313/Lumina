// Lumina stats page: site clicks (Cloudflare Worker) vs GitHub release downloads.
(function () {
  "use strict";
  const STATS = "https://lumina-stats.aruru.kr/stats";
  const REPO = "aruru10313/Lumina";
  const root = document.documentElement;
  const L = () => (root.lang === "en" ? "en" : "ko");
  const T = {
    ko: { clicks: "사이트 클릭", clicksH: "버튼을 직접 누른 사람", gh: "GitHub jar 다운로드", ghH: "봇과 다른 경로 포함", sha: "검증 파일 다운로드", shaH: "대부분 봇이 함께 받아 가요",
          none: "아직 데이터가 없어요", updated: "업데이트", err: "데이터를 불러오지 못했어요.", clickUnit: "클릭" },
    en: { clicks: "Site clicks", clicksH: "People who pressed the button", gh: "GitHub jar downloads", ghH: "Includes bots and other routes", sha: "Checksum downloads", shaH: "Mostly fetched by bots",
          none: "No data yet", updated: "Updated", err: "Couldn't load the data.", clickUnit: "clicks" },
  };
  const t = (k) => T[L()][k];
  const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n).toLocaleString(L() === "ko" ? "ko-KR" : "en-US");
  const cmpVer = (x, y) => { const a = x.split(".").map(Number), b = y.split(".").map(Number); for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (b[i] || 0) - (a[i] || 0); if (d) return d; } return 0; };

  let data = null;

  async function load() {
    try {
      const [stats, rel] = await Promise.all([
        fetch(STATS, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
        fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      ]);
      const gh = {};
      for (const r of rel) {
        const m = /^lumina-(.+)-b\d+$/.exec(r.tag_name || "");
        if (!m) continue;
        const row = (gh[m[1]] ||= { jar: 0, sha: 0 });
        for (const a of r.assets || []) {
          if (a.name.endsWith(".jar")) row.jar += a.download_count;
          else if (a.name.endsWith(".sha256")) row.sha += a.download_count;
        }
      }
      data = { stats, gh, at: new Date() };
    } catch (e) {
      data = { error: true };
    }
    render();
  }

  function renderTiles(totClicks, totJar, totSha) {
    const tile = (n, l, h) => `<div class="tile"><div class="n">${fmt(n)}</div><div class="l">${esc(l)}</div><div class="h">${esc(h)}</div></div>`;
    document.getElementById("tiles").innerHTML =
      tile(totClicks, t("clicks"), t("clicksH")) + tile(totJar, t("gh"), t("ghH")) + tile(totSha, t("sha"), t("shaH"));
  }

  function renderChart(days) {
    const svg = document.getElementById("chart");
    const tip = document.getElementById("tip");
    const W = svg.clientWidth || 800, H = 220, padL = 28, padB = 22, padT = 8;
    // last 30 UTC days, oldest first
    const list = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      list.push([d, days[d] || 0]);
    }
    const max = Math.max(1, ...list.map(([, n]) => n));
    const step = Math.max(1, Math.ceil(max / 4));
    const top = step * Math.ceil(max / step);
    const cw = (W - padL) / list.length;
    const bw = Math.max(3, Math.min(18, cw - 4));
    const y = (n) => padT + (H - padT - padB) * (1 - n / top);
    let g = "";
    for (let v = 0; v <= top; v += step) {
      g += `<line x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="#262832" stroke-width="1"/>`;
      g += `<text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" fill="#646778" font-size="11">${v}</text>`;
    }
    list.forEach(([d, n], i) => {
      const x = padL + i * cw + (cw - bw) / 2;
      const yy = y(n), h = Math.max(0, H - padB - yy);
      if (n > 0) {
        const r = Math.min(4, bw / 2, h);
        g += `<path d="M${x},${H - padB} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${H - padB} Z" fill="#8fb4ff"/>`;
      }
      g += `<rect x="${padL + i * cw}" y="${padT}" width="${cw}" height="${H - padT - padB}" fill="transparent" data-i="${i}"/>`;
      if (i % 5 === 4 || i === list.length - 1) {
        g += `<text x="${padL + i * cw + cw / 2}" y="${H - 6}" text-anchor="middle" fill="#646778" font-size="11">${d.slice(5)}</text>`;
      }
    });
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = g;
    svg.querySelectorAll("rect[data-i]").forEach((r) => {
      r.addEventListener("mouseenter", () => {
        const [d, n] = list[+r.dataset.i];
        tip.innerHTML = `${esc(d)} · <b>${fmt(n)}</b> ${esc(t("clickUnit"))}`;
        const box = svg.getBoundingClientRect();
        tip.style.left = ((padL + (+r.dataset.i + 0.5) * cw) / W * box.width + 18) + "px";
        tip.style.top = (y(n) / H * box.height + 18) + "px";
        tip.style.display = "block";
      });
      r.addEventListener("mouseleave", () => { tip.style.display = "none"; });
    });
    document.getElementById("day-body").innerHTML = list.slice().reverse().filter(([, n]) => n > 0)
      .map(([d, n]) => `<tr><td>${esc(d)}</td><td class="num">${fmt(n)}</td></tr>`).join("") || `<tr><td colspan="2" class="muted">${esc(t("none"))}</td></tr>`;
  }

  function render() {
    if (!data) return;
    if (data.error) {
      document.getElementById("ver-body").innerHTML = `<tr><td colspan="5" class="muted">${esc(t("err"))}</td></tr>`;
      return;
    }
    const { stats, gh } = data;
    const versions = [...new Set([...Object.keys(gh), ...Object.keys(stats.versions || {})])].sort(cmpVer);
    let tc = 0, tj = 0, ts = 0;
    document.getElementById("ver-body").innerHTML = versions.map((v) => {
      const c = (stats.versions || {})[v] || 0, j = (gh[v] || {}).jar || 0, sh = (gh[v] || {}).sha || 0;
      tc += c; tj += j; ts += sh;
      return `<tr><td>${esc(v)}</td><td class="num">${fmt(c)}</td><td class="num">${fmt(j)}</td><td class="num">${fmt(sh)}</td><td class="num">${fmt(Math.max(0, j - c))}</td></tr>`;
    }).join("") || `<tr><td colspan="5" class="muted">${esc(t("none"))}</td></tr>`;
    renderTiles(tc, tj, ts);
    renderChart(stats.days || {});
    document.getElementById("updated").textContent = `${t("updated")}: ${data.at.toLocaleString(L() === "ko" ? "ko-KR" : "en-US")}`;
  }

  new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("resize", () => { if (data && !data.error) renderChart(data.stats.days || {}); });
  load();
})();
