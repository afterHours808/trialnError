(() => {
	const $ = (s) => document.querySelector(s);
	const ph = $("#ph"),
		V = $("#v"),
		SB = $("#sb"),
		QP = $("#qp"),
		TZ = $("#tz"),
		HB = $("#hb");
	const esc = (s = "") =>
		String(s).replace(
			/[&<>"]/g,
			(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
		);
	const bg = (u) => `style="background-image:url('${esc(u)}')"`;
	const p2 = (n) => String(n).padStart(2, "0");
	const now = () => {
		const d = new Date();
		return p2(d.getHours()) + "." + p2(d.getMinutes());
	};
	let cur = "lock";
	let appDepth = 0; /* kedalaman halaman di dalam aplikasi (iframe) */
	addEventListener("message", (e) => {
		const f = V.querySelector("iframe");
		if (!f || e.source !== f.contentWindow) return;
		const d = e.data || {};
		if (d.type === "depth") {
			appDepth = +d.n || 0;
			sendTheme();
		} else if (d.type === "home") go("home");
	});

	/* ---------- aplikasi terbaru ---------- */
	const recent = [];
	const RC = document.createElement("div");
	RC.id = "rc";
	ph.appendChild(RC);
	const closeRC = () => RC.classList.remove("o");
	function openRC() {
		RC.innerHTML = recent.length
			? `<div class="rcs">${recent
					.map((k) => {
						const a = D.apps[k];
						return `<div class="rcc" data-r="${k}"><span class="x" data-x="${k}">✕</span><div class="ri">${a.img ? `<img src="${esc(a.img)}" alt="">` : `<span>${a.i}</span>`}</div><b>${esc(a.n)}</b></div>`;
					})
					.join("")}</div><button class="rca" data-clr>Hapus semua</button>`
			: `<div class="rce">Tidak ada aplikasi terbaru</div>`;
		RC.classList.add("o");
	}
	RC.addEventListener("click", (e) => {
		const t = e.target;
		let x;
		if ((x = t.closest("[data-x]"))) {
			recent.splice(recent.indexOf(x.dataset.x), 1);
			return openRC();
		}
		if ((x = t.closest("[data-r]"))) return go(x.dataset.r);
		if (t.closest("[data-clr]")) {
			recent.length = 0;
			return go("home");
		}
		closeRC();
	});

	/* skala ponsel supaya muat di layar PC */
	const fit = () => {
		const m = innerWidth <= 480;
		ph.style.setProperty(
			"--s",
			m ? 1 : Math.min(1, (innerHeight - 24) / 880, (innerWidth - 24) / 410),
		);
	};
	addEventListener("resize", fit);
	fit();

	ph.style.setProperty("--wp", `url("${D.wallpaper}")`);
	setInterval(() => {
		document.querySelectorAll("[data-clk]").forEach((e) => {
			e.textContent = now();
		});
	}, 1000);

	/* ---------- status bar ---------- */
	function setSB() {
		const left =
			cur === "lock" ? esc(D.carrier) : `<span data-clk>${now()}</span>`;
		SB.innerHTML = `<span>${left}</span><span>▂▄▆ &nbsp;<b>${D.battery}%</b></span>`;
	}
	function sendTheme() {
		const f = V.querySelector("iframe");
		if (f && f.contentWindow)
			f.contentWindow.postMessage(
				{ type: "theme", dark: ph.classList.contains("dm") },
				"*",
			);
	}
	function syncLt() {
		const inApp = cur !== "lock" && cur !== "home";
		ph.classList.toggle("lt", inApp && !ph.classList.contains("dm"));
	}

	/* ---------- navigasi ---------- */
	function go(name) {
		cur = name;
		appDepth = 0;
		closeRC();
		QP.classList.remove("o");
		ph.classList.toggle("nolk", name === "lock");
		if (D.apps[name]) {
			const i = recent.indexOf(name);
			if (i > -1) recent.splice(i, 1);
			recent.unshift(name);
			if (recent.length > 6) recent.pop();
		}
		setSB();
		syncLt();
		if (name === "lock") lock();
		else if (name === "home") home();
		else openApp(name);
	}

	/* ---------- komponen ---------- */
	const spot = (c = "") =>
		`<div class="sp ${c}"><div class="sg">♫</div><div class="st"><b>${esc(D.song.t)}</b><small>${esc(D.song.a)}</small><u><i></i></u></div><span>⏸</span></div>`;
	const ic = (k) => {
		const a = D.apps[k];
		return `<div class="app-icon-wrap"><div class="ic" data-app="${k}" title="${esc(a.n)}">${a.img ? `<img src="${esc(a.img)}" alt="">` : `<span>${a.i}</span>`}</div><div class="app-label">${esc(a.n)}</div></div>`;
	};
	/* kalender bulan mini (tanpa jadwal) */
	const cal = () => {
		const first = (new Date(D.year, D.month - 1, 1).getDay() + 6) % 7;
		const len = new Date(D.year, D.month, 0).getDate();
		const names = ["S", "S", "R", "K", "J", "S", "M"]
			.map((n) => `<span class="day-name">${n}</span>`)
			.join("");
		const blanks = "<span></span>".repeat(first);
		let days = "";
		for (let d = 1; d <= len; d++)
			days += `<span${d === +D.day ? ' class="active-date"' : ""}>${d}</span>`;
		return `<div class="wd cal"><div class="cal-header">${esc(D.monthName.toUpperCase())} ${D.year}</div><div class="cal-grid">${names}${blanks}${days}</div></div>`;
	};

	/* ---------- lock screen ---------- */
	function lock() {
		V.innerHTML = `<div class="scr wall lk">
			<div class="dtl">${esc(D.dateLong)}</div>
			<h1 data-clk>${now()}</h1>
			${spot()}
			<div class="hint">⌃<br>Geser ke atas untuk membuka</div>
		</div>`;
	}
	function unlock() {
		if (cur !== "lock" || V.querySelector(".pad")) return;
		askPin(D.pin, () => go("home"));
	}

	/* ---------- PIN pad ---------- */
	function askPin(pin, ok) {
		let v = "";
		const p = document.createElement("div");
		p.className = "pad";
		p.innerHTML = `<div>Masukkan PIN</div>
			<div class="dots">${"<i></i>".repeat(4)}</div>
			<div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"]
				.map((k) =>
					k === "" ? "<span></span>" : `<button data-k="${k}">${k}</button>`,
				)
				.join("")}</div>
			<button class="go">Batal</button>`;
		V.appendChild(p);
		const wrap = p.querySelector(".dots");
		const dots = [...wrap.children];
		p.addEventListener("click", (e) => {
			const b = e.target.closest("button");
			if (!b) return;
			if (b.classList.contains("go")) return p.remove();
			const k = b.dataset.k;
			if (k === "⌫") v = v.slice(0, -1);
			else if (v.length < 4) v += k;
			dots.forEach((d, i) => d.classList.toggle("f", i < v.length));
			if (v.length === 4) {
				if (v === pin) {
					p.remove();
					ok();
				} else {
					wrap.classList.add("sh");
					setTimeout(() => {
						wrap.classList.remove("sh");
						v = "";
						dots.forEach((d) => d.classList.remove("f"));
					}, 350);
				}
			}
		});
	}

	/* ---------- home ---------- */
	function home() {
		V.innerHTML = `<div class="scr wall home">
			<div class="hg">
				${spot("w")}
				${cal()}
				<div class="wd pw" ${bg(D.photos[0])}></div>
				${ic("ig")}${ic("note")}
				<div class="wd dt"><div class="cc">${D.day}</div><div><div style="font-size:12px;opacity:.7">${D.mon}</div><b>${esc(D.dayName)}</b></div></div>
				${["mail", "map", "file", "gal"].map((k) => ic(k)).join("")}
				<div class="wd p2" ${bg(D.photos[1])}></div>
				${ic("tw")}${ic("alm")}
			</div>
			<div class="pg"><i></i><i class="a"></i><i></i></div>
			<div class="dock">${["tel", "msg", "web", "cam"].map((k) => ic(k)).join("")}</div>
		</div>`;
	}

	/* ---------- aplikasi = halaman HTML lain (lewat iframe) ---------- */
	function openApp(k) {
		const a = D.apps[k];
		if (a.url) {
			V.innerHTML = `<div class="scr app frm"><iframe src="${esc(a.url)}" title="${esc(a.n)}"></iframe></div>`;
			return;
		}
		V.innerHTML = `<div class="scr app"><div class="hd"><span class="bk" data-back="home">‹</span>${esc(a.n)}</div><div class="bd"><div class="card">Halaman ${esc(a.n)} belum dibuat.<br>Isi <code>url</code> aplikasi ini di data.js, misalnya "apps/${k}.html".</div></div></div>`;
	}

	/* ---------- event ---------- */
	let y0 = null;
	V.addEventListener("pointerdown", (e) => {
		y0 = e.clientY;
	});
	V.addEventListener("pointerup", (e) => {
		if (y0 !== null) {
			const r = ph.getBoundingClientRect();
			const dist = (e.clientY - y0) / r.height;
			const fromTop = (y0 - r.top) / r.height;
			if (cur === "lock" && dist < -0.07) unlock();
			else if (
				(cur === "home" || cur === "lock") &&
				fromTop < 0.18 &&
				dist > 0.06
			)
				QP.classList.add("o");
		}
		y0 = null;
	});
	V.addEventListener("wheel", (e) => {
		if (cur === "lock" && e.deltaY > 20) unlock();
	});
	V.addEventListener("click", (e) => {
		const t = e.target;
		let x;
		if (t.closest(".pad")) return;
		if (t.closest(".hint")) return unlock();
		if ((x = t.closest(".sp"))) {
			const s = x.lastElementChild;
			s.textContent = s.textContent === "⏸" ? "▶" : "⏸";
			return;
		}
		if ((x = t.closest("[data-back]"))) return go(x.dataset.back);
		if ((x = t.closest("[data-app]"))) return go(x.dataset.app);
	});

	/* ---------- tombol navigasi ---------- */
	HB.innerHTML = `<button data-n="back" aria-label="Kembali">◁</button><button data-n="home" aria-label="Beranda">○</button><button data-n="rc" aria-label="Aplikasi terbaru">▢</button>`;
	HB.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b) return;
		const n = b.dataset.n;
		if (n === "rc") return RC.classList.contains("o") ? closeRC() : openRC();
		if (n === "home") return go("home");
		if (RC.classList.contains("o")) return closeRC();
		if (QP.classList.contains("o")) return QP.classList.remove("o");
		const pad = V.querySelector(".pad");
		if (pad) return pad.remove();
		const fr = V.querySelector("iframe");
		if (fr && appDepth > 0)
			return fr.contentWindow.postMessage({ type: "back" }, "*");
		const bk = V.querySelector("[data-back]");
		if (bk) go(bk.dataset.back);
		else if (cur !== "home" && cur !== "lock") go("home");
	});

	/* ---------- panel pengaturan cepat (tarik dari atas) ---------- */
	const qs = { wifi: 1, data: 1, bt: 0, fl: 0, air: 0 };
	let brv = 100;
	const tile = (k, i, n, on, sub) =>
		`<button class="qs-tile ${on ? "active" : ""}" data-q="${k}"><span class="qs-icon">${i}</span><span>${n}</span><small>${sub}</small></button>`;
	function drawQP() {
		const light = !ph.classList.contains("dm");
		const onoff = (k) => (qs[k] ? "Nyala" : "Mati");
		QP.innerHTML = `<div class="qs-header"><div><div class="qs-title">Pengaturan Cepat</div><div class="qs-subtitle">${esc(D.dateLong)}</div></div><button id="qs-close" aria-label="Tutup">✕</button></div>
		<div class="qs-grid">
			${tile("wifi", "📶", "Wi-Fi", qs.wifi, qs.wifi ? "Terhubung" : "Mati")}
			${tile("data", "📡", "Data seluler", qs.data, qs.data ? esc(D.carrier) : "Mati")}
			${tile("bt", "🔵", "Bluetooth", qs.bt, onoff("bt"))}
			${tile("fl", "🔦", "Senter", qs.fl, onoff("fl"))}
			${tile("air", "✈️", "Mode pesawat", qs.air, onoff("air"))}
			${tile("br", light ? "☀️" : "🌙", "Mode Baca", light, light ? "Mode Terang" : "Mode gelap")}
		</div>
		<div class="qs-brightness"><div class="qs-brightness-heading"><span>☀️</span><b>Kecerahan</b><span id="qs-br-value">${brv}%</span></div><input id="br" type="range" min="40" max="100" value="${brv}"></div>
		<button class="qs-lock" data-q="lk">🔒 Kunci layar</button>
		<div class="hdl">▲ Tutup</div>`;
	}
	drawQP();
	QP.addEventListener("click", (e) => {
		if (e.target.closest("#qs-close") || e.target.closest(".hdl"))
			return QP.classList.remove("o");
		const b = e.target.closest("[data-q]");
		if (!b) return;
		const k = b.dataset.q;
		if (k === "lk") return go("lock");
		if (k === "br") {
			ph.classList.toggle("dm");
			syncLt();
			sendTheme();
		} else {
			qs[k] = qs[k] ? 0 : 1;
			if (k === "air" && qs.air) qs.wifi = qs.data = qs.bt = 0;
		}
		drawQP();
	});
	QP.addEventListener("input", (e) => {
		if (e.target.id !== "br") return;
		brv = e.target.value;
		ph.style.setProperty("--br", brv / 100);
		$("#qs-br-value").textContent = brv + "%";
	});
	let ty = null;
	TZ.addEventListener("pointerdown", (e) => {
		ty = e.clientY;
		TZ.setPointerCapture?.(e.pointerId);
	});
	TZ.addEventListener("pointerup", (e) => {
		if (ty !== null && e.clientY - ty > -15) QP.classList.add("o");
		ty = null;
	});
	QP.addEventListener("pointerdown", (e) => {
		ty = e.clientY;
	});
	QP.addEventListener("pointerup", (e) => {
		if (ty !== null && ty - e.clientY > 25) QP.classList.remove("o");
		ty = null;
	});

	go("lock");
})();
