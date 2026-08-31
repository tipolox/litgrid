//#region ../../node_modules/.pnpm/@lit+reactive-element@2.1.2/node_modules/@lit/reactive-element/css-tag.js
/**
* @license
* Copyright 2019 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var t$3 = globalThis, e$4 = t$3.ShadowRoot && (void 0 === t$3.ShadyCSS || t$3.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, s$3 = Symbol(), o$3 = /* @__PURE__ */ new WeakMap();
var n$3 = class {
	constructor(t, e, o) {
		if (this._$cssResult$ = !0, o !== s$3) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = t, this.t = e;
	}
	get styleSheet() {
		let t = this.o;
		const s = this.t;
		if (e$4 && void 0 === t) {
			const e = void 0 !== s && 1 === s.length;
			e && (t = o$3.get(s)), void 0 === t && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), e && o$3.set(s, t));
		}
		return t;
	}
	toString() {
		return this.cssText;
	}
};
var r$3 = (t) => new n$3("string" == typeof t ? t : t + "", void 0, s$3), i$5 = (t, ...e) => {
	return new n$3(1 === t.length ? t[0] : e.reduce((e, s, o) => e + ((t) => {
		if (!0 === t._$cssResult$) return t.cssText;
		if ("number" == typeof t) return t;
		throw Error("Value passed to 'css' function must be a 'css' function result: " + t + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
	})(s) + t[o + 1], t[0]), t, s$3);
}, S$1 = (s, o) => {
	if (e$4) s.adoptedStyleSheets = o.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
	else for (const e of o) {
		const o = document.createElement("style"), n = t$3.litNonce;
		void 0 !== n && o.setAttribute("nonce", n), o.textContent = e.cssText, s.appendChild(o);
	}
}, c$3 = e$4 ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((t) => {
	let e = "";
	for (const s of t.cssRules) e += s.cssText;
	return r$3(e);
})(t) : t;
//#endregion
//#region ../../node_modules/.pnpm/@lit+reactive-element@2.1.2/node_modules/@lit/reactive-element/reactive-element.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ var { is: i$4, defineProperty: e$3, getOwnPropertyDescriptor: h$3, getOwnPropertyNames: r$2, getOwnPropertySymbols: o$2, getPrototypeOf: n$2 } = Object, a$1 = globalThis, c$2 = a$1.trustedTypes, l$2 = c$2 ? c$2.emptyScript : "", p$2 = a$1.reactiveElementPolyfillSupport, d$3 = (t, s) => t, u$2 = {
	toAttribute(t, s) {
		switch (s) {
			case Boolean:
				t = t ? l$2 : null;
				break;
			case Object:
			case Array: t = null == t ? t : JSON.stringify(t);
		}
		return t;
	},
	fromAttribute(t, s) {
		let i = t;
		switch (s) {
			case Boolean:
				i = null !== t;
				break;
			case Number:
				i = null === t ? null : Number(t);
				break;
			case Object:
			case Array: try {
				i = JSON.parse(t);
			} catch (t) {
				i = null;
			}
		}
		return i;
	}
}, f$2 = (t, s) => !i$4(t, s), b$1 = {
	attribute: !0,
	type: String,
	converter: u$2,
	reflect: !1,
	useDefault: !1,
	hasChanged: f$2
};
Symbol.metadata ??= Symbol("metadata"), a$1.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y$1 = class extends HTMLElement {
	static addInitializer(t) {
		this._$Ei(), (this.l ??= []).push(t);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(t, s = b$1) {
		if (s.state && (s.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((s = Object.create(s)).wrapped = !0), this.elementProperties.set(t, s), !s.noAccessor) {
			const i = Symbol(), h = this.getPropertyDescriptor(t, i, s);
			void 0 !== h && e$3(this.prototype, t, h);
		}
	}
	static getPropertyDescriptor(t, s, i) {
		const { get: e, set: r } = h$3(this.prototype, t) ?? {
			get() {
				return this[s];
			},
			set(t) {
				this[s] = t;
			}
		};
		return {
			get: e,
			set(s) {
				const h = e?.call(this);
				r?.call(this, s), this.requestUpdate(t, h, i);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(t) {
		return this.elementProperties.get(t) ?? b$1;
	}
	static _$Ei() {
		if (this.hasOwnProperty(d$3("elementProperties"))) return;
		const t = n$2(this);
		t.finalize(), void 0 !== t.l && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(d$3("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(d$3("properties"))) {
			const t = this.properties, s = [...r$2(t), ...o$2(t)];
			for (const i of s) this.createProperty(i, t[i]);
		}
		const t = this[Symbol.metadata];
		if (null !== t) {
			const s = litPropertyMetadata.get(t);
			if (void 0 !== s) for (const [t, i] of s) this.elementProperties.set(t, i);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (const [t, s] of this.elementProperties) {
			const i = this._$Eu(t, s);
			void 0 !== i && this._$Eh.set(i, t);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(s) {
		const i = [];
		if (Array.isArray(s)) {
			const e = new Set(s.flat(Infinity).reverse());
			for (const s of e) i.unshift(c$3(s));
		} else void 0 !== s && i.push(c$3(s));
		return i;
	}
	static _$Eu(t, s) {
		const i = s.attribute;
		return !1 === i ? void 0 : "string" == typeof i ? i : "string" == typeof t ? t.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t) => t(this));
	}
	addController(t) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(t), void 0 !== this.renderRoot && this.isConnected && t.hostConnected?.();
	}
	removeController(t) {
		this._$EO?.delete(t);
	}
	_$E_() {
		const t = /* @__PURE__ */ new Map(), s = this.constructor.elementProperties;
		for (const i of s.keys()) this.hasOwnProperty(i) && (t.set(i, this[i]), delete this[i]);
		t.size > 0 && (this._$Ep = t);
	}
	createRenderRoot() {
		const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return S$1(t, this.constructor.elementStyles), t;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((t) => t.hostConnected?.());
	}
	enableUpdating(t) {}
	disconnectedCallback() {
		this._$EO?.forEach((t) => t.hostDisconnected?.());
	}
	attributeChangedCallback(t, s, i) {
		this._$AK(t, i);
	}
	_$ET(t, s) {
		const i = this.constructor.elementProperties.get(t), e = this.constructor._$Eu(t, i);
		if (void 0 !== e && !0 === i.reflect) {
			const h = (void 0 !== i.converter?.toAttribute ? i.converter : u$2).toAttribute(s, i.type);
			this._$Em = t, null == h ? this.removeAttribute(e) : this.setAttribute(e, h), this._$Em = null;
		}
	}
	_$AK(t, s) {
		const i = this.constructor, e = i._$Eh.get(t);
		if (void 0 !== e && this._$Em !== e) {
			const t = i.getPropertyOptions(e), h = "function" == typeof t.converter ? { fromAttribute: t.converter } : void 0 !== t.converter?.fromAttribute ? t.converter : u$2;
			this._$Em = e;
			const r = h.fromAttribute(s, t.type);
			this[e] = r ?? this._$Ej?.get(e) ?? r, this._$Em = null;
		}
	}
	requestUpdate(t, s, i, e = !1, h) {
		if (void 0 !== t) {
			const r = this.constructor;
			if (!1 === e && (h = this[t]), i ??= r.getPropertyOptions(t), !((i.hasChanged ?? f$2)(h, s) || i.useDefault && i.reflect && h === this._$Ej?.get(t) && !this.hasAttribute(r._$Eu(t, i)))) return;
			this.C(t, s, i);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(t, s, { useDefault: i, reflect: e, wrapped: h }, r) {
		i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t) && (this._$Ej.set(t, r ?? s ?? this[t]), !0 !== h || void 0 !== r) || (this._$AL.has(t) || (this.hasUpdated || i || (s = void 0), this._$AL.set(t, s)), !0 === e && this._$Em !== t && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (t) {
			Promise.reject(t);
		}
		const t = this.scheduleUpdate();
		return null != t && await t, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (const [t, s] of this._$Ep) this[t] = s;
				this._$Ep = void 0;
			}
			const t = this.constructor.elementProperties;
			if (t.size > 0) for (const [s, i] of t) {
				const { wrapped: t } = i, e = this[s];
				!0 !== t || this._$AL.has(s) || void 0 === e || this.C(s, void 0, i, e);
			}
		}
		let t = !1;
		const s = this._$AL;
		try {
			t = this.shouldUpdate(s), t ? (this.willUpdate(s), this._$EO?.forEach((t) => t.hostUpdate?.()), this.update(s)) : this._$EM();
		} catch (s) {
			throw t = !1, this._$EM(), s;
		}
		t && this._$AE(s);
	}
	willUpdate(t) {}
	_$AE(t) {
		this._$EO?.forEach((t) => t.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(t) {
		return !0;
	}
	update(t) {
		this._$Eq &&= this._$Eq.forEach((t) => this._$ET(t, this[t])), this._$EM();
	}
	updated(t) {}
	firstUpdated(t) {}
};
y$1.elementStyles = [], y$1.shadowRootOptions = { mode: "open" }, y$1[d$3("elementProperties")] = /* @__PURE__ */ new Map(), y$1[d$3("finalized")] = /* @__PURE__ */ new Map(), p$2?.({ ReactiveElement: y$1 }), (a$1.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region ../../node_modules/.pnpm/lit-html@3.3.2/node_modules/lit-html/lit-html.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var t$2 = globalThis, i$3 = (t) => t, s$2 = t$2.trustedTypes, e$2 = s$2 ? s$2.createPolicy("lit-html", { createHTML: (t) => t }) : void 0, h$2 = "$lit$", o$1 = `lit$${Math.random().toFixed(9).slice(2)}$`, n$1 = "?" + o$1, r$1 = `<${n$1}>`, l$1 = document, c$1 = () => l$1.createComment(""), a = (t) => null === t || "object" != typeof t && "function" != typeof t, u$1 = Array.isArray, d$2 = (t) => u$1(t) || "function" == typeof t?.[Symbol.iterator], f$1 = "[ 	\n\f\r]", v$1 = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, _ = /-->/g, m$1 = />/g, p$1 = RegExp(`>|${f$1}(?:([^\\s"'>=/]+)(${f$1}*=${f$1}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), g = /'/g, $ = /"/g, y = /^(?:script|style|textarea|title)$/i, x = (t) => (i, ...s) => ({
	_$litType$: t,
	strings: i,
	values: s
}), b = x(1);
x(2);
x(3);
var E = Symbol.for("lit-noChange"), A = Symbol.for("lit-nothing"), C = /* @__PURE__ */ new WeakMap(), P = l$1.createTreeWalker(l$1, 129);
function V(t, i) {
	if (!u$1(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return void 0 !== e$2 ? e$2.createHTML(i) : i;
}
var N = (t, i) => {
	const s = t.length - 1, e = [];
	let n, l = 2 === i ? "<svg>" : 3 === i ? "<math>" : "", c = v$1;
	for (let i = 0; i < s; i++) {
		const s = t[i];
		let a, u, d = -1, f = 0;
		for (; f < s.length && (c.lastIndex = f, u = c.exec(s), null !== u);) f = c.lastIndex, c === v$1 ? "!--" === u[1] ? c = _ : void 0 !== u[1] ? c = m$1 : void 0 !== u[2] ? (y.test(u[2]) && (n = RegExp("</" + u[2], "g")), c = p$1) : void 0 !== u[3] && (c = p$1) : c === p$1 ? ">" === u[0] ? (c = n ?? v$1, d = -1) : void 0 === u[1] ? d = -2 : (d = c.lastIndex - u[2].length, a = u[1], c = void 0 === u[3] ? p$1 : "\"" === u[3] ? $ : g) : c === $ || c === g ? c = p$1 : c === _ || c === m$1 ? c = v$1 : (c = p$1, n = void 0);
		const x = c === p$1 && t[i + 1].startsWith("/>") ? " " : "";
		l += c === v$1 ? s + r$1 : d >= 0 ? (e.push(a), s.slice(0, d) + h$2 + s.slice(d) + o$1 + x) : s + o$1 + (-2 === d ? i : x);
	}
	return [V(t, l + (t[s] || "<?>") + (2 === i ? "</svg>" : 3 === i ? "</math>" : "")), e];
};
var S = class S {
	constructor({ strings: t, _$litType$: i }, e) {
		let r;
		this.parts = [];
		let l = 0, a = 0;
		const u = t.length - 1, d = this.parts, [f, v] = N(t, i);
		if (this.el = S.createElement(f, e), P.currentNode = this.el.content, 2 === i || 3 === i) {
			const t = this.el.content.firstChild;
			t.replaceWith(...t.childNodes);
		}
		for (; null !== (r = P.nextNode()) && d.length < u;) {
			if (1 === r.nodeType) {
				if (r.hasAttributes()) for (const t of r.getAttributeNames()) if (t.endsWith(h$2)) {
					const i = v[a++], s = r.getAttribute(t).split(o$1), e = /([.?@])?(.*)/.exec(i);
					d.push({
						type: 1,
						index: l,
						name: e[2],
						strings: s,
						ctor: "." === e[1] ? I : "?" === e[1] ? L : "@" === e[1] ? z : H
					}), r.removeAttribute(t);
				} else t.startsWith(o$1) && (d.push({
					type: 6,
					index: l
				}), r.removeAttribute(t));
				if (y.test(r.tagName)) {
					const t = r.textContent.split(o$1), i = t.length - 1;
					if (i > 0) {
						r.textContent = s$2 ? s$2.emptyScript : "";
						for (let s = 0; s < i; s++) r.append(t[s], c$1()), P.nextNode(), d.push({
							type: 2,
							index: ++l
						});
						r.append(t[i], c$1());
					}
				}
			} else if (8 === r.nodeType) if (r.data === n$1) d.push({
				type: 2,
				index: l
			});
			else {
				let t = -1;
				for (; -1 !== (t = r.data.indexOf(o$1, t + 1));) d.push({
					type: 7,
					index: l
				}), t += o$1.length - 1;
			}
			l++;
		}
	}
	static createElement(t, i) {
		const s = l$1.createElement("template");
		return s.innerHTML = t, s;
	}
};
function M$1(t, i, s = t, e) {
	if (i === E) return i;
	let h = void 0 !== e ? s._$Co?.[e] : s._$Cl;
	const o = a(i) ? void 0 : i._$litDirective$;
	return h?.constructor !== o && (h?._$AO?.(!1), void 0 === o ? h = void 0 : (h = new o(t), h._$AT(t, s, e)), void 0 !== e ? (s._$Co ??= [])[e] = h : s._$Cl = h), void 0 !== h && (i = M$1(t, h._$AS(t, i.values), h, e)), i;
}
var R = class {
	constructor(t, i) {
		this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = i;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(t) {
		const { el: { content: i }, parts: s } = this._$AD, e = (t?.creationScope ?? l$1).importNode(i, !0);
		P.currentNode = e;
		let h = P.nextNode(), o = 0, n = 0, r = s[0];
		for (; void 0 !== r;) {
			if (o === r.index) {
				let i;
				2 === r.type ? i = new k(h, h.nextSibling, this, t) : 1 === r.type ? i = new r.ctor(h, r.name, r.strings, this, t) : 6 === r.type && (i = new Z(h, this, t)), this._$AV.push(i), r = s[++n];
			}
			o !== r?.index && (h = P.nextNode(), o++);
		}
		return P.currentNode = l$1, e;
	}
	p(t) {
		let i = 0;
		for (const s of this._$AV) void 0 !== s && (void 0 !== s.strings ? (s._$AI(t, s, i), i += s.strings.length - 2) : s._$AI(t[i])), i++;
	}
};
var k = class k {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(t, i, s, e) {
		this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t, this._$AB = i, this._$AM = s, this.options = e, this._$Cv = e?.isConnected ?? !0;
	}
	get parentNode() {
		let t = this._$AA.parentNode;
		const i = this._$AM;
		return void 0 !== i && 11 === t?.nodeType && (t = i.parentNode), t;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(t, i = this) {
		t = M$1(this, t, i), a(t) ? t === A || null == t || "" === t ? (this._$AH !== A && this._$AR(), this._$AH = A) : t !== this._$AH && t !== E && this._(t) : void 0 !== t._$litType$ ? this.$(t) : void 0 !== t.nodeType ? this.T(t) : d$2(t) ? this.k(t) : this._(t);
	}
	O(t) {
		return this._$AA.parentNode.insertBefore(t, this._$AB);
	}
	T(t) {
		this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
	}
	_(t) {
		this._$AH !== A && a(this._$AH) ? this._$AA.nextSibling.data = t : this.T(l$1.createTextNode(t)), this._$AH = t;
	}
	$(t) {
		const { values: i, _$litType$: s } = t, e = "number" == typeof s ? this._$AC(t) : (void 0 === s.el && (s.el = S.createElement(V(s.h, s.h[0]), this.options)), s);
		if (this._$AH?._$AD === e) this._$AH.p(i);
		else {
			const t = new R(e, this), s = t.u(this.options);
			t.p(i), this.T(s), this._$AH = t;
		}
	}
	_$AC(t) {
		let i = C.get(t.strings);
		return void 0 === i && C.set(t.strings, i = new S(t)), i;
	}
	k(t) {
		u$1(this._$AH) || (this._$AH = [], this._$AR());
		const i = this._$AH;
		let s, e = 0;
		for (const h of t) e === i.length ? i.push(s = new k(this.O(c$1()), this.O(c$1()), this, this.options)) : s = i[e], s._$AI(h), e++;
		e < i.length && (this._$AR(s && s._$AB.nextSibling, e), i.length = e);
	}
	_$AR(t = this._$AA.nextSibling, s) {
		for (this._$AP?.(!1, !0, s); t !== this._$AB;) {
			const s = i$3(t).nextSibling;
			i$3(t).remove(), t = s;
		}
	}
	setConnected(t) {
		void 0 === this._$AM && (this._$Cv = t, this._$AP?.(t));
	}
};
var H = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(t, i, s, e, h) {
		this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t, this.name = i, this._$AM = e, this.options = h, s.length > 2 || "" !== s[0] || "" !== s[1] ? (this._$AH = Array(s.length - 1).fill(/* @__PURE__ */ new String()), this.strings = s) : this._$AH = A;
	}
	_$AI(t, i = this, s, e) {
		const h = this.strings;
		let o = !1;
		if (void 0 === h) t = M$1(this, t, i, 0), o = !a(t) || t !== this._$AH && t !== E, o && (this._$AH = t);
		else {
			const e = t;
			let n, r;
			for (t = h[0], n = 0; n < h.length - 1; n++) r = M$1(this, e[s + n], i, n), r === E && (r = this._$AH[n]), o ||= !a(r) || r !== this._$AH[n], r === A ? t = A : t !== A && (t += (r ?? "") + h[n + 1]), this._$AH[n] = r;
		}
		o && !e && this.j(t);
	}
	j(t) {
		t === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
	}
};
var I = class extends H {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(t) {
		this.element[this.name] = t === A ? void 0 : t;
	}
};
var L = class extends H {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(t) {
		this.element.toggleAttribute(this.name, !!t && t !== A);
	}
};
var z = class extends H {
	constructor(t, i, s, e, h) {
		super(t, i, s, e, h), this.type = 5;
	}
	_$AI(t, i = this) {
		if ((t = M$1(this, t, i, 0) ?? A) === E) return;
		const s = this._$AH, e = t === A && s !== A || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, h = t !== A && (s === A || e);
		e && this.element.removeEventListener(this.name, this, s), h && this.element.addEventListener(this.name, this, t), this._$AH = t;
	}
	handleEvent(t) {
		"function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t) : this._$AH.handleEvent(t);
	}
};
var Z = class {
	constructor(t, i, s) {
		this.element = t, this.type = 6, this._$AN = void 0, this._$AM = i, this.options = s;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(t) {
		M$1(this, t);
	}
};
var j$1 = {
	M: h$2,
	P: o$1,
	A: n$1,
	C: 1,
	L: N,
	R,
	D: d$2,
	V: M$1,
	I: k,
	H,
	N: L,
	U: z,
	B: I,
	F: Z
}, B = t$2.litHtmlPolyfillSupport;
B?.(S, k), (t$2.litHtmlVersions ??= []).push("3.3.2");
var D = (t, i, s) => {
	const e = s?.renderBefore ?? i;
	let h = e._$litPart$;
	if (void 0 === h) {
		const t = s?.renderBefore ?? null;
		e._$litPart$ = h = new k(i.insertBefore(c$1(), t), t, void 0, s ?? {});
	}
	return h._$AI(t), h;
};
//#endregion
//#region ../../node_modules/.pnpm/lit-element@4.2.2/node_modules/lit-element/lit-element.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ var s$1 = globalThis;
var i$2 = class extends y$1 {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		const t = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= t.firstChild, t;
	}
	update(t) {
		const r = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = D(r, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return E;
	}
};
i$2._$litElement$ = !0, i$2["finalized"] = !0, s$1.litElementHydrateSupport?.({ LitElement: i$2 });
var o = s$1.litElementPolyfillSupport;
o?.({ LitElement: i$2 });
(s$1.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region ../../node_modules/.pnpm/lit-html@3.3.2/node_modules/lit-html/directive.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var e$1 = (t) => (...e) => ({
	_$litDirective$: t,
	values: e
});
var i$1 = class {
	constructor(t) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(t, e, i) {
		this._$Ct = t, this._$AM = e, this._$Ci = i;
	}
	_$AS(t, e) {
		return this.update(t, e);
	}
	update(t, e) {
		return this.render(...e);
	}
}, { I: t } = j$1, i = (o) => o, l = (o, t) => void 0 === t ? void 0 !== o?._$litType$ : o?._$litType$ === t, d$1 = (o) => null != o?._$litType$?.h, s = () => document.createComment(""), v = (o, n, e) => {
	const l = o._$AA.parentNode, d = void 0 === n ? o._$AB : n._$AA;
	if (void 0 === e) e = new t(l.insertBefore(s(), d), l.insertBefore(s(), d), o, o.options);
	else {
		const t = e._$AB.nextSibling, n = e._$AM, c = n !== o;
		if (c) {
			let t;
			e._$AQ?.(o), e._$AM = o, void 0 !== e._$AP && (t = o._$AU) !== n._$AU && e._$AP(t);
		}
		if (t !== d || c) {
			let o = e._$AA;
			for (; o !== t;) {
				const t = i(o).nextSibling;
				i(l).insertBefore(o, d), o = t;
			}
		}
	}
	return e;
}, m = {}, p = (o, t = m) => o._$AH = t, M = (o) => o._$AH, j = (o) => {
	o._$AR();
};
//#endregion
//#region ../../node_modules/.pnpm/lit-html@3.3.2/node_modules/lit-html/directives/cache.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ var d = (t) => d$1(t) ? t._$litType$.h : t.strings, h = e$1(class extends i$1 {
	constructor(t) {
		super(t), this.et = /* @__PURE__ */ new WeakMap();
	}
	render(t) {
		return [t];
	}
	update(s, [e]) {
		const u = l(this.it) ? d(this.it) : null, h = l(e) ? d(e) : null;
		if (null !== u && (null === h || u !== h)) {
			const e = M(s).pop();
			let o = this.et.get(u);
			if (void 0 === o) o = D(A, document.createDocumentFragment()), o.setConnected(!1), this.et.set(u, o);
			p(o, [e]), v(o, void 0, e);
		}
		if (null !== h) {
			if (null === u || u !== h) {
				const t = this.et.get(h);
				if (void 0 !== t) {
					const i = M(t).pop();
					j(s), v(s, void 0, i), p(s, [i]);
				}
			}
			this.it = e;
		} else this.it = void 0;
		return this.render(e);
	}
});
//#endregion
//#region ../grid-core/dist/model/GridConfig.js
function normalizePageSize(value) {
	return Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : 50;
}
function normalizePageIndex(value) {
	return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}
function normalizeConfig(config = {}) {
	return {
		selection: {
			mode: config.selection?.mode ?? "none",
			checkboxes: config.selection?.checkboxes ?? false
		},
		rowHeader: {
			enabled: config.rowHeader?.enabled ?? false,
			width: config.rowHeader?.width ?? 56
		},
		pagination: {
			enabled: config.pagination?.enabled ?? false,
			pageSize: normalizePageSize(config.pagination?.pageSize),
			pageIndex: normalizePageIndex(config.pagination?.pageIndex)
		}
	};
}
//#endregion
//#region ../grid-core/dist/utils/range.js
function getRowRange(startIndex, endIndex) {
	const firstIndex = Math.min(startIndex, endIndex);
	const lastIndex = Math.max(startIndex, endIndex);
	const rowIndexes = /* @__PURE__ */ new Set();
	for (let index = firstIndex; index <= lastIndex; index += 1) rowIndexes.add(index);
	return rowIndexes;
}
//#endregion
//#region ../grid-core/dist/features/selection/selection.js
function createEmptySelection(mode) {
	return {
		mode,
		rowIndex: null,
		columnKey: null,
		anchorRowIndex: null,
		rowIndexes: /* @__PURE__ */ new Set(),
		cells: /* @__PURE__ */ new Set()
	};
}
function getCellKey(rowIndex, columnKey) {
	return `${rowIndex}:${columnKey}`;
}
function getNextRowSelection(selection, mode, rowIndex, intent) {
	if (mode === "row") return {
		...createEmptySelection("row"),
		rowIndex,
		anchorRowIndex: rowIndex,
		rowIndexes: new Set([rowIndex])
	};
	if (mode !== "multi-row") return null;
	if (intent === "range") {
		const anchorRowIndex = selection.anchorRowIndex ?? rowIndex;
		return {
			...createEmptySelection("multi-row"),
			rowIndex,
			anchorRowIndex,
			rowIndexes: getRowRange(anchorRowIndex, rowIndex)
		};
	}
	if (intent === "toggle") {
		const rowIndexes = new Set(selection.rowIndexes);
		if (rowIndexes.has(rowIndex)) rowIndexes.delete(rowIndex);
		else rowIndexes.add(rowIndex);
		return {
			...createEmptySelection("multi-row"),
			rowIndex: rowIndexes.has(rowIndex) ? rowIndex : null,
			anchorRowIndex: rowIndex,
			rowIndexes
		};
	}
	return {
		...createEmptySelection("multi-row"),
		rowIndex,
		anchorRowIndex: rowIndex,
		rowIndexes: new Set([rowIndex])
	};
}
function getNextCellSelection(selection, mode, rowIndex, columnKey) {
	if (mode === "cell") return {
		...createEmptySelection("cell"),
		rowIndex,
		columnKey,
		cells: new Set([getCellKey(rowIndex, columnKey)])
	};
	if (mode !== "multi-cell") return null;
	const cellKey = getCellKey(rowIndex, columnKey);
	const cells = new Set(selection.cells);
	if (cells.has(cellKey)) cells.delete(cellKey);
	else cells.add(cellKey);
	return {
		...createEmptySelection("multi-cell"),
		rowIndex: cells.has(cellKey) ? rowIndex : null,
		columnKey: cells.has(cellKey) ? columnKey : null,
		cells
	};
}
//#endregion
//#region ../grid-core/dist/features/filtering/filtering.js
function getRowFilterValue(row, columnKey) {
	if (row && typeof row === "object" && !Array.isArray(row) && columnKey in row) return row[columnKey];
	return row;
}
function isEmpty(value) {
	return value === null || value === void 0 || value === "";
}
function normalizeText(value) {
	return String(value ?? "").toLocaleLowerCase();
}
function compareValues$1(left, right) {
	if (typeof left === "number") {
		const numericRight = typeof right === "number" ? right : Number(right);
		if (!Number.isNaN(numericRight)) return left - numericRight;
	}
	return normalizeText(left).localeCompare(normalizeText(right));
}
function matchesFilter(value, filter) {
	switch (filter.operator) {
		case "isEmpty": return isEmpty(value);
		case "isNotEmpty": return !isEmpty(value);
		case "contains": return normalizeText(value).includes(normalizeText(filter.value));
		case "equals": return compareValues$1(value, filter.value) === 0;
		case "startsWith": return normalizeText(value).startsWith(normalizeText(filter.value));
		case "endsWith": return normalizeText(value).endsWith(normalizeText(filter.value));
		case "greaterThan": return compareValues$1(value, filter.value) > 0;
		case "greaterThanOrEqual": return compareValues$1(value, filter.value) >= 0;
		case "lessThan": return compareValues$1(value, filter.value) < 0;
		case "lessThanOrEqual": return compareValues$1(value, filter.value) <= 0;
	}
}
function applyFilterData(data, filters) {
	if (filters.length === 0) return data.slice();
	return data.filter((row) => filters.every((filter) => matchesFilter(getRowFilterValue(row, filter.columnKey), filter)));
}
//#endregion
//#region ../grid-core/dist/features/quick-search/quickSearch.js
function normalizeQuery(query) {
	return query.trim().toLocaleLowerCase();
}
function matchesValue(value, query) {
	return (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") && String(value).toLocaleLowerCase().includes(query);
}
function matchesRow(row, query) {
	if (row && typeof row === "object" && !Array.isArray(row)) return Object.values(row).some((value) => matchesValue(value, query));
	return matchesValue(row, query);
}
function applyQuickSearch(data, query) {
	const normalizedQuery = normalizeQuery(query);
	if (!normalizedQuery) return data.slice();
	return data.filter((row) => matchesRow(row, normalizedQuery));
}
//#endregion
//#region ../grid-core/dist/features/sorting/sorting.js
function getRowSortValue(row, columnKey) {
	if (row && typeof row === "object" && !Array.isArray(row) && columnKey in row) return row[columnKey];
	return row;
}
function normalizeSortValue(value) {
	if (value === null || value === void 0) return "";
	if (typeof value === "number") return value;
	return String(value).toLowerCase();
}
function compareValues(left, right) {
	const normalizedLeft = normalizeSortValue(left);
	const normalizedRight = normalizeSortValue(right);
	if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") return normalizedLeft - normalizedRight;
	return String(normalizedLeft).localeCompare(String(normalizedRight));
}
function applySortData(data, sort) {
	if (!sort.columnKey || !sort.direction) return data.slice();
	return data.slice().sort((a, b) => {
		const comparison = compareValues(getRowSortValue(a, sort.columnKey), getRowSortValue(b, sort.columnKey));
		return sort.direction === "asc" ? comparison : -comparison;
	});
}
//#endregion
//#region ../grid-core/dist/features/transforms/applyDataTransforms.js
function applyDataTransforms(data, quickSearchQuery, filters, sort) {
	return applySortData(applyFilterData(applyQuickSearch(data, quickSearchQuery), filters), sort);
}
//#endregion
//#region ../grid-core/dist/features/pagination/pagination.js
function getPageCount(totalRows, pageSize) {
	return totalRows === 0 ? 0 : Math.ceil(totalRows / pageSize);
}
function clampPageIndex(pageIndex, pageCount) {
	return pageCount === 0 ? 0 : Math.min(Math.max(0, pageIndex), pageCount - 1);
}
function createPaginationState(enabled, pageSize, pageIndex = 0, totalRows = 0) {
	const pageCount = getPageCount(totalRows, pageSize);
	return {
		enabled,
		pageSize,
		pageIndex: clampPageIndex(pageIndex, pageCount),
		totalRows,
		pageCount
	};
}
function paginateData(data, pagination) {
	if (!pagination.enabled) return data;
	const start = pagination.pageIndex * pagination.pageSize;
	return data.slice(start, start + pagination.pageSize);
}
//#endregion
//#region ../grid-core/dist/core/createGridEngine.js
function createGridEngine(config = {}) {
	const initialConfig = normalizeConfig(config);
	let state = {
		config: initialConfig,
		originalData: [],
		transformedData: [],
		data: [],
		sort: {
			columnKey: null,
			direction: null
		},
		quickSearchQuery: "",
		filters: [],
		pagination: createPaginationState(initialConfig.pagination.enabled, initialConfig.pagination.pageSize, initialConfig.pagination.pageIndex),
		selection: createEmptySelection(initialConfig.selection.mode)
	};
	function refreshData() {
		state.transformedData = applyDataTransforms(state.originalData, state.quickSearchQuery, state.filters, state.sort);
		const pageCount = Math.ceil(state.transformedData.length / state.pagination.pageSize);
		state.pagination = {
			...state.pagination,
			totalRows: state.transformedData.length,
			pageCount,
			pageIndex: clampPageIndex(state.pagination.pageIndex, pageCount)
		};
		state.data = paginateData(state.transformedData, state.pagination);
	}
	function resetPage() {
		state.pagination = {
			...state.pagination,
			pageIndex: 0
		};
	}
	return {
		setConfig(config) {
			const nextConfig = normalizeConfig(config);
			state.config = nextConfig;
			state.pagination = createPaginationState(nextConfig.pagination.enabled, nextConfig.pagination.pageSize, nextConfig.pagination.pageIndex, state.transformedData.length);
			refreshData();
			if (state.selection.mode !== nextConfig.selection.mode) state.selection = createEmptySelection(nextConfig.selection.mode);
		},
		getConfig() {
			return state.config;
		},
		setData(data) {
			state.originalData = data ?? [];
			resetPage();
			refreshData();
		},
		getRows() {
			return state.data;
		},
		setQuickSearch(query) {
			state.quickSearchQuery = typeof query === "string" ? query : "";
			resetPage();
			refreshData();
		},
		clearQuickSearch() {
			state.quickSearchQuery = "";
			resetPage();
			refreshData();
		},
		getQuickSearch() {
			return state.quickSearchQuery;
		},
		setFilter(filter) {
			state.filters = [...state.filters.filter((item) => item.columnKey !== filter.columnKey), { ...filter }];
			resetPage();
			refreshData();
		},
		clearFilter(columnKey) {
			state.filters = columnKey ? state.filters.filter((item) => item.columnKey !== columnKey) : [];
			resetPage();
			refreshData();
		},
		getFilters() {
			return state.filters.slice();
		},
		setPage(pageIndex) {
			const nextPageIndex = Number.isFinite(pageIndex) ? Math.max(0, Math.floor(pageIndex)) : 0;
			state.pagination = {
				...state.pagination,
				pageIndex: clampPageIndex(nextPageIndex, state.pagination.pageCount)
			};
			state.data = paginateData(state.transformedData, state.pagination);
		},
		setPageSize(pageSize) {
			if (!Number.isFinite(pageSize) || pageSize <= 0) return;
			state.pagination = {
				...state.pagination,
				pageSize: Math.max(1, Math.floor(pageSize)),
				pageIndex: 0
			};
			refreshData();
		},
		getPagination() {
			return { ...state.pagination };
		},
		getTotalRowCount() {
			return state.pagination.totalRows;
		},
		sortBy(columnKey, direction) {
			state.sort = {
				columnKey,
				direction
			};
			resetPage();
			refreshData();
		},
		clearSort() {
			state.sort = {
				columnKey: null,
				direction: null
			};
			resetPage();
			refreshData();
		},
		getSort() {
			return state.sort;
		},
		getRowCount() {
			return state.data.length;
		},
		getVisibleRows(startIndex, endIndex) {
			return state.data.slice(startIndex, endIndex);
		},
		selectRow(rowIndex, intent = "replace") {
			const nextSelection = getNextRowSelection(state.selection, state.config.selection.mode, rowIndex, intent);
			if (nextSelection) state.selection = nextSelection;
		},
		selectAllRows() {
			if (state.config.selection.mode !== "multi-row") return;
			const rowIndexes = /* @__PURE__ */ new Set();
			for (let rowIndex = 0; rowIndex < state.data.length; rowIndex += 1) rowIndexes.add(rowIndex);
			state.selection = {
				...createEmptySelection("multi-row"),
				rowIndex: state.data.length > 0 ? state.data.length - 1 : null,
				anchorRowIndex: state.data.length > 0 ? 0 : null,
				rowIndexes
			};
		},
		selectCell(rowIndex, columnKey) {
			const nextSelection = getNextCellSelection(state.selection, state.config.selection.mode, rowIndex, columnKey);
			if (nextSelection) state.selection = nextSelection;
		},
		clearSelection() {
			state.selection = createEmptySelection(state.config.selection.mode);
		},
		getSelection() {
			return state.selection;
		},
		isRowSelected(rowIndex) {
			return (state.selection.mode === "row" || state.selection.mode === "multi-row") && state.selection.rowIndexes.has(rowIndex);
		},
		isCellSelected(rowIndex, columnKey) {
			return (state.selection.mode === "cell" || state.selection.mode === "multi-cell") && state.selection.cells.has(getCellKey(rowIndex, columnKey));
		}
	};
}
//#endregion
//#region ../grid-renderer/dist/utils/math.js
function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}
function sumSizes(sizes, startIndex, endIndex) {
	let total = 0;
	for (let index = startIndex; index < endIndex; index += 1) total += Math.max(1, sizes[index] ?? 0);
	return total;
}
//#endregion
//#region ../grid-renderer/dist/virtualization/createVirtualizer.js
function createVirtualizer({ rowHeight, viewportHeight, overscan = 4 }) {
	let state = {
		rowHeight,
		viewportHeight,
		overscan,
		scrollTop: 0
	};
	return {
		setOptions(next) {
			state = {
				...state,
				...next
			};
		},
		setScrollTop(scrollTop) {
			state.scrollTop = scrollTop;
		},
		setScrollOffset(scrollTop) {
			state.scrollTop = scrollTop;
		},
		getState(count) {
			const safeCount = Math.max(0, count);
			const safeRowHeight = Math.max(1, state.rowHeight);
			const safeViewportHeight = Math.max(0, state.viewportHeight);
			const safeOverscan = Math.max(0, state.overscan);
			const visibleCount = Math.max(1, Math.ceil(safeViewportHeight / safeRowHeight));
			const maxStartIndex = Math.max(0, safeCount - visibleCount);
			const baseStartIndex = clamp(Math.floor(state.scrollTop / safeRowHeight), 0, maxStartIndex);
			const startIndex = clamp(baseStartIndex - safeOverscan, 0, safeCount);
			const endIndex = clamp(baseStartIndex + visibleCount + safeOverscan, startIndex, safeCount);
			const offsetTop = startIndex * safeRowHeight;
			const totalHeight = safeCount * safeRowHeight;
			const visibleSize = (endIndex - startIndex) * safeRowHeight;
			return {
				startIndex,
				endIndex,
				offsetTop,
				bottomPadding: Math.max(0, totalHeight - endIndex * safeRowHeight),
				totalHeight,
				totalSize: totalHeight,
				visibleCount,
				visibleSize
			};
		}
	};
}
//#endregion
//#region ../grid-renderer/dist/virtualization/createVariableVirtualizer.js
function createVariableVirtualizer({ sizes, viewportSize, overscan = 2 }) {
	let state = {
		sizes,
		viewportSize,
		overscan,
		scrollOffset: 0
	};
	return {
		setOptions(next) {
			state = {
				...state,
				...next
			};
		},
		setScrollOffset(scrollOffset) {
			state.scrollOffset = scrollOffset;
		},
		getState() {
			const sizes = state.sizes.map((size) => Math.max(1, size));
			const count = sizes.length;
			const totalSize = sumSizes(sizes, 0, count);
			const safeViewportSize = Math.max(0, state.viewportSize);
			const safeOverscan = Math.max(0, state.overscan);
			const safeScrollOffset = clamp(state.scrollOffset, 0, totalSize);
			let baseStartIndex = 0;
			let baseStartOffset = 0;
			while (baseStartIndex < count && baseStartOffset + sizes[baseStartIndex] <= safeScrollOffset) {
				baseStartOffset += sizes[baseStartIndex];
				baseStartIndex += 1;
			}
			let visibleEndIndex = baseStartIndex;
			let visibleEndOffset = baseStartOffset;
			while (visibleEndIndex < count && visibleEndOffset < safeScrollOffset + safeViewportSize) {
				visibleEndOffset += sizes[visibleEndIndex];
				visibleEndIndex += 1;
			}
			const startIndex = clamp(baseStartIndex - safeOverscan, 0, count);
			const endIndex = clamp(visibleEndIndex + safeOverscan, startIndex, count);
			const leftPadding = sumSizes(sizes, 0, startIndex);
			const visibleSize = sumSizes(sizes, startIndex, endIndex);
			const rightPadding = Math.max(0, totalSize - leftPadding - visibleSize);
			return {
				startIndex,
				endIndex,
				leftPadding,
				rightPadding,
				offsetTop: leftPadding,
				bottomPadding: rightPadding,
				totalSize,
				visibleSize
			};
		}
	};
}
//#endregion
//#region ../grid-renderer/dist/viewport/scrollMapping.js
function mapDisplayScrollOffset({ displayScrollOffset, previousDisplayScrollOffset, displaySize, totalSize, viewportSize }) {
	const availableDisplaySize = Math.max(0, displaySize - viewportSize);
	const availableVirtualSize = Math.max(0, totalSize - viewportSize);
	if (totalSize > 0 && availableDisplaySize > 0 && availableVirtualSize > 0) {
		const desiredScrollOffset = displayScrollOffset / availableDisplaySize * availableVirtualSize;
		let scrollOffset = clamp(Number.isFinite(desiredScrollOffset) ? desiredScrollOffset : 0, 0, availableVirtualSize);
		if (displayScrollOffset >= previousDisplayScrollOffset && displayScrollOffset >= Math.max(0, availableDisplaySize - 1)) scrollOffset = availableVirtualSize;
		return {
			availableDisplaySize,
			availableVirtualSize,
			scrollOffset
		};
	}
	return {
		availableDisplaySize,
		availableVirtualSize,
		scrollOffset: clamp(displayScrollOffset, 0, availableVirtualSize)
	};
}
function calculateDisplayLayout({ totalSize, displaySize, virtualOffsetTop, visibleSize, bottomPadding }) {
	const displayScale = totalSize > 0 ? displaySize / totalSize : 1;
	return {
		displayScale,
		displayOffsetTop: Math.min(virtualOffsetTop * displayScale, Math.max(0, displaySize - visibleSize)),
		displayBottomPadding: bottomPadding * displayScale
	};
}
//#endregion
//#region ../grid-web/dist/theme/darkTheme.js
/**
* Dark semantic color tokens for the Community Edition grid.
* Consumers can override these custom properties on `yc-grid`.
*/
var darkThemeStyles = i$5`
  :host([theme='dark']) {
    --litgrid-color-text: #e2e8f0;
    --litgrid-color-text-strong: #f8fafc;
    --litgrid-color-text-muted: #cbd5e1;
    --litgrid-color-text-subtle: #94a3b8;
    --litgrid-color-text-header: #e2e8f0;
    --litgrid-color-surface: #0f172a;
    --litgrid-color-surface-subtle: #1e293b;
    --litgrid-color-surface-hover: #334155;
    --litgrid-color-row-start: rgba(30, 41, 59, 0.9);
    --litgrid-color-row-end: rgba(15, 23, 42, 0.95);
    --litgrid-color-border: #475569;
    --litgrid-color-border-strong: #64748b;
    --litgrid-color-border-subtle: #334155;
    --litgrid-color-cell-border: #1e293b;
    --litgrid-color-row-border: #334155;
    --litgrid-color-accent: #60a5fa;
    --litgrid-color-accent-soft: #1e3a5f;
    --litgrid-color-accent-selected: #1d4ed8;
    --litgrid-color-accent-text: #dbeafe;
    --litgrid-color-resize-indicator: #94a3b8;
    --litgrid-color-control-hover: rgba(148, 163, 184, 0.2);
    --litgrid-shadow-shell: 0 12px 32px rgba(0, 0, 0, 0.35);
    --litgrid-shadow-menu: 0 12px 24px rgba(0, 0, 0, 0.45);
    --litgrid-shadow-dialog: 0 8px 20px rgba(0, 0, 0, 0.5);
  }
`;
//#endregion
//#region ../grid-web/dist/theme/lightTheme.js
/**
* Default semantic color tokens for the Community Edition grid.
* Consumers can override these custom properties on `yc-grid`.
*/
var lightThemeStyles = i$5`
  :host,
  :host([theme='light']) {
    --litgrid-color-text: #111827;
    --litgrid-color-text-strong: #0f172a;
    --litgrid-color-text-muted: #475569;
    --litgrid-color-text-subtle: #64748b;
    --litgrid-color-text-header: #334155;
    --litgrid-color-surface: #ffffff;
    --litgrid-color-surface-subtle: #f8fafc;
    --litgrid-color-surface-hover: #f1f5f9;
    --litgrid-color-row-start: rgba(249, 250, 251, 0.9);
    --litgrid-color-row-end: rgba(255, 255, 255, 0.95);
    --litgrid-color-border: #cbd5e1;
    --litgrid-color-border-strong: #d1d5db;
    --litgrid-color-border-subtle: #e2e8f0;
    --litgrid-color-cell-border: #eef2f7;
    --litgrid-color-row-border: #e5e7eb;
    --litgrid-color-accent: #2563eb;
    --litgrid-color-accent-soft: #dbeafe;
    --litgrid-color-accent-selected: #bfdbfe;
    --litgrid-color-accent-text: #1e3a8a;
    --litgrid-color-resize-indicator: #94a3b8;
    --litgrid-color-control-hover: rgba(148, 163, 184, 0.15);
    --litgrid-shadow-shell: 0 12px 32px rgba(15, 23, 42, 0.08);
    --litgrid-shadow-menu: 0 12px 24px rgba(15, 23, 42, 0.12);
    --litgrid-shadow-dialog: 0 8px 20px rgba(15, 23, 42, 0.15);
  }
`;
//#endregion
//#region ../grid-web/dist/sizing/columnSizing.js
function normalizeColumnWidth(width) {
	return Math.max(64, width);
}
function resolveColumnWidth(column, resizedWidth) {
	if (resizedWidth) return resizedWidth;
	if (typeof column.width === "number") return column.width;
	if (typeof column.width === "string" && /^\d+px$/.test(column.width)) return Number.parseInt(column.width, 10);
	return 160;
}
//#endregion
//#region ../grid-web/dist/sizing/rowSizing.js
function normalizeRowHeight(height) {
	return Math.max(28, height);
}
//#endregion
//#region ../grid-web/dist/clipboard/serializeSelectedCells.js
function isCellSelection(selection) {
	return selection.mode === "cell" || selection.mode === "multi-cell";
}
function serializeSelectedCells({ selection, rows, columns, getCellValue, formatValue }) {
	if (!isCellSelection(selection) || selection.cells.size === 0) return null;
	const selectedRows = [];
	const selectedColumns = [];
	for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) if (selection.cells.has(`${rowIndex}:${columns[columnIndex].key}`)) {
		selectedRows.push(rowIndex);
		selectedColumns.push(columnIndex);
	}
	if (selectedRows.length === 0 || selectedColumns.length === 0) return null;
	const firstRowIndex = Math.min(...selectedRows);
	const lastRowIndex = Math.max(...selectedRows);
	const firstColumnIndex = Math.min(...selectedColumns);
	const lastColumnIndex = Math.max(...selectedColumns);
	return Array.from({ length: lastRowIndex - firstRowIndex + 1 }, (_, rowOffset) => {
		const rowIndex = firstRowIndex + rowOffset;
		const row = rows[rowIndex];
		return Array.from({ length: lastColumnIndex - firstColumnIndex + 1 }, (_, columnOffset) => {
			const column = columns[firstColumnIndex + columnOffset];
			if (!selection.cells.has(`${rowIndex}:${column.key}`)) return "";
			return formatValue(getCellValue(column, row, rowIndex));
		}).join("	");
	}).join("\n");
}
//#endregion
//#region ../grid-web/dist/clipboard/serializeSelectedRows.js
function isRowSelection(selection) {
	return selection.mode === "row" || selection.mode === "multi-row";
}
function serializeSelectedRows({ selection, rows, columns, getCellValue, formatValue }) {
	if (!isRowSelection(selection) || selection.rowIndexes.size === 0) return null;
	const selectedRowIndexes = [...selection.rowIndexes].filter((rowIndex) => Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < rows.length).sort((left, right) => left - right);
	if (selectedRowIndexes.length === 0) return null;
	return selectedRowIndexes.map((rowIndex) => {
		const row = rows[rowIndex];
		return columns.map((column) => formatValue(getCellValue(column, row, rowIndex))).join("	");
	}).join("\n");
}
//#endregion
//#region ../grid-web/dist/columnState/columnState.js
function createColumnState(columns, widths, hiddenKeys) {
	return {
		version: 1,
		columns: columns.map((column) => {
			const width = widths.get(column.key);
			return {
				key: column.key,
				...width === void 0 ? {} : { width },
				visible: !hiddenKeys.has(column.key)
			};
		})
	};
}
function resolveColumnState(state, sourceColumns) {
	if (!isGridColumnState(state)) return null;
	const sourceByKey = new Map(sourceColumns.map((column) => [column.key, column]));
	const consumedKeys = /* @__PURE__ */ new Set();
	const columns = [];
	const widths = /* @__PURE__ */ new Map();
	const hiddenKeys = /* @__PURE__ */ new Set();
	for (const entry of state.columns) {
		const column = sourceByKey.get(entry.key);
		if (!column || consumedKeys.has(entry.key)) continue;
		consumedKeys.add(entry.key);
		columns.push(column);
		if (!entry.visible) hiddenKeys.add(entry.key);
		if (typeof entry.width === "number" && Number.isFinite(entry.width)) widths.set(entry.key, normalizeColumnWidth(entry.width));
	}
	for (const column of sourceColumns) {
		if (consumedKeys.has(column.key)) continue;
		columns.push(column);
		if (column.hidden) hiddenKeys.add(column.key);
	}
	return {
		columns,
		widths,
		hiddenKeys
	};
}
function parseColumnState(value) {
	if (!value) return null;
	try {
		const state = JSON.parse(value);
		return isGridColumnState(state) ? state : null;
	} catch {
		return null;
	}
}
function isGridColumnState(value) {
	if (!value || typeof value !== "object") return false;
	const state = value;
	if (state.version !== 1 || !Array.isArray(state.columns)) return false;
	return state.columns.every((column) => {
		if (!column || typeof column !== "object") return false;
		const entry = column;
		return typeof entry.key === "string" && typeof entry.visible === "boolean" && (entry.width === void 0 || typeof entry.width === "number");
	});
}
//#endregion
//#region ../grid-web/dist/components/DataGrid.js
var FILTER_OPERATORS = [
	{
		value: "contains",
		label: "Contains"
	},
	{
		value: "equals",
		label: "Equals"
	},
	{
		value: "startsWith",
		label: "Starts with"
	},
	{
		value: "endsWith",
		label: "Ends with"
	},
	{
		value: "isEmpty",
		label: "Is empty"
	},
	{
		value: "isNotEmpty",
		label: "Is not empty"
	},
	{
		value: "greaterThan",
		label: "Greater than"
	},
	{
		value: "greaterThanOrEqual",
		label: "Greater than or equal"
	},
	{
		value: "lessThan",
		label: "Less than"
	},
	{
		value: "lessThanOrEqual",
		label: "Less than or equal"
	}
];
var DataGrid = class DataGrid extends i$2 {
	static {
		this.nextInstanceId = 0;
	}
	static {
		this.properties = {
			theme: {
				type: String,
				reflect: true
			},
			ariaLabel: {
				type: String,
				attribute: "aria-label",
				reflect: true
			},
			ariaDescription: {
				type: String,
				attribute: "aria-description",
				reflect: true
			},
			screenReaderAnnouncements: {
				type: Boolean,
				attribute: "screen-reader-announcements",
				reflect: true
			}
		};
	}
	constructor() {
		super();
		this.gridId = `litgrid-${DataGrid.nextInstanceId++}`;
		this.engine = createGridEngine();
		this.fixedRowVirtualizer = createVirtualizer({
			rowHeight: 36,
			viewportHeight: 320,
			overscan: 4
		});
		this.variableRowVirtualizer = createVariableVirtualizer({
			sizes: [],
			viewportSize: 320,
			overscan: 4
		});
		this.columnVirtualizer = createVariableVirtualizer({
			sizes: [],
			viewportSize: 0,
			overscan: 2
		});
		this.rowHeight = 36;
		this.height = 320;
		this.overscan = 4;
		this.columnOverscan = 2;
		this._bestFitSampleSize = 10;
		this.horizontalScrollLeft = 0;
		this.viewportWidth = 0;
		this.scrollbarWidth = 0;
		this.columnDefs = [];
		this.sourceColumnDefs = [];
		this.columnWidths = /* @__PURE__ */ new Map();
		this.hiddenColumnKeys = /* @__PURE__ */ new Set();
		this._columnStateStorageKey = null;
		this.rowHeights = /* @__PURE__ */ new Map();
		this.bestFitWidths = /* @__PURE__ */ new Map();
		this.columnResizeState = null;
		this.rowResizeState = null;
		this.columnReorderState = null;
		this.columnDragPreview = null;
		this.previousBodyCursor = "";
		this.previousBodyUserSelect = "";
		this.activeHeaderMenu = null;
		this.columnChooserOpen = false;
		this.columnChooserPosition = null;
		this.quickSearchVisible = false;
		this.quickSearchDraft = "";
		this.quickSearchDebounceId = null;
		this.sourceRowCount = 0;
		this.filterDrafts = /* @__PURE__ */ new Map();
		this.measureContainer = null;
		this.viewportElement = null;
		this.scrollRAFId = null;
		this.pendingScrollTop = 0;
		this.pendingScrollLeft = 0;
		this.previousPendingScrollTop = 0;
		this.headerRowElement = null;
		this.activeCell = null;
		this.shouldFocusActiveCell = false;
		this.headerMenuTrigger = null;
		this.shouldFocusHeaderMenu = false;
		this.shouldRestoreHeaderMenuFocus = false;
		this.screenReaderMessage = "";
		this.lastScreenReaderAnnouncement = "";
		this.maxScrollableHeight = 67108864;
		this.lastTotalSize = 0;
		this.lastDisplayTotal = 0;
		this.quickSearchDebounceThreshold = 1e4;
		this.quickSearchDebounceMs = 150;
		this.textMeasureContext = null;
		this.handleColumnReorder = (event) => {
			const state = this.columnReorderState;
			if (!state) return;
			if (!state.hasMoved && Math.abs(event.clientX - state.startX) < 5) return;
			if (!state.hasMoved) {
				state.hasMoved = true;
				this.startBodyResize("grabbing");
			}
			this.updateColumnDragPreview(state.columnKey, event.clientX, event.clientY);
			const viewport = this.viewportElement ?? this.renderRoot.querySelector(".viewport");
			if (viewport) {
				const bounds = viewport.getBoundingClientRect();
				const edgeSize = 32;
				if (event.clientX < bounds.left + edgeSize) viewport.scrollLeft = Math.max(0, viewport.scrollLeft - 16);
				else if (event.clientX > bounds.right - edgeSize) viewport.scrollLeft += 16;
			}
			const target = Array.from(this.renderRoot.querySelectorAll(".header-cell[data-column-key]")).find((header) => {
				const bounds = header.getBoundingClientRect();
				return event.clientX >= bounds.left && event.clientX <= bounds.right;
			});
			if (!target) {
				this.requestUpdate();
				return;
			}
			const targetKey = target.dataset.columnKey;
			const targetIndex = this.getResolvedColumns().findIndex((column) => column.key === targetKey);
			if (targetIndex < 0) return;
			const bounds = target.getBoundingClientRect();
			let nextIndex = targetIndex + (event.clientX > bounds.left + bounds.width / 2 ? 1 : 0);
			if (state.sourceIndex < nextIndex) nextIndex -= 1;
			state.targetIndex = Math.max(0, Math.min(nextIndex, this.getResolvedColumns().length - 1));
			this.requestUpdate();
		};
		this.stopColumnReorder = () => {
			const state = this.columnReorderState;
			if (!state) return;
			this.columnReorderState = null;
			window.removeEventListener("pointermove", this.handleColumnReorder);
			window.removeEventListener("pointerup", this.stopColumnReorder);
			window.removeEventListener("pointercancel", this.stopColumnReorder);
			this.removeColumnDragPreview();
			if (state.hasMoved) this.stopBodyResize();
			if (state.hasMoved && state.sourceIndex !== state.targetIndex) this.moveColumn(state.columnKey, state.targetIndex);
			else this.requestUpdate();
		};
		this.handleColumnResize = (event) => {
			if (!this.columnResizeState) return;
			const nextWidth = Math.max(64, this.columnResizeState.startWidth + event.clientX - this.columnResizeState.startX);
			this.columnWidths.set(this.columnResizeState.columnKey, nextWidth);
			this.requestUpdate();
		};
		this.stopColumnResize = () => {
			if (!this.columnResizeState) return;
			this.columnResizeState = null;
			this.commitColumnState("resize");
			this.stopBodyResize();
			window.removeEventListener("pointermove", this.handleColumnResize);
			window.removeEventListener("pointerup", this.stopColumnResize);
		};
		this.handleRowResize = (event) => {
			if (!this.rowResizeState) return;
			const nextHeight = Math.max(28, this.rowResizeState.startHeight + event.clientY - this.rowResizeState.startY);
			this.setRowHeight(this.rowResizeState.rowIndex, nextHeight);
		};
		this.stopRowResize = () => {
			if (!this.rowResizeState) return;
			this.rowResizeState = null;
			this.stopBodyResize();
			window.removeEventListener("pointermove", this.handleRowResize);
			window.removeEventListener("pointerup", this.stopRowResize);
		};
		this.handleScroll = (event) => {
			const target = event.currentTarget;
			const scrollLeft = target?.scrollLeft ?? 0;
			this.pendingScrollTop = target?.scrollTop ?? 0;
			this.pendingScrollLeft = scrollLeft;
			this.horizontalScrollLeft = scrollLeft;
			this.headerRowElement = this.headerRowElement ?? this.renderRoot.querySelector(".header-column-row");
			if (this.headerRowElement) this.headerRowElement.style.transform = `translateX(${-scrollLeft}px)`;
			if (this.scrollRAFId !== null) return;
			this.scrollRAFId = requestAnimationFrame(() => {
				this.scrollRAFId = null;
				const rowVirtualizer = this.hasCustomRowHeights() ? this.variableRowVirtualizer : this.fixedRowVirtualizer;
				const measuredDisplay = this.lastDisplayTotal > 0 ? this.lastDisplayTotal : Math.min(this.lastTotalSize || 0, this.maxScrollableHeight);
				const viewportH = Math.max(0, this.height || 0);
				const scrollMapping = mapDisplayScrollOffset({
					displayScrollOffset: this.pendingScrollTop,
					previousDisplayScrollOffset: this.previousPendingScrollTop,
					displaySize: measuredDisplay,
					totalSize: this.lastTotalSize,
					viewportSize: viewportH
				});
				if (this.lastTotalSize > 6e6) console.log("[yc-grid] scroll map", {
					pendingScrollTop: this.pendingScrollTop,
					lastTotalSize: this.lastTotalSize,
					lastDisplayTotal: this.lastDisplayTotal,
					measuredDisplay,
					viewportH,
					availableDisplay: scrollMapping.availableDisplaySize,
					availableVirtual: scrollMapping.availableVirtualSize,
					mappedScrollOffset: scrollMapping.scrollOffset
				});
				rowVirtualizer.setScrollOffset(scrollMapping.scrollOffset);
				this.columnVirtualizer.setScrollOffset(this.pendingScrollLeft);
				this.previousPendingScrollTop = this.pendingScrollTop;
				this.requestUpdate();
			});
		};
		this.theme = "light";
		this.ariaLabel = "Data grid";
		this.ariaDescription = "";
		this.screenReaderAnnouncements = true;
	}
	static {
		this.styles = [
			lightThemeStyles,
			darkThemeStyles,
			i$5`
    :host {
      display: block;
      color: var(--litgrid-color-text);
      font: 14px/1.4 system-ui, sans-serif;
    }

    .shell {
      position: relative;
      border: 1px solid var(--litgrid-color-border-strong);
      border-radius: 12px;
      background: var(--litgrid-color-surface);
      box-shadow: var(--litgrid-shadow-shell);
      overflow: hidden;
    }

    .viewport {
      overflow: auto;
      height: var(--grid-height, 320px);
    }

    .screen-reader-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .header-column-row,
    .row {
      display: grid;
      grid-template-columns: var(--virtual-grid-template);
    }

    .header-shell {
      position: relative;
      z-index: 3;
      display: grid;
      grid-template-columns: var(--header-grid-template);
      border-bottom: 1px solid var(--litgrid-color-border);
      background: var(--litgrid-color-surface-subtle);
    }

    .header-clip {
      overflow: visible;
      z-index: 3;
    }

    .header-column-row {
      position: relative;
      z-index: 2;
      width: var(--total-column-width);
      color: var(--litgrid-color-text-header);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .header-cell,
    .row-header-cell,
    .cell {
      box-sizing: border-box;
      min-width: 0;
      padding: 0 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

        .header-cell {
      position: relative;
      z-index: 2;
      overflow: visible;
      height: 36px;
      display: flex;
      align-items: center;
      border-right: 1px solid var(--litgrid-color-border-subtle);
      cursor: grab;
      touch-action: none;
    }

    .header-cell-reordering {
      opacity: 0.55;
      cursor: grabbing;
    }

    .header-cell-drop-before::before,
    .header-cell-drop-after::after {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 4;
      width: 2px;
      background: var(--litgrid-color-accent);
      content: '';
      pointer-events: none;
    }

    .header-cell-drop-before::before {
      left: -1px;
    }

    .header-cell-drop-after::after {
      right: -1px;
    }

    .row-header-cell {
      position: sticky;
      left: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--row-header-width, 0px);
      border-right: 1px solid var(--litgrid-color-border);
      background: var(--litgrid-color-surface-subtle);
      color: var(--litgrid-color-text-subtle);
      font-size: 12px;
      font-weight: 600;
      user-select: none;
    }

    .header-row-header {
      position: relative;
      height: 36px;
      border-right: 1px solid var(--litgrid-color-border);
    }

    .header-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-actions {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      position: relative;
      z-index: 2;
    }

    .header-action-button {
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--litgrid-color-text-muted);
      font-size: 16px;
      line-height: 1;
      padding: 4px;
      border-radius: 4px;
    }

    .header-action-button:hover {
      background: var(--litgrid-color-control-hover);
    }

    .header-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      left: auto;
      display: flex;
      flex-direction: column;
      min-width: 180px;
      border: 1px solid var(--litgrid-color-border);
      border-radius: 8px;
      background: var(--litgrid-color-surface);
      box-shadow: var(--litgrid-shadow-menu);
      padding: 6px 0;
      z-index: 10000;
      pointer-events: auto;
    }

    .header-menu-right {
      left: 0;
      right: auto;
    }

    .header-menu button {
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      padding: 10px 12px;
      cursor: pointer;
      color: var(--litgrid-color-text-strong);
      font-size: 13px;
    }

    .header-menu-divider {
      height: 1px;
      margin: 6px 0;
      background: var(--litgrid-color-border-subtle);
      border: none;
    }

    .header-menu button:hover {
      background: var(--litgrid-color-surface-hover);
    }

    .quick-search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--litgrid-color-border);
      background: var(--litgrid-color-surface-subtle);
    }

    .quick-search input {
      flex: 1;
      min-width: 0;
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      color: var(--litgrid-color-text-strong);
      font: inherit;
      padding: 7px 9px;
    }

    .quick-search button {
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      color: var(--litgrid-color-text-strong);
      font: inherit;
      padding: 7px 9px;
      cursor: pointer;
    }

    .header-filter {
      display: grid;
      gap: 6px;
      padding: 8px 12px;
      border-top: 1px solid var(--litgrid-color-border-subtle);
    }

    .header-filter select,
    .header-filter input {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      border: 1px solid var(--litgrid-color-border);
      border-radius: 4px;
      padding: 6px 8px;
      font: inherit;
    }

    .header-filter-actions {
      display: flex;
      gap: 6px;
    }

    .header-filter-actions button {
      flex: 1;
      padding: 6px 8px;
    }

    .header-filter-indicator {
      margin-left: 4px;
      color: var(--litgrid-color-accent);
      font-size: 14px;
    }

    .resize-handle {
      position: absolute;
      top: 0;
      right: -4px;
      z-index: 1;
      width: 8px;
      height: 100%;
      cursor: col-resize;
      touch-action: none;
    }

    .resize-handle::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 3px;
      width: 1px;
      height: calc(100% - 16px);
      background: var(--litgrid-color-resize-indicator);
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .resize-handle:hover::after {
      opacity: 1;
    }

    .row-resize-handle {
      position: absolute;
      right: 0;
      bottom: -4px;
      left: 0;
      z-index: 2;
      height: 8px;
      cursor: row-resize;
      touch-action: none;
    }

    .row-resize-handle::after {
      content: '';
      position: absolute;
      right: 10px;
      bottom: 3px;
      left: 10px;
      height: 1px;
      background: var(--litgrid-color-resize-indicator);
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .row-resize-handle:hover::after {
      opacity: 1;
    }

    .header-cell:last-child,
    .cell:last-child {
      border-right: 0;
    }

    .column-spacer {
      min-width: 0;
    }

    .header-gutter {
      height: 36px;
      border-left: 1px solid var(--litgrid-color-border-subtle);
      background: var(--litgrid-color-surface-subtle);
    }

    .content {
      box-sizing: border-box;
      transform: translateY(var(--offset-top, 0px));
      width: var(--total-row-width);
    }

    .row {
      box-sizing: border-box;
      width: var(--total-row-width);
      border-bottom: 1px solid var(--litgrid-color-row-border);
      background:
        linear-gradient(90deg, var(--litgrid-color-row-start), var(--litgrid-color-row-end));
    }

    .row-selectable,
    .cell-selectable {
      cursor: pointer;
    }

    .row-selected {
      background: var(--litgrid-color-accent-soft);
      box-shadow: inset 3px 0 0 var(--litgrid-color-accent);
    }

    .row:last-child {
      border-bottom: 0;
    }

    .cell {
      display: flex;
      align-items: center;
      border-right: 1px solid var(--litgrid-color-cell-border);
    }

        .cell-selected {
      background: var(--litgrid-color-accent-selected);
      outline: 2px solid var(--litgrid-color-accent);
      outline-offset: -2px;
    }

    .cell-active {
      outline: 2px solid var(--litgrid-color-accent);
      outline-offset: -2px;
    }


    .row-selected .row-header-cell {
      background: var(--litgrid-color-accent-selected);
      color: var(--litgrid-color-accent-text);
    }

    .selection-checkbox {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: var(--litgrid-color-accent);
      cursor: pointer;
    }

    .selection-checkbox:disabled {
      cursor: default;
    }

            .column-chooser-dialog {
              position: absolute;
              top: 36px;
              right: 8px;
              z-index: 6;
      min-width: 180px;
      padding: 6px;
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      box-shadow: var(--litgrid-shadow-dialog);
    }

        .column-chooser-empty {
      display: flex;
      justify-content: flex-end;
      padding: 6px 8px;
      border-bottom: 1px solid var(--litgrid-color-border-subtle);
      background: var(--litgrid-color-surface-subtle);
    }

    .column-chooser-empty button {
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      color: var(--litgrid-color-text-header);
      font: inherit;
      padding: 4px 8px;
      cursor: pointer;
    }

        .column-chooser-dialog,
        .column-chooser-menu {
          padding-top: 34px;
        }

        .column-chooser-close {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 24px !important;
          min-width: 24px;
          height: 24px;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          color: var(--litgrid-color-text-muted);
          font-size: 20px !important;
          line-height: 1;
          cursor: pointer;
        }

        .column-chooser-dialog label,
        .column-chooser-menu label {
          display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 6px;
      color: var(--litgrid-color-text-header);
      cursor: pointer;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      min-height: 48px;
      padding: 8px 12px;
      border-top: 1px solid var(--litgrid-color-border);
      color: var(--litgrid-color-text-muted);
      font-size: 13px;
    }

    .pagination button,
    .pagination select {
      border: 1px solid var(--litgrid-color-border);
      border-radius: 6px;
      background: var(--litgrid-color-surface);
      color: var(--litgrid-color-text-strong);
      font: inherit;
      padding: 5px 8px;
    }

    .pagination button:not(:disabled) {
      cursor: pointer;
    }

    .pagination button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
      `
		];
	}
	firstUpdated() {
		this.updateScrollbarWidth();
	}
	updated() {
		this.updateScrollbarWidth();
		this.focusActiveCell();
		this.focusHeaderMenu();
		try {
			const spacer = this.renderRoot.querySelector(".viewport")?.firstElementChild;
			if (spacer instanceof HTMLElement) {
				const measured = spacer.offsetHeight || 0;
				if (measured > 0 && measured !== this.lastDisplayTotal) this.lastDisplayTotal = measured;
			}
		} catch (e) {}
	}
	disconnectedCallback() {
		this.stopColumnResize();
		this.stopRowResize();
		this.stopColumnReorder();
		this.clearQuickSearchDebounce();
		if (this.scrollRAFId !== null) {
			cancelAnimationFrame(this.scrollRAFId);
			this.scrollRAFId = null;
		}
		const viewportElement = this.renderRoot.querySelector(".viewport");
		if (viewportElement) viewportElement.removeEventListener("scroll", this.handleScroll);
		this.headerRowElement = null;
		if (this.measureContainer && this.measureContainer.parentNode) this.measureContainer.parentNode.removeChild(this.measureContainer);
		this.measureContainer = null;
		if (super.disconnectedCallback) super.disconnectedCallback();
	}
	updateVirtualizer(next = {}) {
		const options = {
			viewportSize: this.height,
			overscan: this.overscan,
			...next
		};
		this.height = options.viewportHeight ?? this.height;
		this.overscan = options.overscan;
		this.fixedRowVirtualizer.setOptions({
			rowHeight: this.rowHeight,
			viewportHeight: this.height,
			overscan: this.overscan
		});
		this.variableRowVirtualizer.setOptions(options);
	}
	updateScrollbarWidth() {
		const viewport = this.renderRoot.querySelector(".viewport");
		if (!(viewport instanceof HTMLElement)) return;
		const nextWidth = viewport.offsetWidth - viewport.clientWidth;
		const nextViewportWidth = viewport.clientWidth;
		if (nextWidth !== this.scrollbarWidth || nextViewportWidth !== this.viewportWidth) {
			this.scrollbarWidth = nextWidth;
			this.viewportWidth = nextViewportWidth;
			this.requestUpdate();
		}
	}
	getResolvedColumns() {
		if (this.columnDefs.length > 0) return this.columnDefs;
		const firstRow = this.engine.getRows()[0];
		if (firstRow && typeof firstRow === "object" && !Array.isArray(firstRow)) return Object.keys(firstRow).map((key) => ({
			key,
			header: key
		}));
		return [{
			key: "value",
			header: "Value",
			accessor: (row) => row
		}];
	}
	getVisibleColumns() {
		return this.getResolvedColumns().filter((column) => !this.hiddenColumnKeys.has(column.key));
	}
	getColumnWidth(column) {
		return resolveColumnWidth(column, this.columnWidths.get(column.key));
	}
	isRowHeaderEnabled() {
		return this.engine.getConfig().rowHeader.enabled;
	}
	hasCheckboxSelection() {
		const selection = this.engine.getConfig().selection;
		return selection.checkboxes && selection.mode === "multi-row";
	}
	isRowHeaderVisible() {
		return this.isRowHeaderEnabled() || this.hasCheckboxSelection();
	}
	getRowHeaderWidth() {
		return this.isRowHeaderVisible() ? this.engine.getConfig().rowHeader.width : 0;
	}
	getRowHeight(rowIndex) {
		return this.rowHeights.get(rowIndex) ?? this.rowHeight;
	}
	get bestFitSampleSize() {
		return this._bestFitSampleSize;
	}
	set bestFitSampleSize(value) {
		if (this._bestFitSampleSize === value) return;
		this._bestFitSampleSize = value;
		this.clearBestFitWidths();
	}
	clearBestFitWidths() {
		this.bestFitWidths.clear();
	}
	getBestFitWidth(columnKey, sampleSize) {
		return this.bestFitWidths.get(columnKey)?.get(sampleSize);
	}
	setBestFitWidth(columnKey, sampleSize, width) {
		const widths = this.bestFitWidths.get(columnKey) ?? /* @__PURE__ */ new Map();
		widths.set(sampleSize, width);
		this.bestFitWidths.set(columnKey, widths);
	}
	getRowSizes() {
		const count = this.engine.getRowCount();
		return Array.from({ length: count }, (_, index) => normalizeRowHeight(this.getRowHeight(index)));
	}
	hasCustomRowHeights() {
		return this.rowHeights.size > 0;
	}
	setRowHeight(rowIndex, height) {
		this.rowHeights.set(rowIndex, normalizeRowHeight(height));
		this.requestUpdate();
	}
	resetRowHeight(rowIndex) {
		this.rowHeights.delete(rowIndex);
		this.requestUpdate();
	}
	resetAllRowHeights() {
		this.rowHeights.clear();
		this.requestUpdate();
	}
	setColumnWidth(columnKey, width) {
		const nextWidth = normalizeColumnWidth(width);
		if (this.columnWidths.get(columnKey) === nextWidth) return;
		this.columnWidths.set(columnKey, nextWidth);
		this.requestUpdate();
		this.commitColumnState("resize");
	}
	resetColumnWidth(columnKey) {
		if (!this.columnWidths.delete(columnKey)) return;
		this.requestUpdate();
		this.commitColumnState("resize");
	}
	resetAllColumnWidths() {
		if (this.columnWidths.size === 0) return;
		this.columnWidths.clear();
		this.requestUpdate();
		this.commitColumnState("resize");
	}
	getColumnOrder() {
		return this.getResolvedColumns().map((column) => column.key);
	}
	applyColumnOrder(columnDefs, columnKey, previousIndex, currentIndex) {
		this.columnDefs = columnDefs;
		this.requestUpdate();
		this.dispatchEvent(new CustomEvent("column-reorder", {
			bubbles: true,
			composed: true,
			detail: {
				columnKey,
				previousIndex,
				currentIndex,
				columnOrder: this.getColumnOrder()
			}
		}));
		this.commitColumnState("reorder");
	}
	moveColumn(columnKey, targetIndex) {
		const columns = this.getResolvedColumns();
		const previousIndex = columns.findIndex((column) => column.key === columnKey);
		if (previousIndex < 0) return;
		const currentIndex = Math.max(0, Math.min(Math.floor(targetIndex), columns.length - 1));
		if (previousIndex === currentIndex) return;
		const nextColumns = [...columns];
		const [column] = nextColumns.splice(previousIndex, 1);
		nextColumns.splice(currentIndex, 0, column);
		this.applyColumnOrder(nextColumns, columnKey, previousIndex, currentIndex);
	}
	setColumnOrder(columnKeys) {
		const columns = this.getResolvedColumns();
		const columnsByKey = new Map(columns.map((column) => [column.key, column]));
		const seen = /* @__PURE__ */ new Set();
		const orderedColumns = [];
		for (const key of columnKeys) {
			const column = columnsByKey.get(key);
			if (column && !seen.has(key)) {
				seen.add(key);
				orderedColumns.push(column);
			}
		}
		for (const column of columns) if (!seen.has(column.key)) orderedColumns.push(column);
		const previousOrder = columns.map((column) => column.key);
		const currentOrder = orderedColumns.map((column) => column.key);
		if (previousOrder.every((key, index) => key === currentOrder[index])) return;
		this.columnDefs = orderedColumns;
		this.activeCell = null;
		this.requestUpdate();
		this.commitColumnState("reorder");
	}
	resetColumnOrder() {
		const sourceOrder = this.sourceColumnDefs.map((column) => column.key);
		if (this.getColumnOrder().every((key, index) => key === sourceOrder[index])) return;
		this.columnDefs = [...this.sourceColumnDefs];
		this.activeCell = null;
		this.requestUpdate();
		this.commitColumnState("reorder");
	}
	setColumnVisible(columnKey, visible) {
		if (!this.getResolvedColumns().some((column) => column.key === columnKey)) return;
		if (this.isColumnVisible(columnKey) === visible) return;
		const activeColumnKey = this.activeCell ? this.getVisibleColumns()[this.activeCell.columnIndex]?.key : void 0;
		if (visible) this.hiddenColumnKeys.delete(columnKey);
		else this.hiddenColumnKeys.add(columnKey);
		if (this.activeCell) {
			const nextColumnIndex = this.getVisibleColumns().findIndex((column) => column.key === activeColumnKey);
			this.activeCell = nextColumnIndex < 0 ? null : {
				...this.activeCell,
				columnIndex: nextColumnIndex
			};
		}
		this.requestUpdate();
		this.announceScreenReader(`${this.getColumnLabel(columnKey)} column ${visible ? "shown" : "hidden"}.`);
		this.dispatchEvent(new CustomEvent("column-visibility-change", {
			bubbles: true,
			composed: true,
			detail: {
				columnKey,
				visible,
				visibleColumnKeys: this.getVisibleColumnKeys()
			}
		}));
		this.commitColumnState("visibility");
	}
	isColumnVisible(columnKey) {
		return this.getResolvedColumns().some((column) => column.key === columnKey) && !this.hiddenColumnKeys.has(columnKey);
	}
	getVisibleColumnKeys() {
		return this.getVisibleColumns().map((column) => column.key);
	}
	getColumnState() {
		return createColumnState(this.getResolvedColumns(), this.columnWidths, this.hiddenColumnKeys);
	}
	setColumnState(state) {
		const resolvedState = resolveColumnState(state, this.sourceColumnDefs);
		if (!resolvedState) return;
		this.columnDefs = resolvedState.columns;
		this.columnWidths = resolvedState.widths;
		this.hiddenColumnKeys = resolvedState.hiddenKeys;
		this.activeCell = null;
		this.requestUpdate();
		this.commitColumnState("set");
	}
	resetColumnState() {
		this.columnDefs = [...this.sourceColumnDefs];
		this.columnWidths.clear();
		this.hiddenColumnKeys = new Set(this.sourceColumnDefs.filter((column) => column.hidden).map((column) => column.key));
		this.activeCell = null;
		this.removePersistedColumnState();
		this.requestUpdate();
		this.dispatchColumnStateChange("reset");
	}
	getColumnStateStorage() {
		try {
			return globalThis.localStorage;
		} catch {
			return null;
		}
	}
	restorePersistedColumnState() {
		if (!this._columnStateStorageKey || this.sourceColumnDefs.length === 0) return;
		const storage = this.getColumnStateStorage();
		if (!storage) return;
		try {
			const state = parseColumnState(storage.getItem(this._columnStateStorageKey));
			const resolvedState = state && resolveColumnState(state, this.sourceColumnDefs);
			if (!resolvedState) return;
			this.columnDefs = resolvedState.columns;
			this.columnWidths = resolvedState.widths;
			this.hiddenColumnKeys = resolvedState.hiddenKeys;
			this.activeCell = null;
			this.requestUpdate();
			this.dispatchColumnStateChange("restore");
		} catch {}
	}
	persistColumnState() {
		if (!this._columnStateStorageKey) return;
		const storage = this.getColumnStateStorage();
		if (!storage) return;
		try {
			storage.setItem(this._columnStateStorageKey, JSON.stringify(this.getColumnState()));
		} catch {}
	}
	removePersistedColumnState() {
		if (!this._columnStateStorageKey) return;
		const storage = this.getColumnStateStorage();
		if (!storage) return;
		try {
			storage.removeItem(this._columnStateStorageKey);
		} catch {}
	}
	commitColumnState(reason) {
		this.persistColumnState();
		this.dispatchColumnStateChange(reason);
	}
	dispatchColumnStateChange(reason) {
		this.dispatchEvent(new CustomEvent("column-state-change", {
			bubbles: true,
			composed: true,
			detail: {
				reason,
				state: this.getColumnState()
			}
		}));
	}
	resetColumnVisibility() {
		const hiddenColumnKeys = new Set(this.getResolvedColumns().filter((column) => column.hidden).map((column) => column.key));
		for (const column of this.getResolvedColumns()) this.setColumnVisible(column.key, !hiddenColumnKeys.has(column.key));
	}
	toggleHeaderMenu(columnKey, event) {
		event.stopPropagation();
		this.columnChooserOpen = false;
		this.columnChooserPosition = null;
		if (this.activeHeaderMenu !== columnKey) {
			const activeFilter = this.engine.getFilters().find((filter) => filter.columnKey === columnKey);
			this.filterDrafts.set(columnKey, activeFilter ?? {
				columnKey,
				operator: "contains",
				value: ""
			});
		}
		const isOpening = this.activeHeaderMenu !== columnKey;
		this.activeHeaderMenu = isOpening ? columnKey : null;
		this.headerMenuTrigger = isOpening && event.currentTarget instanceof HTMLButtonElement ? event.currentTarget : null;
		this.shouldFocusHeaderMenu = isOpening;
		this.requestUpdate();
	}
	closeHeaderMenu(restoreFocus = false) {
		if (this.activeHeaderMenu === null && !this.columnChooserOpen) return;
		this.activeHeaderMenu = null;
		this.columnChooserOpen = false;
		this.columnChooserPosition = null;
		this.shouldFocusHeaderMenu = false;
		this.shouldRestoreHeaderMenuFocus = restoreFocus && this.headerMenuTrigger !== null;
		this.requestUpdate();
	}
	toggleColumnChooser(event) {
		if (this.columnChooserOpen) {
			this.closeColumnChooser(true);
			return;
		}
		if (event?.currentTarget instanceof HTMLElement) {
			const shell = this.renderRoot.querySelector(".shell");
			const anchorBounds = (event.currentTarget.closest(".header-menu") ?? event.currentTarget).getBoundingClientRect();
			const shellBounds = shell?.getBoundingClientRect();
			this.columnChooserPosition = shellBounds ? {
				left: anchorBounds.left - shellBounds.left,
				top: anchorBounds.top - shellBounds.top
			} : null;
		} else this.columnChooserPosition = null;
		this.columnChooserOpen = true;
		this.activeHeaderMenu = null;
		this.shouldFocusHeaderMenu = true;
		this.requestUpdate();
	}
	closeColumnChooser(restoreFocus = false) {
		if (!this.columnChooserOpen) return;
		this.columnChooserOpen = false;
		this.columnChooserPosition = null;
		this.shouldFocusHeaderMenu = false;
		this.shouldRestoreHeaderMenuFocus = restoreFocus && this.headerMenuTrigger !== null;
		this.requestUpdate();
	}
	focusHeaderMenu() {
		if (this.shouldRestoreHeaderMenuFocus) {
			this.shouldRestoreHeaderMenuFocus = false;
			this.headerMenuTrigger?.focus();
			this.headerMenuTrigger = null;
			return;
		}
		if (!this.shouldFocusHeaderMenu) return;
		const firstControl = this.renderRoot.querySelector(".header-menu button, .header-menu input, .header-menu select, .column-chooser-dialog button, .column-chooser-dialog input");
		if (firstControl) {
			this.shouldFocusHeaderMenu = false;
			firstControl.focus();
		}
	}
	handleShellKeyDown(event) {
		if (event.key !== "Escape" || this.activeHeaderMenu === null && !this.columnChooserOpen) return;
		event.preventDefault();
		event.stopPropagation();
		this.closeHeaderMenu(true);
	}
	handleViewportFocus(event) {
		if (event.target !== event.currentTarget || this.activeCell) return;
		this.setActiveCell(0, 0);
		this.requestUpdate();
	}
	announceScreenReader(message) {
		if (!this.screenReaderAnnouncements || !message || message === this.lastScreenReaderAnnouncement) return;
		this.lastScreenReaderAnnouncement = message;
		this.screenReaderMessage = message;
		this.requestUpdate();
	}
	getScreenReaderDescription() {
		return this.ariaDescription || "Use arrow keys to move between cells. Press Enter or Space to select. Press Control or Command C to copy selected cells or rows.";
	}
	getColumnLabel(columnKey) {
		return (this.getVisibleColumns().find((item) => item.key === columnKey) ?? this.getResolvedColumns().find((item) => item.key === columnKey))?.header ?? columnKey;
	}
	getActiveCellAnnouncement() {
		if (!this.activeCell) return "";
		const { rowIndex, columnIndex } = this.activeCell;
		const column = this.getVisibleColumns()[columnIndex];
		const row = this.engine.getVisibleRows(rowIndex, rowIndex + 1)[0];
		if (!column || row === void 0) return "";
		const value = this.formatCellValue(this.getCellValue(column, row, rowIndex)) || "blank";
		const selected = this.isCellSelectionMode() ? this.engine.isCellSelected(rowIndex, column.key) : this.isRowSelectionMode() && this.engine.isRowSelected(rowIndex);
		return `${this.getColumnLabel(column.key)}, row ${rowIndex + 1} of ${this.engine.getRowCount()}, column ${columnIndex + 1} of ${this.getVisibleColumns().length}, ${value}${selected ? ", selected" : ""}.`;
	}
	announceActiveCell() {
		this.announceScreenReader(this.getActiveCellAnnouncement());
	}
	announceRowSelection(rowIndex) {
		this.announceScreenReader(`Row ${rowIndex + 1} ${this.engine.isRowSelected(rowIndex) ? "selected" : "deselected"}.`);
	}
	announceCellSelection(rowIndex, columnKey) {
		this.announceScreenReader(`${this.getColumnLabel(columnKey)}, row ${rowIndex + 1} ${this.engine.isCellSelected(rowIndex, columnKey) ? "selected" : "deselected"}.`);
	}
	announceVisibleRowCount(context) {
		const rowCount = this.engine.getRowCount();
		this.announceScreenReader(rowCount === 0 ? `${context}. No matching rows.` : `${context}. ${rowCount} ${rowCount === 1 ? "row" : "rows"} shown.`);
	}
	handleSortAscending(columnKey) {
		this.engine.sortBy(columnKey, "asc");
		this.announceScreenReader(`${this.getColumnLabel(columnKey)} sorted ascending.`);
		this.requestUpdate();
		this.closeHeaderMenu();
	}
	handleSortDescending(columnKey) {
		this.engine.sortBy(columnKey, "desc");
		this.announceScreenReader(`${this.getColumnLabel(columnKey)} sorted descending.`);
		this.requestUpdate();
		this.closeHeaderMenu();
	}
	handleClearSort() {
		this.engine.clearSort();
		this.announceScreenReader("Sorting cleared.");
		this.requestUpdate();
		this.closeHeaderMenu();
	}
	handleBestFit(columnKey) {
		this.bestFitColumn(columnKey);
		this.closeHeaderMenu();
	}
	handleBestFitAllColumns() {
		this.bestFitAllColumns();
		this.closeHeaderMenu();
	}
	getTextMeasureContext() {
		if (this.textMeasureContext) return this.textMeasureContext;
		const context = document.createElement("canvas").getContext("2d");
		if (!context) throw new Error("Unable to create text measurement context");
		context.font = window.getComputedStyle(this).font || "14px system-ui";
		this.textMeasureContext = context;
		return context;
	}
	measureTextWidth(text) {
		return this.getTextMeasureContext().measureText(text).width;
	}
	formatBestFitValue(column, row, rowIndex) {
		if (column.render) {
			const rendered = column.render(this.getCellValue(column, row, rowIndex), row, rowIndex);
			if (typeof rendered === "string" || typeof rendered === "number") return String(rendered);
		}
		return String(this.getCellValue(column, row, rowIndex));
	}
	computeColumnBestFit(columnKey, sampleSize = this.bestFitSampleSize) {
		const column = this.getResolvedColumns().find((item) => item.key === columnKey);
		if (!column) return null;
		const cachedWidth = this.getBestFitWidth(columnKey, sampleSize);
		if (cachedWidth !== void 0) return cachedWidth;
		const rowCount = this.engine.getRowCount();
		const rows = this.engine.getVisibleRows(0, Math.min(rowCount, sampleSize));
		const headerText = column.header ?? column.key;
		let maxWidth = this.measureTextWidth(String(headerText).toUpperCase()) + 44;
		if (!this.measureContainer) try {
			this.measureContainer = document.createElement("div");
			Object.assign(this.measureContainer.style, {
				position: "absolute",
				left: "-9999px",
				top: "0px",
				visibility: "hidden",
				height: "auto",
				width: "auto",
				whiteSpace: "nowrap",
				overflow: "visible"
			});
			document.body.appendChild(this.measureContainer);
		} catch (e) {
			this.measureContainer = null;
		}
		rows.forEach((row, index) => {
			if (column.render) {
				const rendered = column.render(this.getCellValue(column, row, index), row, index);
				if (typeof rendered === "string" || typeof rendered === "number") {
					maxWidth = Math.max(maxWidth, this.measureTextWidth(String(rendered)));
					return;
				}
				if (this.measureContainer) {
					const wrapper = document.createElement("div");
					wrapper.style.whiteSpace = "nowrap";
					this.measureContainer.appendChild(wrapper);
					try {
						D(rendered, wrapper);
						maxWidth = Math.max(maxWidth, Math.ceil(wrapper.scrollWidth));
					} catch (e) {
						const text = this.formatBestFitValue(column, row, index);
						maxWidth = Math.max(maxWidth, this.measureTextWidth(text));
					} finally {
						D(void 0, wrapper);
						this.measureContainer.removeChild(wrapper);
					}
					return;
				}
			}
			const value = this.formatBestFitValue(column, row, index);
			maxWidth = Math.max(maxWidth, this.measureTextWidth(value));
		});
		const width = normalizeColumnWidth(Math.ceil(maxWidth + 24));
		this.setBestFitWidth(columnKey, sampleSize, width);
		return width;
	}
	getFilterDraft(columnKey) {
		return this.filterDrafts.get(columnKey) ?? {
			columnKey,
			operator: "contains",
			value: ""
		};
	}
	updateFilterDraft(columnKey, changes) {
		this.filterDrafts.set(columnKey, {
			...this.getFilterDraft(columnKey),
			...changes
		});
		this.requestUpdate();
	}
	isValueFreeFilter(operator) {
		return operator === "isEmpty" || operator === "isNotEmpty";
	}
	resetVerticalScroll() {
		const viewport = this.renderRoot?.querySelector(".viewport");
		if (viewport) viewport.scrollTop = 0;
		this.pendingScrollTop = 0;
		this.previousPendingScrollTop = 0;
		this.fixedRowVirtualizer.setScrollOffset(0);
		this.variableRowVirtualizer.setScrollOffset(0);
	}
	clearQuickSearchDebounce() {
		if (this.quickSearchDebounceId !== null) {
			clearTimeout(this.quickSearchDebounceId);
			this.quickSearchDebounceId = null;
		}
	}
	applyQuickSearch(query) {
		this.engine.setQuickSearch(query);
		this.resetVerticalScroll();
		this.announceVisibleRowCount(query ? "Quick search updated" : "Quick search cleared");
		this.requestUpdate();
	}
	setQuickSearch(query) {
		this.clearQuickSearchDebounce();
		this.quickSearchDraft = query;
		this.applyQuickSearch(query);
	}
	clearQuickSearch() {
		this.setQuickSearch("");
	}
	getQuickSearch() {
		return this.engine.getQuickSearch();
	}
	toggleQuickSearch() {
		this.quickSearchVisible = !this.quickSearchVisible;
		this.closeHeaderMenu();
	}
	handleQuickSearchInput(query) {
		this.quickSearchDraft = query;
		this.clearQuickSearchDebounce();
		const threshold = Math.max(0, Math.floor(this.quickSearchDebounceThreshold));
		const debounceMs = Math.max(0, Math.floor(this.quickSearchDebounceMs));
		if (this.sourceRowCount < threshold || debounceMs === 0) {
			this.applyQuickSearch(query);
			return;
		}
		this.quickSearchDebounceId = setTimeout(() => {
			this.quickSearchDebounceId = null;
			this.applyQuickSearch(query);
		}, debounceMs);
		this.requestUpdate();
	}
	setFilter(filter) {
		this.engine.setFilter(filter);
		this.filterDrafts.set(filter.columnKey, { ...filter });
		this.resetVerticalScroll();
		this.announceVisibleRowCount(`${this.getColumnLabel(filter.columnKey)} filter applied`);
		this.requestUpdate();
	}
	clearFilter(columnKey) {
		this.engine.clearFilter(columnKey);
		if (columnKey) this.filterDrafts.delete(columnKey);
		else this.filterDrafts.clear();
		this.resetVerticalScroll();
		this.announceVisibleRowCount(columnKey ? `${this.getColumnLabel(columnKey)} filter cleared` : "All filters cleared");
		this.requestUpdate();
	}
	getFilters() {
		return this.engine.getFilters();
	}
	setPage(pageIndex) {
		this.engine.setPage(pageIndex);
		this.resetVerticalScroll();
		const pagination = this.engine.getPagination();
		this.announceScreenReader(`Page ${pagination.pageCount === 0 ? 0 : pagination.pageIndex + 1} of ${pagination.pageCount}.`);
		this.requestUpdate();
	}
	setPageSize(pageSize) {
		this.engine.setPageSize(pageSize);
		this.resetVerticalScroll();
		const pagination = this.engine.getPagination();
		this.announceScreenReader(`${pagination.pageSize} rows per page. Page ${pagination.pageCount === 0 ? 0 : pagination.pageIndex + 1} of ${pagination.pageCount}.`);
		this.requestUpdate();
	}
	getPagination() {
		return this.engine.getPagination();
	}
	getTotalRowCount() {
		return this.engine.getTotalRowCount();
	}
	selectRow(rowIndex, intent) {
		this.engine.selectRow(rowIndex, intent);
		this.announceRowSelection(rowIndex);
		this.requestUpdate();
	}
	selectAllRows() {
		this.engine.selectAllRows();
		this.announceScreenReader(`All ${this.engine.getRowCount()} displayed rows selected.`);
		this.requestUpdate();
	}
	clearSelection() {
		this.engine.clearSelection();
		this.announceScreenReader("Selection cleared.");
		this.requestUpdate();
	}
	getSelection() {
		return this.engine.getSelection();
	}
	isRowSelected(rowIndex) {
		return this.engine.isRowSelected(rowIndex);
	}
	isCellSelected(rowIndex, columnKey) {
		return this.engine.isCellSelected(rowIndex, columnKey);
	}
	getSelectedCellsClipboardText() {
		return serializeSelectedCells({
			selection: this.engine.getSelection(),
			rows: this.engine.getRows(),
			columns: this.getVisibleColumns(),
			getCellValue: (column, row, rowIndex) => this.getCellValue(column, row, rowIndex),
			formatValue: (value) => this.formatCellValue(value)
		});
	}
	async copySelectedCells() {
		const text = this.getSelectedCellsClipboardText();
		if (text === null || !navigator.clipboard?.writeText) return false;
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			return false;
		}
	}
	getSelectedRowsClipboardText() {
		return serializeSelectedRows({
			selection: this.engine.getSelection(),
			rows: this.engine.getRows(),
			columns: this.getVisibleColumns(),
			getCellValue: (column, row, rowIndex) => this.getCellValue(column, row, rowIndex),
			formatValue: (value) => this.formatCellValue(value)
		});
	}
	async copySelectedRows() {
		const text = this.getSelectedRowsClipboardText();
		if (text === null || !navigator.clipboard?.writeText) return false;
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			return false;
		}
	}
	applyHeaderFilter(columnKey) {
		const filter = this.getFilterDraft(columnKey);
		this.setFilter({
			...filter,
			value: this.isValueFreeFilter(filter.operator) ? void 0 : filter.value
		});
		this.closeHeaderMenu();
	}
	clearHeaderFilter(columnKey) {
		this.clearFilter(columnKey);
		this.closeHeaderMenu();
	}
	isColumnFiltered(columnKey) {
		return this.engine.getFilters().some((filter) => filter.columnKey === columnKey);
	}
	bestFitColumn(columnKey) {
		const width = this.computeColumnBestFit(columnKey);
		if (width !== null) this.setColumnWidth(columnKey, width);
		return width;
	}
	bestFitAllColumns() {
		const widths = this.getVisibleColumns().map((column) => ({
			key: column.key,
			width: this.computeColumnBestFit(column.key)
		}));
		widths.forEach((item) => {
			if (item.width !== null) this.setColumnWidth(item.key, item.width);
		});
		return widths;
	}
	startBodyResize(cursor) {
		this.previousBodyCursor = document.body.style.cursor;
		this.previousBodyUserSelect = document.body.style.userSelect;
		document.body.style.cursor = cursor;
		document.body.style.userSelect = "none";
	}
	stopBodyResize() {
		document.body.style.cursor = this.previousBodyCursor;
		document.body.style.userSelect = this.previousBodyUserSelect;
	}
	startColumnReorder(event, column) {
		if (event.button !== 0 || this.columnResizeState || event.target.closest("button, input, select, .resize-handle")) return;
		const sourceIndex = this.getResolvedColumns().findIndex((item) => item.key === column.key);
		if (sourceIndex < 0) return;
		event.preventDefault();
		this.columnReorderState = {
			columnKey: column.key,
			startX: event.clientX,
			sourceIndex,
			targetIndex: sourceIndex,
			hasMoved: false
		};
		window.addEventListener("pointermove", this.handleColumnReorder);
		window.addEventListener("pointerup", this.stopColumnReorder);
		window.addEventListener("pointercancel", this.stopColumnReorder);
	}
	updateColumnDragPreview(columnKey, clientX, clientY) {
		if (!this.columnDragPreview) {
			const column = this.getResolvedColumns().find((item) => item.key === columnKey);
			const source = this.renderRoot.querySelector(`.header-cell[data-column-key="${columnKey}"]`);
			if (!column || !source) return;
			const bounds = source.getBoundingClientRect();
			const theme = getComputedStyle(this);
			const preview = document.createElement("div");
			preview.textContent = column.header ?? column.key;
			Object.assign(preview.style, {
				position: "fixed",
				zIndex: "10001",
				boxSizing: "border-box",
				width: `${bounds.width}px`,
				height: `${bounds.height}px`,
				padding: "0 12px",
				display: "flex",
				alignItems: "center",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				border: `1px solid ${theme.getPropertyValue("--litgrid-color-accent")}`,
				borderRadius: "4px",
				background: theme.getPropertyValue("--litgrid-color-surface"),
				color: theme.getPropertyValue("--litgrid-color-text-header"),
				font: "700 12px/1.4 system-ui, sans-serif",
				letterSpacing: "0.03em",
				textTransform: "uppercase",
				boxShadow: theme.getPropertyValue("--litgrid-shadow-dialog"),
				opacity: "0.95",
				pointerEvents: "none"
			});
			document.body.appendChild(preview);
			this.columnDragPreview = preview;
		}
		const preview = this.columnDragPreview;
		preview.style.left = `${clientX - preview.offsetWidth / 2}px`;
		preview.style.top = `${clientY - preview.offsetHeight / 2}px`;
	}
	removeColumnDragPreview() {
		this.columnDragPreview?.remove();
		this.columnDragPreview = null;
	}
	getGridCellId(rowIndex, columnIndex) {
		return `${this.gridId}-cell-${rowIndex}-${columnIndex}`;
	}
	getHeaderRowId() {
		return `${this.gridId}-header-row`;
	}
	getHeaderMenuId(columnKey) {
		return `${this.gridId}-header-menu-${encodeURIComponent(columnKey)}`;
	}
	getRowHeaderColumnHeaderId() {
		return `${this.gridId}-row-header-columnheader`;
	}
	getAriaColumnIndex(columnIndex) {
		return columnIndex + (this.isRowHeaderVisible() ? 2 : 1);
	}
	getHeaderSortDirection(columnKey) {
		const sort = this.engine.getSort();
		return sort.columnKey === columnKey && sort.direction ? sort.direction === "asc" ? "ascending" : "descending" : "none";
	}
	getHeaderCellClass(column) {
		const classes = ["header-cell"];
		const state = this.columnReorderState;
		if (!state || !state.hasMoved) return classes.join(" ");
		if (state.columnKey === column.key) classes.push("header-cell-reordering");
		if (this.getResolvedColumns().findIndex((item) => item.key === column.key) === state.targetIndex && state.sourceIndex !== state.targetIndex) classes.push(state.sourceIndex < state.targetIndex ? "header-cell-drop-after" : "header-cell-drop-before");
		return classes.join(" ");
	}
	startColumnResize(event, column) {
		event.preventDefault();
		event.stopPropagation();
		this.columnResizeState = {
			columnKey: column.key,
			startX: event.clientX,
			startWidth: this.getColumnWidth(column)
		};
		this.startBodyResize("col-resize");
		window.addEventListener("pointermove", this.handleColumnResize);
		window.addEventListener("pointerup", this.stopColumnResize);
	}
	startRowResize(event, rowIndex) {
		event.preventDefault();
		event.stopPropagation();
		this.rowResizeState = {
			rowIndex,
			startY: event.clientY,
			startHeight: this.getRowHeight(rowIndex)
		};
		this.startBodyResize("row-resize");
		window.addEventListener("pointermove", this.handleRowResize);
		window.addEventListener("pointerup", this.stopRowResize);
	}
	getCellValue(column, row, rowIndex) {
		if (column.accessor) return column.accessor(row, rowIndex);
		if (row && typeof row === "object" && column.key in row) return row[column.key];
		return "";
	}
	formatCellValue(value) {
		if (value == null) return "";
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	}
	getSelectionMode() {
		return this.engine.getSelection().mode;
	}
	isRowSelectionMode() {
		const mode = this.getSelectionMode();
		return mode === "row" || mode === "multi-row";
	}
	isCellSelectionMode() {
		const mode = this.getSelectionMode();
		return mode === "cell" || mode === "multi-cell";
	}
	getRowClass(rowIndex) {
		const classes = ["row"];
		if (this.isRowSelectionMode()) classes.push("row-selectable");
		if (this.engine.isRowSelected(rowIndex)) classes.push("row-selected");
		return classes.join(" ");
	}
	getCellClass(rowIndex, columnKey) {
		const classes = ["cell"];
		if (this.isCellSelectionMode()) classes.push("cell-selectable");
		if (this.engine.isCellSelected(rowIndex, columnKey)) classes.push("cell-selected");
		if (this.activeCell?.rowIndex === rowIndex && this.getVisibleColumns()[this.activeCell.columnIndex]?.key === columnKey) classes.push("cell-active");
		return classes.join(" ");
	}
	setActiveCell(rowIndex, columnIndex, shouldFocus = false) {
		const rowCount = this.engine.getRowCount();
		const columnCount = this.getVisibleColumns().length;
		if (rowCount === 0 || columnCount === 0) {
			this.activeCell = null;
			return;
		}
		this.activeCell = {
			rowIndex: Math.max(0, Math.min(rowIndex, rowCount - 1)),
			columnIndex: Math.max(0, Math.min(columnIndex, columnCount - 1))
		};
		this.shouldFocusActiveCell = shouldFocus;
		this.announceActiveCell();
	}
	focusActiveCell() {
		if (!this.shouldFocusActiveCell || !this.activeCell) return;
		const cell = this.renderRoot.querySelector(`.cell[data-row-index="${this.activeCell.rowIndex}"][data-column-index="${this.activeCell.columnIndex}"]`);
		if (cell) {
			this.shouldFocusActiveCell = false;
			cell.focus();
		}
	}
	getRowIndexAtOffset(offset) {
		const rowCount = this.engine.getRowCount();
		if (rowCount === 0) return 0;
		if (!this.hasCustomRowHeights()) return Math.max(0, Math.min(Math.floor(offset / this.rowHeight), rowCount - 1));
		const rowSizes = this.getRowSizes();
		const rowOffsets = new Array(rowCount + 1);
		rowOffsets[0] = 0;
		for (let index = 0; index < rowCount; index += 1) rowOffsets[index + 1] = rowOffsets[index] + rowSizes[index];
		const targetOffset = Math.max(0, Math.min(offset, rowOffsets[rowCount] - 1));
		let low = 0;
		let high = rowCount - 1;
		while (low <= high) {
			const middle = Math.floor((low + high) / 2);
			const middleOffset = rowOffsets[middle];
			const middleBottom = rowOffsets[middle + 1];
			if (targetOffset < middleOffset) high = middle - 1;
			else if (targetOffset >= middleBottom) low = middle + 1;
			else return middle;
		}
		return Math.max(0, Math.min(low, rowCount - 1));
	}
	getPageNavigationRowIndex(rowIndex, direction) {
		const rowTop = this.hasCustomRowHeights() ? this.getRowSizes().slice(0, rowIndex).reduce((total, height) => total + height, 0) : rowIndex * this.rowHeight;
		return this.getRowIndexAtOffset(rowTop + direction * this.height);
	}
	getTabNavigationCell(direction, rowCount, columnCount) {
		if (!this.activeCell) return direction === 1 ? {
			rowIndex: 0,
			columnIndex: 0
		} : {
			rowIndex: rowCount - 1,
			columnIndex: columnCount - 1
		};
		const nextIndex = this.activeCell.rowIndex * columnCount + this.activeCell.columnIndex + direction;
		if (nextIndex < 0 || nextIndex >= rowCount * columnCount) return null;
		return {
			rowIndex: Math.floor(nextIndex / columnCount),
			columnIndex: nextIndex % columnCount
		};
	}
	scrollActiveCellIntoView() {
		const viewport = this.viewportElement ?? this.renderRoot.querySelector(".viewport");
		const activeCell = this.activeCell;
		if (!viewport || !activeCell) return;
		const rowTop = this.hasCustomRowHeights() ? this.getRowSizes().slice(0, activeCell.rowIndex).reduce((total, height) => total + height, 0) : activeCell.rowIndex * this.rowHeight;
		const rowBottom = rowTop + this.getRowHeight(activeCell.rowIndex);
		const displayTotal = this.lastDisplayTotal || this.lastTotalSize;
		const availableVirtualSize = Math.max(0, this.lastTotalSize - this.height);
		const availableDisplaySize = Math.max(0, displayTotal - this.height);
		const currentVirtualOffset = availableDisplaySize > 0 ? viewport.scrollTop * availableVirtualSize / availableDisplaySize : 0;
		let nextVirtualOffset = currentVirtualOffset;
		if (rowTop < currentVirtualOffset) nextVirtualOffset = rowTop;
		else if (rowBottom > currentVirtualOffset + this.height) nextVirtualOffset = rowBottom - this.height;
		if (nextVirtualOffset !== currentVirtualOffset) viewport.scrollTop = availableVirtualSize > 0 ? Math.max(0, Math.min(nextVirtualOffset, availableVirtualSize)) * availableDisplaySize / availableVirtualSize : 0;
		const columns = this.getVisibleColumns();
		const columnLeft = columns.slice(0, activeCell.columnIndex).reduce((total, column) => total + this.getColumnWidth(column), 0);
		const columnRight = columnLeft + this.getColumnWidth(columns[activeCell.columnIndex]);
		const bodyViewportWidth = Math.max(0, viewport.clientWidth - this.getRowHeaderWidth());
		if (columnLeft < viewport.scrollLeft) viewport.scrollLeft = columnLeft;
		else if (columnRight > viewport.scrollLeft + bodyViewportWidth) viewport.scrollLeft = Math.max(0, columnRight - bodyViewportWidth);
	}
	handleKeyDown(event) {
		const target = event.target;
		if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLButtonElement) return;
		const rowCount = this.engine.getRowCount();
		const columnCount = this.getVisibleColumns().length;
		if (rowCount === 0 || columnCount === 0) return;
		if ((event.key === "Enter" || event.key === " ") && !event.ctrlKey && !event.metaKey && !event.altKey) {
			const activeCell = this.activeCell ?? {
				rowIndex: 0,
				columnIndex: 0
			};
			if (this.isCellSelectionMode()) {
				const column = this.getVisibleColumns()[activeCell.columnIndex];
				if (column) {
					event.preventDefault();
					this.engine.selectCell(activeCell.rowIndex, column.key);
					this.announceCellSelection(activeCell.rowIndex, column.key);
					this.requestUpdate();
				}
			} else if (this.isRowSelectionMode()) {
				event.preventDefault();
				this.engine.selectRow(activeCell.rowIndex, "replace");
				this.announceRowSelection(activeCell.rowIndex);
				this.requestUpdate();
			}
			return;
		}
		if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "c") {
			const cellText = this.getSelectedCellsClipboardText();
			const rowText = cellText === null ? this.getSelectedRowsClipboardText() : null;
			if (cellText !== null || rowText !== null) {
				event.preventDefault();
				cellText !== null ? this.copySelectedCells() : this.copySelectedRows();
			}
			return;
		}
		if (event.key === "Tab") {
			const nextCell = this.getTabNavigationCell(event.shiftKey ? -1 : 1, rowCount, columnCount);
			if (!nextCell) return;
			event.preventDefault();
			this.setActiveCell(nextCell.rowIndex, nextCell.columnIndex, true);
			this.scrollActiveCellIntoView();
			this.requestUpdate();
			return;
		}
		const activeCell = this.activeCell ?? {
			rowIndex: 0,
			columnIndex: 0
		};
		const delta = {
			ArrowUp: {
				rowIndex: -1,
				columnIndex: 0
			},
			ArrowDown: {
				rowIndex: 1,
				columnIndex: 0
			},
			ArrowLeft: {
				rowIndex: 0,
				columnIndex: -1
			},
			ArrowRight: {
				rowIndex: 0,
				columnIndex: 1
			}
		}[event.key];
		const isGridBoundaryNavigation = event.ctrlKey || event.metaKey;
		let nextCell = null;
		if (delta) nextCell = {
			rowIndex: activeCell.rowIndex + delta.rowIndex,
			columnIndex: activeCell.columnIndex + delta.columnIndex
		};
		else if (event.key === "Home") nextCell = {
			rowIndex: isGridBoundaryNavigation ? 0 : activeCell.rowIndex,
			columnIndex: 0
		};
		else if (event.key === "End") nextCell = {
			rowIndex: isGridBoundaryNavigation ? rowCount - 1 : activeCell.rowIndex,
			columnIndex: columnCount - 1
		};
		else if (event.key === "PageUp" || event.key === "PageDown") nextCell = {
			rowIndex: this.getPageNavigationRowIndex(activeCell.rowIndex, event.key === "PageUp" ? -1 : 1),
			columnIndex: activeCell.columnIndex
		};
		if (!nextCell) return;
		event.preventDefault();
		this.setActiveCell(nextCell.rowIndex, nextCell.columnIndex, true);
		this.scrollActiveCellIntoView();
		this.requestUpdate();
	}
	getRowSelectionIntent(event) {
		if (event.shiftKey) return "range";
		if (event.ctrlKey || event.metaKey) return "toggle";
		return "replace";
	}
	handleRowClick(event, rowIndex) {
		if (!this.isRowSelectionMode()) return;
		this.engine.selectRow(rowIndex, this.getRowSelectionIntent(event));
		this.announceRowSelection(rowIndex);
		this.requestUpdate();
	}
	handleRowMouseDown(event) {
		if (this.isRowSelectionMode() && event.shiftKey) event.preventDefault();
	}
	handleCellClick(event, rowIndex, column) {
		this.setActiveCell(rowIndex, this.getVisibleColumns().findIndex((item) => item.key === column.key));
		if (!this.isCellSelectionMode()) {
			this.requestUpdate();
			return;
		}
		event.stopPropagation();
		this.engine.selectCell(rowIndex, column.key);
		this.announceCellSelection(rowIndex, column.key);
		this.requestUpdate();
	}
	renderCell(column, row, rowIndex) {
		const value = this.getCellValue(column, row, rowIndex);
		const rendered = column.render ? column.render(value, row, rowIndex) : this.formatCellValue(value);
		const content = typeof rendered === "string" || typeof rendered === "number" ? b`${rendered}` : rendered;
		return b`
                        <div
        id=${this.getGridCellId(rowIndex, this.getVisibleColumns().findIndex((item) => item.key === column.key))}
        class=${this.getCellClass(rowIndex, column.key)}
        role="gridcell"
        aria-colindex=${this.getAriaColumnIndex(this.getVisibleColumns().findIndex((item) => item.key === column.key))}
        aria-selected=${this.isCellSelectionMode() ? String(this.engine.isCellSelected(rowIndex, column.key)) : void 0}
        data-row-index=${rowIndex}
        data-column-index=${this.getVisibleColumns().findIndex((item) => item.key === column.key)}
        tabindex=${this.activeCell?.rowIndex === rowIndex && this.getVisibleColumns()[this.activeCell.columnIndex]?.key === column.key ? "0" : "-1"}
        @click=${(event) => this.handleCellClick(event, rowIndex, column)}
      >

        ${h(content)}
      </div>
    `;
	}
	renderRowHeader(rowIndex) {
		if (!this.isRowHeaderVisible()) return "";
		return b`
            <div class="row-header-cell" role="rowheader" aria-colindex="1">
        ${this.hasCheckboxSelection() ? b`<input
              class="selection-checkbox"
              type="checkbox"
              aria-label=${`Select row ${rowIndex + 1}`}
              .checked=${this.engine.isRowSelected(rowIndex)}
              @click=${(event) => event.stopPropagation()}
              @change=${() => this.handleRowCheckboxChange(rowIndex)}
            />` : b`<span>${rowIndex + 1}</span>`}
        <span
          class="row-resize-handle"
          aria-hidden="true"
          @pointerdown=${(event) => this.startRowResize(event, rowIndex)}
        ></span>
      </div>
    `;
	}
	set data(value) {
		this.activeCell = null;
		this.clearQuickSearchDebounce();
		this.sourceRowCount = Array.isArray(value) ? value.length : 0;
		this.engine.setData(value ?? []);
		this.quickSearchDraft = this.engine.getQuickSearch();
		this.clearBestFitWidths();
		this.announceScreenReader(this.engine.getRowCount() === 0 ? "Grid is empty." : `${this.engine.getRowCount()} ${this.engine.getRowCount() === 1 ? "row" : "rows"} loaded.`);
		this.requestUpdate();
	}
	handleRowCheckboxChange(rowIndex) {
		this.engine.selectRow(rowIndex, "toggle");
		this.announceRowSelection(rowIndex);
		this.requestUpdate();
	}
	getDisplayedSelectedRowCount() {
		const rowCount = this.engine.getRowCount();
		let selectedCount = 0;
		for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) if (this.engine.isRowSelected(rowIndex)) selectedCount += 1;
		return selectedCount;
	}
	areAllDisplayedRowsSelected() {
		const rowCount = this.engine.getRowCount();
		return rowCount > 0 && this.getDisplayedSelectedRowCount() === rowCount;
	}
	hasPartiallySelectedDisplayedRows() {
		const selectedCount = this.getDisplayedSelectedRowCount();
		return selectedCount > 0 && selectedCount < this.engine.getRowCount();
	}
	handleSelectAllRows() {
		if (this.areAllDisplayedRowsSelected()) {
			this.engine.clearSelection();
			this.announceScreenReader("All displayed rows deselected.");
		} else {
			this.engine.selectAllRows();
			this.announceScreenReader(`All ${this.engine.getRowCount()} displayed rows selected.`);
		}
		this.requestUpdate();
	}
	set columns(value) {
		this.activeCell = null;
		this.sourceColumnDefs = Array.isArray(value) ? [...value] : [];
		this.columnDefs = [...this.sourceColumnDefs];
		this.hiddenColumnKeys = new Set(this.sourceColumnDefs.filter((column) => column.hidden).map((column) => column.key));
		this.clearBestFitWidths();
		this.restorePersistedColumnState();
		this.requestUpdate();
	}
	get columnStateStorageKey() {
		return this._columnStateStorageKey;
	}
	set columnStateStorageKey(value) {
		const nextKey = typeof value === "string" && value.trim() ? value : null;
		if (this._columnStateStorageKey === nextKey) return;
		this._columnStateStorageKey = nextKey;
		this.restorePersistedColumnState();
	}
	set config(value) {
		this.engine.setConfig(value ?? {});
		this.requestUpdate();
	}
	set viewportHeight(value) {
		this.updateVirtualizer({ viewportHeight: Number(value) });
		this.requestUpdate();
	}
	set overscanCount(value) {
		this.updateVirtualizer({ overscan: Number(value) });
		this.requestUpdate();
	}
	set columnOverscanCount(value) {
		this.columnOverscan = Number(value);
		this.requestUpdate();
	}
	set virtualRowHeight(value) {
		this.rowHeight = Number(value);
		this.requestUpdate();
	}
	render() {
		const count = this.engine.getRowCount();
		const pagination = this.engine.getPagination();
		const pageSizeOptions = [
			25,
			50,
			100
		].includes(pagination.pageSize) ? [
			25,
			50,
			100
		] : [
			pagination.pageSize,
			25,
			50,
			100
		].sort((left, right) => left - right);
		const useVariableRows = this.hasCustomRowHeights();
		if (useVariableRows) {
			const rowSizes = this.getRowSizes();
			this.variableRowVirtualizer.setOptions({
				sizes: rowSizes,
				viewportSize: this.height,
				overscan: this.overscan
			});
		} else this.fixedRowVirtualizer.setOptions({
			rowHeight: this.rowHeight,
			viewportHeight: this.height,
			overscan: this.overscan
		});
		const range = useVariableRows ? this.variableRowVirtualizer.getState() : this.fixedRowVirtualizer.getState(count);
		const totalSize = range.totalSize;
		const intendedDisplayTotal = Math.min(totalSize, this.maxScrollableHeight);
		const totalSizeChanged = totalSize !== this.lastTotalSize;
		const displayTotal = !totalSizeChanged && this.lastDisplayTotal > 0 && this.lastDisplayTotal < intendedDisplayTotal ? this.lastDisplayTotal : intendedDisplayTotal;
		const virtualOffsetTop = range.offsetTop;
		const renderedSize = range.visibleSize;
		const bottomPadding = range.bottomPadding;
		const { displayBottomPadding, displayOffsetTop, displayScale } = calculateDisplayLayout({
			totalSize,
			displaySize: displayTotal,
			virtualOffsetTop,
			visibleSize: renderedSize,
			bottomPadding
		});
		if (this.lastDisplayTotal > 0) {
			const diff = Math.abs(displayOffsetTop - this.pendingScrollTop);
			if (diff > Math.max(100, this.rowHeight)) console.log("[yc-grid] offset-mismatch", {
				displayOffsetTop,
				pendingScrollTop: this.pendingScrollTop,
				diff
			});
		}
		this.lastTotalSize = totalSize;
		if (totalSizeChanged || !this.lastDisplayTotal) this.lastDisplayTotal = displayTotal;
		if (totalSize > 6e6) console.log("[yc-grid] virtualizer state", {
			count,
			totalSize,
			displayTotal,
			displayScale,
			offsetTop: range.offsetTop,
			bottomPadding,
			startIndex: range.startIndex,
			endIndex: range.endIndex
		});
		const safeStartIndex = Math.max(0, Math.min(range.startIndex, Math.max(0, count)));
		const safeEndIndex = Math.max(safeStartIndex, Math.min(range.endIndex, count));
		let rows = this.engine.getVisibleRows(safeStartIndex, safeEndIndex);
		if (rows.length === 0 && count > 0) {
			const visibleCountFallback = Math.max(1, Math.ceil(this.height / Math.max(1, this.rowHeight)));
			const fallbackStart = Math.max(0, count - visibleCountFallback);
			const fallbackEnd = count;
			console.log("[yc-grid] empty-render-fallback", {
				safeStartIndex,
				safeEndIndex,
				fallbackStart,
				fallbackEnd
			});
			rows = this.engine.getVisibleRows(fallbackStart, fallbackEnd);
		}
		const columns = this.getVisibleColumns();
		const columnWidths = columns.map((column) => this.getColumnWidth(column));
		const rowHeaderWidth = this.getRowHeaderWidth();
		this.columnVirtualizer.setOptions({
			sizes: columnWidths,
			viewportSize: Math.max(0, this.viewportWidth - rowHeaderWidth),
			overscan: this.columnOverscan
		});
		const columnRange = this.columnVirtualizer.getState();
		const visibleColumns = columns.slice(columnRange.startIndex, columnRange.endIndex);
		const visibleColumnWidths = columnWidths.slice(columnRange.startIndex, columnRange.endIndex);
		const gridTemplate = [
			...this.isRowHeaderVisible() ? [`${rowHeaderWidth}px`] : [],
			`${columnRange.leftPadding}px`,
			...visibleColumnWidths.map((width) => `${width}px`),
			`${columnRange.rightPadding}px`
		].join(" ");
		const columnGridTemplate = [
			`${columnRange.leftPadding}px`,
			...visibleColumnWidths.map((width) => `${width}px`),
			`${columnRange.rightPadding}px`
		].join(" ");
		const totalColumnWidth = columnRange.totalSize;
		return b`
            <div
        class="shell"
        style=${`--virtual-grid-template: ${gridTemplate}; --total-column-width: ${totalColumnWidth}px; --total-row-width: ${totalColumnWidth + rowHeaderWidth}px; --row-header-width: ${rowHeaderWidth}px; --header-grid-template: ${this.isRowHeaderVisible() ? `${rowHeaderWidth}px minmax(0, 1fr) ${this.scrollbarWidth}px` : `minmax(0, 1fr) ${this.scrollbarWidth}px`}; --scrollbar-width: ${this.scrollbarWidth}px;`}
        @keydown=${this.handleShellKeyDown}
        >
        <p id=${`${this.gridId}-description`} class="screen-reader-only">${this.getScreenReaderDescription()}</p>
        ${this.screenReaderAnnouncements ? b`<div class="screen-reader-only" role="status" aria-live="polite" aria-atomic="true">${this.screenReaderMessage}</div>` : ""}
        ${this.quickSearchVisible ? b`
              <div class="quick-search" role="search">
                <input
                  aria-label="Quick search"
                  placeholder="Search all columns"
                  .value=${this.quickSearchDraft}
                  @input=${(event) => this.handleQuickSearchInput(event.target.value)}
                />
                <button type="button" @click=${() => this.clearQuickSearch()}>Clear</button>
              </div>
            ` : ""}
                        ${this.columnChooserOpen ? b`<div
                              class="column-chooser-dialog"
                              role="dialog"
                              aria-label="Columns"
                              style=${this.columnChooserPosition ? `left: ${this.columnChooserPosition.left}px; top: ${this.columnChooserPosition.top}px; right: auto;` : ""}
                            >
              <button class="column-chooser-close" type="button" aria-label="Close columns" @click=${() => this.closeColumnChooser(true)}>×</button>
              ${this.getResolvedColumns().map((column) => b`
                <label>
                  <input
                    type="checkbox"
                    .checked=${this.isColumnVisible(column.key)}
                    @change=${(event) => this.setColumnVisible(column.key, event.target.checked)}
                  />
                  ${column.header ?? column.key}
                </label>
              `)}
            </div>` : ""}
        <div class="header-shell">
          ${this.isRowHeaderVisible() ? b`
                                <div id=${this.getRowHeaderColumnHeaderId()} class="row-header-cell header-row-header" role="columnheader" aria-colindex="1">
                  ${this.hasCheckboxSelection() ? b`<input
                        class="selection-checkbox"
                        type="checkbox"
                        aria-label="Select all displayed rows"
                        .checked=${this.areAllDisplayedRowsSelected()}
                        .indeterminate=${this.hasPartiallySelectedDisplayedRows()}
                        ?disabled=${this.engine.getRowCount() === 0}
                        @change=${() => this.handleSelectAllRows()}
                      />` : b`<span>#</span>`}
                </div>
              ` : ""}
          <div class="header-clip">
                        <div
                            id=${this.getHeaderRowId()}
              class="header-column-row"
                            role="row"
              aria-rowindex="1"
              aria-owns=${this.isRowHeaderVisible() ? this.getRowHeaderColumnHeaderId() : void 0}
              style=${`grid-template-columns: ${columnGridTemplate}; transform: translateX(${-this.horizontalScrollLeft}px);`}
            >
              <div class="column-spacer" aria-hidden="true"></div>
              ${visibleColumns.map((column, columnIndex) => b`
                  <div
                    class=${this.getHeaderCellClass(column)}
                    role="columnheader"
                    aria-colindex=${this.getAriaColumnIndex(columnRange.startIndex + columnIndex)}
                    aria-sort=${this.getHeaderSortDirection(column.key)}
                    data-column-key=${column.key}
                    @pointerdown=${(event) => this.startColumnReorder(event, column)}
                    @click=${() => this.closeHeaderMenu()}
                  >
                    <span class="header-label">${column.header ?? column.key}</span>
                    ${this.isColumnFiltered(column.key) ? b`<span class="header-filter-indicator" aria-label="Filter active">●</span>` : ""}
                    <div class="header-actions" @click=${(event) => event.stopPropagation()}>
                      <button
                        class="header-action-button"
                        @click=${(event) => this.toggleHeaderMenu(column.key, event)}
                        aria-label="Show column actions"
                        aria-haspopup="dialog"
                        aria-controls=${this.getHeaderMenuId(column.key)}
                        aria-expanded=${String(this.activeHeaderMenu === column.key)}
                        type="button"
                      >⋯</button>
                                            ${this.activeHeaderMenu === column.key ? this.columnChooserOpen ? b`
                              <div id=${this.getHeaderMenuId(column.key)} class="header-menu column-chooser-menu ${columnIndex === 0 ? "header-menu-right" : ""}" role="dialog" aria-label="Columns" @click=${(event) => event.stopPropagation()}>
                                <button class="column-chooser-close" type="button" aria-label="Close columns" @click=${() => this.closeColumnChooser(true)}>×</button>
                                ${this.getResolvedColumns().map((column) => b`
                                  <label>
                                    <input
                                      type="checkbox"
                                      .checked=${this.isColumnVisible(column.key)}
                                      @change=${(event) => this.setColumnVisible(column.key, event.target.checked)}
                                    />
                                    ${column.header ?? column.key}
                                  </label>
                                `)}
                              </div>
                            ` : b`
                            <div id=${this.getHeaderMenuId(column.key)} class="header-menu ${columnIndex === 0 ? "header-menu-right" : ""}" role="dialog" aria-label=${`${column.header ?? column.key} column actions`} @click=${(event) => event.stopPropagation()}>
                              <button type="button" @click=${() => this.toggleQuickSearch()}>
                                ${this.quickSearchVisible ? "Hide Quick Search" : "Show Quick Search"}
                              </button>
                              <hr class="header-menu-divider" />
                              <button type="button" @click=${() => this.handleSortAscending(column.key)}>
                                Sort Asc
                              </button>
                              <button type="button" @click=${() => this.handleSortDescending(column.key)}>
                                Sort Desc
                              </button>
                                                            <button type="button" @click=${() => this.handleClearSort()}>
                                                              Clear Sort
                                                            </button>
                                                            <button type="button" @click=${(event) => this.toggleColumnChooser(event)}>
                                                              Columns
                                                            </button>
                              ${(() => {
			const draft = this.getFilterDraft(column.key);
			const valueFree = this.isValueFreeFilter(draft.operator);
			return b`
                                  <div class="header-filter">
                                    <select
                                      aria-label="Filter operator"
                                      @change=${(event) => this.updateFilterDraft(column.key, { operator: event.target.value })}
                                    >
                                      ${FILTER_OPERATORS.map((operator) => b`
                                        <option
                                          value=${operator.value}
                                          ?selected=${operator.value === draft.operator}
                                        >${operator.label}</option>
                                      `)}
                                    </select>
                                    ${valueFree ? "" : b`<input
                                          aria-label="Filter value"
                                          .value=${String(draft.value ?? "")}
                                          @input=${(event) => this.updateFilterDraft(column.key, { value: event.target.value })}
                                        />`}
                                    <div class="header-filter-actions">
                                      <button type="button" @click=${() => this.applyHeaderFilter(column.key)}>
                                        Apply Filter
                                      </button>
                                      <button type="button" @click=${() => this.clearHeaderFilter(column.key)}>
                                        Clear Filter
                                      </button>
                                    </div>
                                  </div>
                                `;
		})()}
                              <hr class="header-menu-divider" />
                              <button type="button" @click=${() => this.handleBestFit(column.key)}>
                                Best Fit
                              </button>
                              <button type="button" @click=${() => this.handleBestFitAllColumns()}>
                                Best Fit All Columns
                              </button>
                            </div>
                          ` : ""}
                    </div>
                    <span
                      class="resize-handle"
                      aria-hidden="true"
                      @pointerdown=${(event) => this.startColumnResize(event, column)}
                    ></span>
                  </div>
                `)}
              <div class="column-spacer" aria-hidden="true"></div>
            </div>
          </div>
          <div class="header-gutter"></div>
        </div>
                ${visibleColumns.length === 0 ? b`<div class="column-chooser-empty">
              <button type="button" @click=${() => this.toggleColumnChooser()}>Columns</button>
            </div>` : ""}
                <div
                    class="viewport"
          role="grid"
          aria-label=${this.ariaLabel || "Data grid"}
          aria-rowcount=${count + 1}
          aria-colcount=${columns.length + (this.isRowHeaderVisible() ? 1 : 0)}
          aria-activedescendant=${this.activeCell ? this.getGridCellId(this.activeCell.rowIndex, this.activeCell.columnIndex) : void 0}
          aria-describedby=${`${this.gridId}-description`}
          aria-owns=${this.getHeaderRowId()}
          style=${`--grid-height: ${this.height}px;`}
          tabindex="0"
          @scroll=${this.handleScroll}
          @focus=${this.handleViewportFocus}

          @keydown=${this.handleKeyDown}
          @click=${() => this.closeHeaderMenu()}

        >
          <div style=${`height: ${displayTotal}px;`}>
            <div
              class="content"
              style=${`--offset-top: ${displayOffsetTop}px; padding-bottom: ${displayBottomPadding}px;`}
            >
              ${rows.map((row, index) => {
			const rowIndex = range.startIndex + index;
			const height = this.getRowHeight(rowIndex);
			return b`
                                    <div
                    class=${this.getRowClass(rowIndex)}
                    role="row"
                    aria-rowindex=${rowIndex + 2}
                    aria-selected=${this.isRowSelectionMode() ? String(this.engine.isRowSelected(rowIndex)) : void 0}
                    style=${`height: ${height}px;`}
                    @mousedown=${this.handleRowMouseDown}
                    @click=${(event) => this.handleRowClick(event, rowIndex)}
                  >
                    ${this.renderRowHeader(rowIndex)}
                    <div class="column-spacer" aria-hidden="true"></div>
                    ${visibleColumns.map((column) => this.renderCell(column, row, rowIndex))}
                    <div class="column-spacer" aria-hidden="true"></div>
                  </div>
                `;
		})}
            </div>
          </div>
        </div>
        ${pagination.enabled ? b`
              <div class="pagination" role="navigation" aria-label="Pagination">
                <span>${pagination.totalRows} rows</span>
                <label>
                  Rows per page
                  <select
                    aria-label="Rows per page"
                    @change=${(event) => this.setPageSize(Number(event.target.value))}
                  >
                    ${pageSizeOptions.map((pageSize) => b`
                      <option value=${pageSize} ?selected=${pageSize === pagination.pageSize}>
                        ${pageSize}
                      </option>
                    `)}
                  </select>
                </label>
                <span>Page ${pagination.pageCount === 0 ? 0 : pagination.pageIndex + 1} of ${pagination.pageCount}</span>
                <button
                  type="button"
                  ?disabled=${pagination.pageIndex === 0}
                  @click=${() => this.setPage(pagination.pageIndex - 1)}
                >Previous</button>
                <button
                  type="button"
                  ?disabled=${pagination.pageCount === 0 || pagination.pageIndex >= pagination.pageCount - 1}
                  @click=${() => this.setPage(pagination.pageIndex + 1)}
                >Next</button>
              </div>
            ` : ""}
      </div>
    `;
	}
};
if (!customElements.get("yc-grid")) customElements.define("yc-grid", DataGrid);
//#endregion
//#region src/gridBindings.ts
function syncGridInputs(grid, inputs) {
	grid.data = inputs.data;
	grid.columns = inputs.columns;
	grid.config = inputs.config;
	grid.theme = inputs.theme;
	grid.ariaLabel = inputs.ariaLabel;
	grid.ariaDescription = inputs.ariaDescription;
	grid.screenReaderAnnouncements = inputs.screenReaderAnnouncements;
	grid.viewportHeight = inputs.height;
	grid.virtualRowHeight = inputs.rowHeight;
	grid.overscanCount = inputs.overscan;
	grid.columnOverscanCount = inputs.columnOverscan;
	grid.bestFitSampleSize = inputs.bestFitSampleSize;
	grid.quickSearchDebounceThreshold = inputs.quickSearchDebounceThreshold;
	grid.quickSearchDebounceMs = inputs.quickSearchDebounceMs;
	grid.columnStateStorageKey = inputs.columnStateStorageKey ?? null;
}
//#endregion
//#region src/index.ts
var activeListeners = /* @__PURE__ */ new WeakMap();
function requireGrid(element) {
	if (!element || typeof element.getRowHeight !== "function") throw new Error("LitGrid is not available before the Blazor component is mounted.");
	return element;
}
function initGrid(element, dotNetHelper, inputs) {
	const grid = requireGrid(element);
	syncGridInputs(grid, inputs);
	const onStateChange = (event) => {
		const detail = event.detail;
		dotNetHelper.invokeMethodAsync("HandleColumnStateChange", detail);
	};
	const onReorder = (event) => {
		const detail = event.detail;
		dotNetHelper.invokeMethodAsync("HandleColumnReorder", detail);
	};
	const onVisibilityChange = (event) => {
		const detail = event.detail;
		dotNetHelper.invokeMethodAsync("HandleColumnVisibilityChange", detail);
	};
	grid.addEventListener("column-state-change", onStateChange);
	grid.addEventListener("column-reorder", onReorder);
	grid.addEventListener("column-visibility-change", onVisibilityChange);
	activeListeners.set(element, {
		onStateChange,
		onReorder,
		onVisibilityChange
	});
}
function updateInputs(element, inputs) {
	syncGridInputs(requireGrid(element), inputs);
}
function disposeGrid(element) {
	const listeners = activeListeners.get(element);
	if (listeners && element) {
		element.removeEventListener("column-state-change", listeners.onStateChange);
		element.removeEventListener("column-reorder", listeners.onReorder);
		element.removeEventListener("column-visibility-change", listeners.onVisibilityChange);
		activeListeners.delete(element);
	}
}
function getRowHeight(element, rowIndex) {
	return requireGrid(element).getRowHeight(rowIndex);
}
function getColumnWidth(element, column) {
	return requireGrid(element).getColumnWidth(column);
}
function setRowHeight(element, rowIndex, height) {
	requireGrid(element).setRowHeight(rowIndex, height);
}
function resetRowHeight(element, rowIndex) {
	requireGrid(element).resetRowHeight(rowIndex);
}
function resetAllRowHeights(element) {
	requireGrid(element).resetAllRowHeights();
}
function setColumnWidth(element, columnKey, width) {
	requireGrid(element).setColumnWidth(columnKey, width);
}
function resetColumnWidth(element, columnKey) {
	requireGrid(element).resetColumnWidth(columnKey);
}
function resetAllColumnWidths(element) {
	requireGrid(element).resetAllColumnWidths();
}
function moveColumn(element, columnKey, targetIndex) {
	requireGrid(element).moveColumn(columnKey, targetIndex);
}
function getColumnOrder(element) {
	return requireGrid(element).getColumnOrder();
}
function setColumnOrder(element, columnKeys) {
	requireGrid(element).setColumnOrder(columnKeys);
}
function resetColumnOrder(element) {
	requireGrid(element).resetColumnOrder();
}
function setColumnVisible(element, columnKey, visible) {
	requireGrid(element).setColumnVisible(columnKey, visible);
}
function isColumnVisible(element, columnKey) {
	return requireGrid(element).isColumnVisible(columnKey);
}
function getVisibleColumnKeys(element) {
	return requireGrid(element).getVisibleColumnKeys();
}
function resetColumnVisibility(element) {
	requireGrid(element).resetColumnVisibility();
}
function getColumnState(element) {
	return requireGrid(element).getColumnState();
}
function setColumnState(element, state) {
	requireGrid(element).setColumnState(state);
}
function resetColumnState(element) {
	requireGrid(element).resetColumnState();
}
function bestFitColumn(element, columnKey) {
	return requireGrid(element).bestFitColumn(columnKey);
}
function bestFitAllColumns(element) {
	return requireGrid(element).bestFitAllColumns();
}
function copySelectedCells(element) {
	return requireGrid(element).copySelectedCells();
}
function copySelectedRows(element) {
	return requireGrid(element).copySelectedRows();
}
function setQuickSearch(element, query) {
	requireGrid(element).setQuickSearch(query);
}
function clearQuickSearch(element) {
	requireGrid(element).clearQuickSearch();
}
function getQuickSearch(element) {
	return requireGrid(element).getQuickSearch();
}
function setFilter(element, filter) {
	requireGrid(element).setFilter(filter);
}
function clearFilter(element, columnKey) {
	requireGrid(element).clearFilter(columnKey);
}
function getFilters(element) {
	return requireGrid(element).getFilters();
}
function setPage(element, pageIndex) {
	requireGrid(element).setPage(pageIndex);
}
function setPageSize(element, pageSize) {
	requireGrid(element).setPageSize(pageSize);
}
function getPagination(element) {
	return requireGrid(element).getPagination();
}
function getTotalRowCount(element) {
	return requireGrid(element).getTotalRowCount();
}
function selectRow(element, rowIndex, intent) {
	requireGrid(element).selectRow(rowIndex, intent);
}
function selectAllRows(element) {
	requireGrid(element).selectAllRows();
}
function clearSelection(element) {
	requireGrid(element).clearSelection();
}
function getSelection(element) {
	return requireGrid(element).getSelection();
}
function isRowSelected(element, rowIndex) {
	return requireGrid(element).isRowSelected(rowIndex);
}
function isCellSelected(element, rowIndex, columnKey) {
	return requireGrid(element).isCellSelected(rowIndex, columnKey);
}
//#endregion
export { bestFitAllColumns, bestFitColumn, clearFilter, clearQuickSearch, clearSelection, copySelectedCells, copySelectedRows, disposeGrid, getColumnOrder, getColumnState, getColumnWidth, getFilters, getPagination, getQuickSearch, getRowHeight, getSelection, getTotalRowCount, getVisibleColumnKeys, initGrid, isCellSelected, isColumnVisible, isRowSelected, moveColumn, resetAllColumnWidths, resetAllRowHeights, resetColumnOrder, resetColumnState, resetColumnVisibility, resetColumnWidth, resetRowHeight, selectAllRows, selectRow, setColumnOrder, setColumnState, setColumnVisible, setColumnWidth, setFilter, setPage, setPageSize, setQuickSearch, setRowHeight, syncGridInputs, updateInputs };

//# sourceMappingURL=litgrid-blazor.js.map