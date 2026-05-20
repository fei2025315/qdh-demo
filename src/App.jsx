import { useState, useRef, useEffect, useCallback } from "react";

function tokenize(text) {
  const tokens = new Set();
  const cleaned = text.replace(/[^\u4e00-\u9fff\w]/g, "");
  for (let i = 0; i < cleaned.length - 1; i++) {
    tokens.add(cleaned.slice(i, i + 2));
    if (i < cleaned.length - 2) tokens.add(cleaned.slice(i, i + 3));
  }
  return tokens;
}

function searchChunks(query, corpus, topK = 6) {
  const qTok = tokenize(query);
  const qTerms = query.replace(/[?\uff1f\uff0c\u3002\uff01\u3001\s]/g, "").match(/.{2,4}/g) || [];
  return corpus
    .map((c) => {
      const ct = tokenize(c.content);
      let s = 0;
      for (const t of qTok) if (ct.has(t)) s++;
      for (const t of qTerms) s += (c.content.match(new RegExp(t, "g")) || []).length * 3;
      return { ...c, score: s };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

const QS = [
  "威坪镇蓄水前长什么样",
  "移民搬迁时家具怎么处理的",
  "龙应台的母亲和淳安有什么关系",
  "清库拆房是怎么进行的",
  "狮城水下古城保存得如何",
  "淳安移民后的生活状况",
];

export default function App() {
  const [corpus, setCorpus] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [persona, setPersona] = useState("shiguan");
  const endRef = useRef(null);
  const inRef = useRef(null);

  useEffect(() => {
    fetch("/corpus.json")
      .then(r => r.json())
      .then(data => setCorpus(data))
      .catch(() => console.error("语料库加载失败"));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const ask = useCallback(async (q) => {
    const query = q || input.trim();
    if (!query || busy || corpus.length === 0) return;
    setInput("");
    setMsgs(p => [...p, { role: "u", text: query }]);

    const hits = searchChunks(query, corpus, 6);
    const ctx = hits.map(h => "【" + h.source + "】" + h.content).join("\n\n");
    const srcs = [...new Set(hits.map(h => h.source))];

    setMsgs(p => [...p, { role: "a", text: "", srcs, ld: true }]);
    setBusy(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, context: ctx, persona: persona }),
      });
      if (!response.ok) throw new Error("API error");
      const reader = response.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setMsgs(p => { const u = [...p]; u[u.length-1] = {...u[u.length-1], text: full, ld: false}; return u; });
      }
    } catch {
      setMsgs(p => { const u = [...p]; u[u.length-1] = {...u[u.length-1], text: "生成失败，请重试。", ld: false, err: true}; return u; });
    }
    setBusy(false);
    setTimeout(() => inRef.current?.focus(), 100);
  }, [input, busy, corpus]);

  const empty = msgs.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f4ef", display: "flex", flexDirection: "column", fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .hd { padding: 28px 28px 18px; border-bottom: 1px solid #d6cfbf; }
        .hd-r { display: flex; align-items: baseline; gap: 14px; }
        .hd h1 { font: 700 26px 'Noto Serif SC', serif; color: #1a1612; letter-spacing: 4px; }
        .hd .tg { font: 600 9px sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #2e5a5e; border: 1px solid #2e5a5e; padding: 3px 8px; border-radius: 2px; }
        .hd p { font: 300 13px 'Noto Serif SC', serif; color: #9e9182; margin-top: 6px; letter-spacing: .5px; }
        .bd { flex: 1; overflow-y: auto; padding: 24px 28px 12px; }
        .wc { display: flex; flex-direction: column; align-items: center; padding: 36px 16px 24px; text-align: center; }
        .wc .gl { font-size: 48px; color: #2e5a5e; opacity: .3; margin-bottom: 20px; }
        .wc h2 { font: 600 17px 'Noto Serif SC', serif; color: #1a1612; margin-bottom: 6px; }
        .wc .dc { font: 300 13px/1.8 'Noto Serif SC', serif; color: #6d5f4e; max-width: 400px; margin-bottom: 28px; }
        .ps { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 520px; }
        .pl { font: 400 13px 'Noto Serif SC', serif; color: #1a1612; background: #faf9f6; border: 1px solid #d6cfbf; border-radius: 3px; padding: 9px 14px; cursor: pointer; }
        .pl:hover { border-color: #2e5a5e; color: #2e5a5e; background: #e3edee; }
        .m { margin-bottom: 22px; max-width: 660px; animation: fu .25s ease-out; }
        @keyframes fu { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .mu { margin-left: auto; }
        .mu .b { display: inline-block; font: 400 15px 'Noto Serif SC', serif; background: #2e5a5e; color: #fff; padding: 10px 16px; border-radius: 10px 10px 2px 10px; }
        .ma .b { font: 400 15px/1.8 'Noto Serif SC', serif; color: #1a1612; background: #faf9f6; border: 1px solid #d6cfbf; padding: 18px 22px; border-radius: 2px 10px 10px 10px; white-space: pre-wrap; }
        .ma .sr { font: 400 11px sans-serif; color: #9e9182; margin-top: 10px; padding-top: 10px; border-top: 1px solid #d6cfbf; }
        .ld { color: #9e9182; animation: pl 1.4s ease-in-out infinite; }
        @keyframes pl { 0%,100%{opacity:.4} 50%{opacity:1} }
        .er { color: #a05030; }
        .ft { padding: 14px 28px 28px; border-top: 1px solid #d6cfbf; background: #faf9f6; }
        .fr { display: flex; gap: 10px; max-width: 660px; margin: 0 auto; }
        .fr input { flex: 1; font: 400 15px 'Noto Serif SC', serif; padding: 12px 16px; border: 1px solid #d6cfbf; border-radius: 5px; background: #f6f4ef; color: #1a1612; outline: none; }
        .fr input:focus { border-color: #2e5a5e; }
        .fr input::placeholder { color: #9e9182; }
        .fr button { font: 600 13px sans-serif; letter-spacing: 1px; padding: 12px 22px; background: #2e5a5e; color: #fff; border: none; border-radius: 5px; cursor: pointer; }
        .fr button:hover { opacity: .85; }
        .fr button:disabled { opacity: .35; cursor: not-allowed; }
      `}</style>

      <div className="hd">
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
  <button
    onClick={() => setPersona("shiguan")}
    style={{
      font: persona === "shiguan" ? "600 13px 'Noto Serif SC', serif" : "400 13px 'Noto Serif SC', serif",
      color: persona === "shiguan" ? "#2e5a5e" : "#9e9182",
      background: "transparent",
      border: persona === "shiguan" ? "1px solid #2e5a5e" : "1px solid #d6cfbf",
      borderRadius: 3,
      padding: "4px 12px",
      cursor: "pointer"
    }}
  >史官</button>
  <button
    onClick={() => setPersona("local")}
    style={{
      font: persona === "local" ? "600 13px 'Noto Serif SC', serif" : "400 13px 'Noto Serif SC', serif",
      color: persona === "local" ? "#2e5a5e" : "#9e9182",
      background: "transparent",
      border: persona === "local" ? "1px solid #2e5a5e" : "1px solid #d6cfbf",
      borderRadius: 3,
      padding: "4px 12px",
      cursor: "pointer"
    }}
  >当地人</button>
</div>
        <div className="hd-r">
          <h1>淳安方志</h1>
          <span className="tg">Demo</span>
        </div>
        <p>千岛湖 · 水下两城 · 三十万移民</p>
      </div>

      <div className="bd">
        {empty && (
          <div className="wc">
            <div className="gl">水</div>
            <h2>问一个关于淳安的问题</h2>
            <div className="dc">
              语料：新安江水库移民口述史料、龙应台《天长地久》。覆盖移民史、水下古城、清库拆迁、物质文化与个体记忆。
            </div>
            <div className="ps">
              {QS.map((s, i) => (
                <button key={i} className="pl" onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "u" ? (
            <div key={i} className="m mu"><div className="b">{m.text}</div></div>
          ) : (
            <div key={i} className="m ma">
              <div className="b">
                {m.ld ? <span className="ld">翻检方志文献中…</span> : m.err ? <span className="er">{m.text}</span> : m.text}
              </div>
              {m.srcs && m.text && !m.ld && (
                <div className="sr">参考 — {m.srcs.join("；")}</div>
              )}
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <div className="ft">
        <div className="fr">
          <input ref={inRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()} placeholder="问一个关于淳安的问题…" disabled={busy} />
          <button onClick={() => ask()} disabled={!input.trim() || busy}>发送</button>
        </div>
      </div>
    </div>
  );
}