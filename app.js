// Lumina site: language toggle (ko/en) + download browser fed by GitHub Releases.
(function () {
  "use strict";

  const REPO = "aruru10313/Lumina";
  // Minecraft versions with an upstream Folia branch, newest first.
  const TARGETS = ["26.3", "26.2", "26.1.2", "1.21.11", "1.21.8", "1.21.7", "1.21.6", "1.21.5", "1.21.4", "1.20.6", "1.20.4"];

  const S = {
    ko: { build: "빌드", date: "날짜", commit: "커밋", size: "크기", file: "파일", sha: "SHA-256", dl: "다운로드",
          latest: "최신", none: "준비 중", noneT: "아직 빌드가 없어요", noneD: "이 버전은 지금 포팅 중이에요. 완료되면 여기에 자동으로 나타납니다.",
          notes: "릴리스 노트", copy: "복사", copied: "복사됨", run: "실행 예시",
          err: "빌드 목록을 불러오지 못했어요.", errLink: "GitHub Releases에서 받기", javaReq: "Java {v} 이상", unofficial: "PaperMC 공식 빌드가 아닙니다. 문제는 Lumina 저장소에 알려 주세요." },
    en: { build: "Build", date: "Date", commit: "Commit", size: "Size", file: "File", sha: "SHA-256", dl: "Download",
          latest: "Latest", none: "Soon", noneT: "No builds yet", noneD: "This version is being ported. It will show up here automatically once released.",
          notes: "Release notes", copy: "Copy", copied: "Copied", run: "Example",
          err: "Couldn't load the build list.", errLink: "Download from GitHub Releases", javaReq: "Java {v}+", unofficial: "Not an official PaperMC build. Report problems to the Lumina repository." }
  };

  const root = document.documentElement;
  const L = () => (root.lang === "en" ? "en" : "ko");
  const s = (k) => S[L()][k];
  const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const vlist = document.getElementById("vlist");
  const vdetail = document.getElementById("vdetail");

  // language toggle (present on every page)
  document.querySelectorAll("[data-toggle-lang]").forEach((b) => b.addEventListener("click", () => {
    root.lang = L() === "ko" ? "en" : "ko";
    localStorage.setItem("lumina.lang", root.lang);
    if (vlist) render();
  }));

  if (!vlist) return; // not the downloads page

  let byVer = null;   // { "26.3": [build, ...] }
  let failed = false;
  let current = TARGETS[0];

  function javaFor(mc) {
    const [a, b, c] = mc.split(".").map(Number);
    if (a >= 26) return 25;
    if (a === 1 && (b > 20 || (b === 20 && (c || 0) >= 5))) return 21;
    return 17;
  }
  function cmpVer(x, y) {
    const a = x.split(".").map(Number), b = y.split(".").map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (b[i] || 0) - (a[i] || 0); if (d) return d; }
    return 0;
  }
  const fmtSize = (n) => (n / 1048576).toFixed(1) + " MB";
  const fmtDate = (d) => new Date(d).toLocaleDateString(L() === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  const family = (v) => (v.startsWith("1.") ? v.split(".").slice(0, 2).join(".") : v.split(".")[0] + ".x");
  const versions = () => [...new Set([...TARGETS, ...Object.keys(byVer || {})])].sort(cmpVer);

  function renderList() {
    let html = "", lastFam = "";
    for (const v of versions()) {
      const f = family(v);
      if (f !== lastFam) { html += `<div class="grp">${esc(f)}</div>`; lastFam = f; }
      const builds = byVer && byVer[v];
      const tag = builds ? `#${builds[0].build}` : (byVer ? s("none") : "");
      html += `<button type="button" class="${v === current ? "on" : ""} ${byVer && !builds ? "none" : ""}" data-v="${esc(v)}"><span>${esc(v)}</span><span class="b">${esc(tag)}</span></button>`;
    }
    vlist.innerHTML = html;
    vlist.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      current = b.dataset.v;
      history.replaceState(null, "", "#v" + current);
      render();
    }));
  }

  function renderDetail() {
    if (failed) {
      vdetail.innerHTML = `<div class="empty"><h3>${esc(s("err"))}</h3><a class="btn" href="https://github.com/${REPO}/releases">${esc(s("errLink"))}</a></div>`;
      return;
    }
    if (!byVer) return;
    const v = current, builds = byVer[v] || [];
    const java = s("javaReq").replace("{v}", javaFor(v));
    if (!builds.length) {
      vdetail.innerHTML = `<div class="vtitle"><h3>Lumina ${esc(v)}</h3><span class="chip">${esc(java)}</span></div>
        <div class="empty"><h3>${esc(s("noneT"))}</h3><p>${esc(s("noneD"))}</p></div>`;
      return;
    }
    const b = builds[0];
    const newest = versions().find((x) => byVer[x]);
    const runCmd = `java -Xms4G -Xmx4G -jar ${b.name} --nogui`;
    vdetail.innerHTML = `
      <div class="vtitle"><h3>Lumina ${esc(v)}</h3>
        ${v === newest ? `<span class="chip ok">${esc(s("latest"))}</span>` : ""}
        <span class="chip">${esc(java)}</span></div>
      <dl class="kv">
        <dt>${esc(s("build"))}</dt><dd>#${b.build} · ${esc(fmtDate(b.date))}</dd>
        <dt>${esc(s("file"))}</dt><dd>${esc(b.name)} (${esc(fmtSize(b.size))})</dd>
        ${b.sha ? `<dt>${esc(s("sha"))}</dt><dd title="${esc(b.sha)}">${esc(b.sha)}</dd>` : ""}
        ${b.commit ? `<dt>${esc(s("commit"))}</dt><dd><a href="https://github.com/${REPO}/commit/${esc(b.commit)}">${esc(b.commit.slice(0, 10))}</a></dd>` : ""}
      </dl>
      <div class="dlrow">
        <a class="btn primary" href="${esc(b.url)}">${esc(s("dl"))}</a>
        <a class="btn sm" href="${esc(b.page)}" target="_blank" rel="noopener">${esc(s("notes"))}</a>
      </div>
      <div class="runbox"><div class="small muted">${esc(s("run"))} <button type="button" class="copy" data-copy="${esc(runCmd)}">${esc(s("copy"))}</button></div>
        <div class="term" style="display:block;padding:10px 14px;margin-top:6px;white-space:pre-wrap">${esc(runCmd)}</div></div>
      <table class="builds">
        <thead><tr><th>${esc(s("build"))}</th><th>${esc(s("date"))}</th><th>${esc(s("commit"))}</th><th>${esc(s("size"))}</th><th></th></tr></thead>
        <tbody>${builds.slice(0, 15).map((o) => `<tr>
          <td>#${o.build}</td><td class="m">${esc(fmtDate(o.date))}</td>
          <td class="m">${o.commit ? `<a href="https://github.com/${REPO}/commit/${esc(o.commit)}">${esc(o.commit.slice(0, 7))}</a>` : "-"}</td>
          <td class="m">${esc(fmtSize(o.size))}</td>
          <td style="text-align:right"><a href="${esc(o.url)}">${esc(s("dl"))}</a></td></tr>`).join("")}</tbody>
      </table>
      <p class="small muted" style="margin-top:18px">${esc(s("unofficial"))}</p>`;
    vdetail.querySelectorAll("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = s("copied"); } catch (e) { /* ignore */ }
    }));
  }

  function render() { renderList(); renderDetail(); }

  async function load() {
    try {
      const all = [];
      for (let page = 1; page <= 5; page++) {
        const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`, { headers: { Accept: "application/vnd.github+json" } });
        if (!res.ok) throw new Error(String(res.status));
        const chunk = await res.json();
        all.push(...chunk);
        if (chunk.length < 100) break;
      }
      byVer = {};
      for (const r of all) {
        const m = /^lumina-(.+)-b(\d+)$/.exec(r.tag_name || "");
        if (!m || r.draft) continue;
        const jar = (r.assets || []).find((a) => a.name.endsWith(".jar"));
        if (!jar) continue;
        const sha = jar.digest && jar.digest.startsWith("sha256:") ? jar.digest.slice(7) : null;
        const commit = /^[0-9a-f]{40}$/.test(r.target_commitish || "") ? r.target_commitish : null;
        (byVer[m[1]] ||= []).push({ build: +m[2], date: r.published_at, name: jar.name, url: jar.browser_download_url, size: jar.size, sha, commit, page: r.html_url });
      }
      for (const k in byVer) byVer[k].sort((a, b) => b.build - a.build);
    } catch (e) {
      failed = true;
    }
    const want = decodeURIComponent((location.hash.match(/^#v(.+)$/) || [])[1] || "");
    current = versions().includes(want) ? want : (versions().find((v) => byVer && byVer[v]) || versions()[0]);
    render();
  }

  render();
  load();
})();
