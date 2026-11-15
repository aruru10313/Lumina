// Lumina site: i18n (ko/en) + live download list from GitHub Releases.
(function () {
  "use strict";

  const REPO = "aruru10313/Lumina";
  // Every Minecraft version that has an upstream Folia branch, newest first.
  // Versions without a release yet are shown as "coming soon".
  const TARGETS = ["26.3", "26.2", "26.1", "1.21.11", "1.21.8", "1.21.7", "1.21.6", "1.21.5", "1.21.4", "1.20.6", "1.20.4"];

  const T = {
    ko: {
      "nav.download": "다운로드", "nav.how": "동작 방식", "nav.config": "설정", "nav.risks": "주의사항",
      "hero.tagline": "Folia의 멀티스레딩 + 일반 Paper 플러그인 그대로",
      "hero.sub": "Lumina는 Folia 기반 비공식 서버입니다. folia-supported 표시가 없는 일반 Paper 플러그인도 로딩되고, 그런 플러그인의 동기 코드는 모든 지역을 잠깐 멈춘 상태에서 안전하게 실행됩니다.",
      "hero.cta": "다운로드", "hero.source": "소스 코드",
      "pill.1.t": "지역별 병렬 틱", "pill.1.d": "Folia 지원 플러그인과 월드는 원래처럼 지역마다 병렬로 돌아갑니다.",
      "pill.2.t": "일반 플러그인 호환", "pill.2.d": "BukkitScheduler, 동기 teleport, 스코어보드 API를 다시 쓸 수 있습니다.",
      "pill.3.t": "옵션 하나로 끄기", "pill.3.d": "<code>-Dfolia.legacyCompat=false</code> 하나면 순정 Folia처럼 동작합니다.",
      "dl.title": "다운로드",
      "dl.desc": "마인크래프트 버전을 골라 받으세요. 빌드는 GitHub Actions가 소스에서 직접 만들어 GitHub Releases에 올립니다.",
      "dl.loading": "빌드 목록을 불러오는 중…",
      "dl.error": "빌드 목록을 불러오지 못했어요. GitHub Releases 페이지에서 직접 받으세요.",
      "dl.latest": "최신", "dl.soon": "준비 중", "dl.build": "빌드", "dl.btn": "다운로드",
      "dl.older": "이전 빌드", "dl.notes": "릴리스 노트", "dl.java": "Java {v} 이상", "dl.notyet": "아직 이 버전 빌드가 없어요.",
      "dl.run": "실행: <code>java -Xms4G -Xmx4G -jar lumina-&lt;버전&gt;-b&lt;빌드&gt;.jar --nogui</code> · 처음 실행할 때 Mojang 서버 파일을 자동으로 받습니다. 파일 검증용 <code>.sha256</code>도 함께 올라가 있어요.",
      "how.title": "동작 방식",
      "how.intro": "핵심 코드는 <code>LegacyCompat</code> 하나입니다. 플러그인이 Folia를 지원하는지에 따라 두 가지 방식으로 나눠 실행합니다.",
      "how.folia.t": "Folia 지원 플러그인", "how.folia.d": "plugin.yml에 folia-supported: true가 있으면 Folia와 똑같이 각 지역 스레드에서 병렬로 실행됩니다. 성능 손해가 없습니다.",
      "how.legacy.t": "일반 Paper 플러그인", "how.legacy.d": "표시가 없으면 경고를 남기고 로딩합니다. 이 플러그인의 동기 코드는 '세상 멈추기(stop-the-world)' 상태에서 혼자 실행되어, 메인 스레드가 하나뿐인 것처럼 보이게 됩니다.",
      "how.table.t": "상황별 처리", "how.col.case": "상황", "how.col.handling": "처리",
      "how.rows": [
        ["지역 틱 / 작업 묶음 실행", "enterRegion() / exitRegion()으로 '실행 중' 표시"],
        ["일반 플러그인이 듣는 동기 이벤트", "이벤트 전체를 runExclusive로 실행"],
        ["BukkitScheduler 동기 작업", "전역 틱마다 확인해서, 실행할 작업이 있는 틱에만 runExclusive"],
        ["비동기 작업 (runTaskAsynchronously 등)", "기존 Paper 방식 그대로"],
        ["모든 명령어 (바닐라 / 플러그인)", "runExclusive 안에서 실행"],
        ["일반 플러그인의 onEnable / onDisable", "runExclusive 안에서 실행"],
        ["다른 지역의 블록 수정 / 엔티티 추가 / teleport", "스레드의 '현재 지역'을 그 지역으로 잠깐 바꿔서 실행 (inRegionAt)"],
        ["로드되지 않은 청크의 동기 로딩", "잠금을 잠깐 풀고 요청. 기다리는 스레드가 그 지역 작업과 전역 청크 작업을 직접 처리 (틱 스레드가 1~2개여도 멈추지 않음)"],
        ["서버 시작", "지역 스레드를 POSTWORLD 플러그인 켜기 전에 시작. 전역 틱(접속, 콘솔)은 그다음에 시작"]
      ],
      "how.steps.t": "runExclusive는 이렇게 동작합니다",
      "how.steps": [
        "다른 지역들이 지금 돌고 있는 틱을 끝낼 때까지 기다리고, 새 틱은 시작하지 못하게 막습니다.",
        "혼자 실행하는 동안에는 스레드 소유 검사(TickThread.isTickThreadFor*, isGlobalTickThread)를 통과시킵니다.",
        "엔티티나 청크가 추가·제거되면 그 위치를 소유한 지역의 데이터에 기록합니다. 다른 지역에 엔티티를 스폰해도 올바른 지역에 들어갑니다.",
        "지역 스레드끼리 동시에 요청해도 데드락이 나지 않습니다. 기다리는 동안 자기 자신을 '멈춤'으로 표시하기 때문입니다."
      ],
      "on.t": "다시 켠 기능",
      "on.list": [
        "folia-supported가 없는 플러그인 로딩 (콘솔에 경고)",
        "BukkitScheduler, 동기 teleport() (내부에서 teleportAsync로 넘김)",
        "스코어보드 API (registerNewTeam, getNewScoreboard 등)",
        "비동기 스레드에서 호출하는 getTPS()",
        "바닐라: bossbar, clone, data, function, item, loot, schedule, scoreboard, spectate, spreadplayers, tag, team, tick, trigger 등",
        "Paper: /mspt (명령을 친 사람의 지역 기준), /restart"
      ],
      "off.t": "아직 꺼져 있는 기능",
      "off.list": [
        "/reload, /datapack: 메인 스레드 큐를 쓰는데 Folia에서는 그 큐가 돌지 않아 서버가 멈춥니다",
        "/save-all: 저장이 지역 단위입니다. 자동 저장과 /stop 저장은 정상입니다",
        "/perf, /test: 메인 스레드 프로파일러와 게임테스트 전용입니다",
        "createWorld / unloadWorld API: Folia 원본에서도 아직 구현되지 않았습니다"
      ],
      "cfg.title": "설정 (JVM 옵션)", "cfg.col.opt": "옵션", "cfg.col.def": "기본값", "cfg.col.desc": "설명",
      "cfg.1": "호환 모드 전체를 끕니다 (순정 Folia 동작)",
      "cfg.2": "다시 켠 명령어와 명령어 전역 실행만 끕니다",
      "cfg.3": "전역 실행이 이 시간(ms)보다 오래 걸리면 경고를 남깁니다",
      "risk.title": "알아 두어야 할 점",
      "risk.list": [
        "일반 플러그인이 많이 일할수록 서버가 단일 스레드처럼 느려집니다. 매 틱 반복 작업이나 이벤트를 많이 받는 플러그인이 대표적입니다.",
        "지역 A가 틱 도중 이벤트에서 기다리는 동안 다른 스레드가 지역 A의 엔티티를 바꿀 수 있습니다. Paper와 비슷하지만 100% 같지는 않습니다.",
        "Folia 내부 잠금을 쥔 상태에서 일반 플러그인 이벤트가 발생하면 이론상 데드락이 날 수 있습니다. 서버가 멈추면 Folia 워치독이 스레드 덤프를 남깁니다.",
        "NMS나 CraftBukkit 내부를 직접 건드리는 플러그인은 Folia 내부 구조가 달라서 깨질 수 있습니다.",
        "먼저 테스트 서버에서 충분히 확인한 뒤 운영 서버에 쓰세요."
      ],
      "foot.disclaimer": "Lumina는 PaperMC와 관련이 없는 비공식 포크이며 PaperMC의 지원을 받지 않습니다. 문제는 Folia/Paper가 아니라 Lumina 저장소에 알려 주세요.",
      "foot.license": "Folia·Paper 기반 · 패치는 GPLv3 · <a href=\"https://github.com/aruru10313/Lumina\">소스 코드</a> · <a href=\"https://github.com/aruru10313/Lumina/issues\">문제 신고</a>"
    },
    en: {
      "nav.download": "Download", "nav.how": "How it works", "nav.config": "Config", "nav.risks": "Caveats",
      "hero.tagline": "Folia's multithreading, with your regular Paper plugins",
      "hero.sub": "Lumina is an unofficial Folia-based server. Plugins without folia-supported still load, and their synchronous code runs safely while every region is briefly paused.",
      "hero.cta": "Download", "hero.source": "Source code",
      "pill.1.t": "Parallel region ticking", "pill.1.d": "Folia-ready plugins and worlds keep ticking in parallel, region by region.",
      "pill.2.t": "Regular plugins work", "pill.2.d": "BukkitScheduler, sync teleport and the scoreboard API are back.",
      "pill.3.t": "One flag to turn it off", "pill.3.d": "<code>-Dfolia.legacyCompat=false</code> gives you stock Folia behaviour.",
      "dl.title": "Download",
      "dl.desc": "Pick your Minecraft version. Builds are made from source by GitHub Actions and published to GitHub Releases.",
      "dl.loading": "Loading builds…",
      "dl.error": "Couldn't load the build list. Please download from the GitHub Releases page.",
      "dl.latest": "Latest", "dl.soon": "Coming soon", "dl.build": "Build", "dl.btn": "Download",
      "dl.older": "Older builds", "dl.notes": "Release notes", "dl.java": "Java {v}+", "dl.notyet": "No build for this version yet.",
      "dl.run": "Run: <code>java -Xms4G -Xmx4G -jar lumina-&lt;version&gt;-b&lt;build&gt;.jar --nogui</code> · The Mojang server is downloaded automatically on first start. A <code>.sha256</code> file is published next to each jar.",
      "how.title": "How it works",
      "how.intro": "The core is a single class, <code>LegacyCompat</code>. Plugins are run in one of two ways depending on whether they support Folia.",
      "how.folia.t": "Folia-ready plugins", "how.folia.d": "With folia-supported: true in plugin.yml, the plugin runs exactly as on Folia, in parallel on region threads. No performance cost.",
      "how.legacy.t": "Regular Paper plugins", "how.legacy.d": "Without it, the plugin loads with a warning. Its synchronous code runs alone in a stop-the-world section, so it sees what looks like a single main thread.",
      "how.table.t": "What happens when", "how.col.case": "Situation", "how.col.handling": "Handling",
      "how.rows": [
        ["Region tick / task batch", "Marked as running with enterRegion() / exitRegion()"],
        ["Sync event a regular plugin listens to", "The whole event runs inside runExclusive"],
        ["BukkitScheduler sync tasks", "Checked every global tick; runExclusive only on ticks with due tasks"],
        ["Async tasks (runTaskAsynchronously etc.)", "Unchanged from Paper"],
        ["All commands (vanilla / plugin)", "Run inside runExclusive"],
        ["onEnable / onDisable of regular plugins", "Run inside runExclusive"],
        ["Block edits / entity adds / teleport in another region", "The thread's current region is switched to that region temporarily (inRegionAt)"],
        ["Sync load of an unloaded chunk", "The lock is released while waiting; the waiting thread processes that region's and global chunk tasks itself (no stall even with 1–2 tick threads)"],
        ["Server startup", "Region threads start before POSTWORLD plugins enable; the global tick (logins, console) starts afterwards as usual"]
      ],
      "how.steps.t": "How runExclusive works",
      "how.steps": [
        "Waits for other regions to finish the tick they are running, and blocks new ticks from starting.",
        "While running alone, thread ownership checks (TickThread.isTickThreadFor*, isGlobalTickThread) pass.",
        "Entities and chunks added or removed are recorded in the data of the region that owns that position, so spawning into another region lands in the right place.",
        "Concurrent requests from region threads don't deadlock: a waiting thread marks itself as paused."
      ],
      "on.t": "Re-enabled",
      "on.list": [
        "Loading plugins without folia-supported (with a console warning)",
        "BukkitScheduler, sync teleport() (forwarded to teleportAsync)",
        "Scoreboard API (registerNewTeam, getNewScoreboard, …)",
        "getTPS() called from async threads",
        "Vanilla: bossbar, clone, data, function, item, loot, schedule, scoreboard, spectate, spreadplayers, tag, team, tick, trigger and more",
        "Paper: /mspt (for the sender's region), /restart"
      ],
      "off.t": "Still disabled",
      "off.list": [
        "/reload, /datapack: they use the main-thread queue, which doesn't run on Folia, so the server would hang",
        "/save-all: saving is per region; autosave and saving on /stop work normally",
        "/perf, /test: main-thread profiler and gametest only",
        "createWorld / unloadWorld API: not implemented in upstream Folia either"
      ],
      "cfg.title": "Config (JVM flags)", "cfg.col.opt": "Flag", "cfg.col.def": "Default", "cfg.col.desc": "Description",
      "cfg.1": "Turns the whole compatibility mode off (stock Folia)",
      "cfg.2": "Turns off only the re-enabled commands and global command execution",
      "cfg.3": "Logs a warning when an exclusive section takes longer than this (ms)",
      "risk.title": "Caveats",
      "risk.list": [
        "The more work regular plugins do, the more the server behaves like a single-threaded one. Plugins with per-tick tasks or many event listeners are the usual cause.",
        "While region A waits inside an event mid-tick, another thread may modify region A's entities. Similar to Paper, but not 100% identical.",
        "If a regular plugin event fires while a Folia internal lock is held, a deadlock is theoretically possible. Folia's watchdog writes a thread dump if the server hangs.",
        "Plugins that touch NMS or CraftBukkit internals directly may break because Folia's internals differ.",
        "Test on a staging server before using it in production."
      ],
      "foot.disclaimer": "Lumina is an unofficial fork, not affiliated with or supported by PaperMC. Please report issues to the Lumina repository, not to Folia/Paper.",
      "foot.license": "Based on Folia and Paper · Patches under GPLv3 · <a href=\"https://github.com/aruru10313/Lumina\">Source</a> · <a href=\"https://github.com/aruru10313/Lumina/issues\">Report an issue</a>"
    }
  };

  let lang = localStorage.getItem("lumina.lang") ||
    ((navigator.language || "en").toLowerCase().startsWith("ko") ? "ko" : "en");
  let releases = null; // null = loading, false = error, array = loaded

  const t = (k) => T[lang][k] ?? T.en[k] ?? k;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fill = (id, html) => { document.getElementById(id).innerHTML = html; };

  function javaFor(mc) {
    const [a, b, c] = mc.split(".").map(Number);
    if (a >= 26) return 25;
    if (a === 1 && (b > 20 || (b === 20 && (c || 0) >= 5))) return 21;
    return 17;
  }
  function cmpVer(x, y) {
    const a = x.split(".").map(Number), b = y.split(".").map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const d = (b[i] || 0) - (a[i] || 0);
      if (d) return d;
    }
    return 0;
  }
  const fmtSize = (n) => (n / 1048576).toFixed(1) + " MB";
  const fmtDate = (s) => new Date(s).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" });

  function renderStatic() {
    document.documentElement.lang = lang;
    document.getElementById("lang").textContent = lang === "ko" ? "EN" : "한국어";
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    fill("how-rows", t("how.rows").map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join(""));
    const li = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join("");
    fill("how-steps", li(t("how.steps")));
    fill("on-list", li(t("on.list")));
    fill("off-list", li(t("off.list")));
    fill("risk-list", li(t("risk.list")));
  }

  function renderVersions() {
    const box = document.getElementById("versions");
    if (releases === null) { box.innerHTML = `<p class="muted">${esc(t("dl.loading"))}</p>`; return; }
    if (releases === false) {
      box.innerHTML = `<p class="muted">${esc(t("dl.error"))} <a href="https://github.com/${REPO}/releases">GitHub Releases</a></p>`;
      return;
    }
    // Group builds by Minecraft version.
    const byVer = {};
    for (const r of releases) {
      const m = /^lumina-(.+)-b(\d+)$/.exec(r.tag_name || "");
      if (!m || r.draft) continue;
      const jar = (r.assets || []).find((a) => a.name.endsWith(".jar"));
      if (!jar) continue;
      const sha = (r.assets || []).find((a) => a.name.endsWith(".sha256"));
      (byVer[m[1]] ||= []).push({ build: +m[2], date: r.published_at, url: jar.browser_download_url, size: jar.size, sha: sha && sha.browser_download_url, page: r.html_url, pre: r.prerelease });
    }
    const versions = [...new Set([...TARGETS, ...Object.keys(byVer)])].sort(cmpVer);
    const newest = versions.find((v) => byVer[v]);
    box.innerHTML = versions.map((v) => {
      const builds = (byVer[v] || []).sort((a, b) => b.build - a.build);
      const java = esc(t("dl.java").replace("{v}", javaFor(v)));
      if (!builds.length) {
        return `<div class="ver soon"><div class="ver-head"><span class="ver-name">${esc(v)}</span><span class="tag">${esc(t("dl.soon"))}</span></div>
          <div class="meta">${java}</div><div class="meta">${esc(t("dl.notyet"))}</div></div>`;
      }
      const b = builds[0];
      const older = builds.slice(1, 11).map((o) => `<li><a href="${esc(o.url)}">${esc(t("dl.build"))} ${o.build}</a> · ${esc(fmtDate(o.date))}</li>`).join("");
      return `<div class="ver${v === newest ? " latest" : ""}">
        <div class="ver-head"><span class="ver-name">${esc(v)}</span>${v === newest ? `<span class="tag new">${esc(t("dl.latest"))}</span>` : ""}</div>
        <div class="meta">${esc(t("dl.build"))} ${b.build} · ${esc(fmtDate(b.date))} · ${esc(fmtSize(b.size))}</div>
        <div class="meta">${java}</div>
        <div class="ver-actions">
          <a class="btn primary sm" href="${esc(b.url)}">${esc(t("dl.btn"))}</a>
          ${b.sha ? `<a class="small" href="${esc(b.sha)}">sha256</a>` : ""}
          <a class="small" href="${esc(b.page)}" target="_blank" rel="noopener">${esc(t("dl.notes"))}</a>
        </div>
        ${older ? `<details class="older"><summary>${esc(t("dl.older"))} (${builds.length - 1})</summary><ul>${older}</ul></details>` : ""}
      </div>`;
    }).join("");
  }

  async function loadReleases() {
    try {
      const all = [];
      for (let page = 1; page <= 5; page++) {
        const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`, { headers: { Accept: "application/vnd.github+json" } });
        if (!res.ok) throw new Error(res.status);
        const chunk = await res.json();
        all.push(...chunk);
        if (chunk.length < 100) break;
      }
      releases = all;
    } catch (e) {
      releases = false;
    }
    renderVersions();
  }

  document.getElementById("lang").addEventListener("click", () => {
    lang = lang === "ko" ? "en" : "ko";
    localStorage.setItem("lumina.lang", lang);
    renderStatic();
    renderVersions();
  });

  renderStatic();
  renderVersions();
  loadReleases();
})();
