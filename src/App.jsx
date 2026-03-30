import { useState, useCallback, useMemo, useRef, useEffect } from "react";

const LOGO_BLACK = "./ISC_Logo_V3_-_black.svg";
const LOGO_WHITE = "./ISC_Logo_V3_-_white.svg";

/* ── table columns — genre first, optional ─────────────────── */
const COLS = [
  { key: "genre", label: "M/F", width: 40 },
  { key: "nom", label: "Nom", width: "auto" },
  { key: "prenom", label: "Prénom", width: "auto" },
  { key: "email", label: "Email", width: "auto" },
  { key: "note", label: "Note", width: 55 },
];
const EMPTY_ROW = () => ({
  genre: "",
  nom: "",
  prenom: "",
  email: "",
  note: "",
  sent: false,
});
const INITIAL_ROWS = 15;

const PLACEHOLDERS = [
  { tag: "{civilite}", help: "Cher Monsieur / Chère Madame / Bonjour (selon M/F)" },
  { tag: "{prenom}", help: "Prénom de l'étudiant·e" },
  { tag: "{nom}", help: "Nom de l'étudiant·e" },
  { tag: "{email}", help: "Adresse email de l'étudiant·e" },
  { tag: "{note}", help: "Note obtenue par l'étudiant·e" },
  { tag: "{module}", help: "Nom du module ou unité d'enseignement" },
];

const DEFAULT_SUBJECT = "[ISC] Note de {module}";
const DEFAULT_BODY = `{civilite} {nom},

Vous trouverez ci-dessous votre note pour l'examen oral du module {module} :

  Étudiant·e : {prenom} {nom}
  Note :       {note}

Si vous avez des questions, bien entendu n'hésitez pas à me contacter par email ou à en discuter lors de notre prochaine séance de cours ou de travaux pratiques.

Cordialement,
Pierre-André Mudry`;

/* ── helpers ───────────────────────────────────────────────── */
function civilite(g) {
  const v = (g || "").trim().toUpperCase();
  if (v === "F") return "Chère Madame";
  if (v === "M") return "Cher Monsieur";
  return "Bonjour";
}

function fill(tpl, s, mod) {
  return tpl
    .replace(/\{prenom\}/gi, s.prenom)
    .replace(/\{nom\}/gi, s.nom)
    .replace(/\{email\}/gi, s.email)
    .replace(/\{note\}/gi, s.note)
    .replace(/\{module\}/gi, mod)
    .replace(/\{civilite\}/gi, civilite(s.genre));
}

function hasEmail(r) {
  return r.email && r.email.includes("@");
}
function hasNote(r) {
  return r.note.trim() !== "";
}
function isComplete(r) {
  return hasEmail(r) && hasNote(r);
}
function isEmpty(r) {
  return !r.nom && !r.prenom && !r.email && !r.note && !r.genre;
}

/* ── dark mode ─────────────────────────────────────────────── */
function useDark() {
  const [override, setOverride] = useState(null);
  const [system, setSystem] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e) => setSystem(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  const dark = override !== null ? override : system;
  return [dark, () => setOverride((p) => (p !== null ? !p : !system))];
}

/* ── tag pill ──────────────────────────────────────────────── */
function TagPill({ tag, onClick, title }) {
  return (
    <button onClick={onClick} style={tagPillStyle} title={title}>
      {tag}
    </button>
  );
}

/* ── template field ────────────────────────────────────────── */
function TemplateField({ label, value, onChange, multiline, id }) {
  const ref = useRef(null);
  const insert = (tag) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart ?? value.length;
    const e = el.selectionEnd ?? value.length;
    onChange(value.slice(0, s) + tag + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + tag.length, s + tag.length);
    });
  };
  const props = {
    ref,
    id,
    value,
    onChange: (e) => onChange(e.target.value),
    style: {
      ...inputBase,
      width: "100%",
      boxSizing: "border-box",
      fontFamily: multiline ? "var(--mono)" : "var(--body)",
      fontSize: multiline ? 12.5 : 13,
      ...(multiline
        ? { minHeight: 150, resize: "vertical", lineHeight: 1.65 }
        : {}),
    },
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        <label htmlFor={id} style={labelSm}>
          {label}
        </label>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {PLACEHOLDERS.map((p) => (
            <TagPill
              key={p.tag}
              tag={p.tag}
              title={p.help}
              onClick={() => insert(p.tag)}
            />
          ))}
        </div>
      </div>
      {multiline ? <textarea {...props} /> : <input type="text" {...props} />}
    </div>
  );
}

/* ── spreadsheet table ─────────────────────────────────────── */
function SpreadsheetTable({ rows, setRows }) {
  const [sel, setSel] = useState(null);
  const tableRef = useRef(null);
  const allEmpty = useMemo(() => rows.every(isEmpty), [rows]);

  const updateCell = useCallback(
    (ri, key, val) => {
      setRows((prev) => {
        const n = [...prev];
        n[ri] = { ...n[ri], [key]: val };
        if (ri >= n.length - 2 && !isEmpty(n[ri]))
          for (let i = 0; i < 5; i++) n.push(EMPTY_ROW());
        return n;
      });
    },
    [setRows]
  );

  const handlePaste = useCallback(
    (e, ri, ci) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
      if (lines.length === 1 && !lines[0].includes("\t")) return;
      e.preventDefault();
      setRows((prev) => {
        const n = [...prev];
        while (n.length < ri + lines.length + 3) n.push(EMPTY_ROW());
        lines.forEach((line, li) => {
          line.split("\t").forEach((val, cj) => {
            const col = COLS[ci + cj];
            if (col) n[ri + li] = { ...n[ri + li], [col.key]: val.trim() };
          });
        });
        return n;
      });
    },
    [setRows]
  );

  const nav = useCallback((ri, ci) => {
    setSel({ r: ri, c: ci });
    requestAnimationFrame(() => {
      tableRef.current
        ?.querySelector(`[data-r="${ri}"][data-c="${ci}"]`)
        ?.focus();
    });
  }, []);

  const handleKeyDown = useCallback(
    (e, ri, ci) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const nc = e.shiftKey ? ci - 1 : ci + 1;
        if (nc >= 0 && nc < COLS.length) nav(ri, nc);
        else if (!e.shiftKey) nav(ri + 1, 0);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        nav(ri + 1, ci);
      }
    },
    [nav]
  );

  return (
    <div
      ref={tableRef}
      style={{
        overflowX: "auto",
        border: "1px solid var(--rule)",
        borderRadius: 8,
        background: "var(--card)",
        position: "relative",
      }}
    >
      {allEmpty && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            pointerEvents: "none",
            background: "var(--card)",
            opacity: 0.55,
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 36, marginBottom: 8, animation: "bounce 1.5s ease-in-out infinite" }}>📋</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Collez vos données depuis Excel</span>
          <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Ctrl+V / ⌘V dans la première cellule</span>
        </div>
      )}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "auto",
          minWidth: 540,
        }}
      >
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 32 }}>#</th>
            {COLS.map((c) => (
              <th key={c.key} style={{ ...thStyle, width: c.width }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const empty = isEmpty(row);
            const mn = hasEmail(row) && !hasNote(row);
            const valid = isComplete(row);
            let bg = "transparent";
            if (row.sent) bg = "var(--sent-bg)";
            else if (mn) bg = "var(--warn-bg)";
            else if (valid) bg = "var(--valid-bg)";
            return (
              <tr key={ri} style={{ background: bg }}>
                <td style={rowNumStyle}>
                  {!empty && (
                    <span
                      style={{
                        fontSize: 10,
                        color: mn ? "var(--warn-fg)" : "var(--muted)",
                      }}
                    >
                      {row.sent ? "✓" : mn ? "⚠" : ri + 1}
                    </span>
                  )}
                </td>
                {COLS.map((col, ci) => (
                  <td key={col.key} style={{ ...tdStyle, maxWidth: col.key === 'email' ? 250 : undefined }}>
                    <input
                      data-r={ri}
                      data-c={ci}
                      value={row[col.key]}
                      onChange={(e) => updateCell(ri, col.key, e.target.value)}
                      onPaste={(e) => handlePaste(e, ri, ci)}
                      onFocus={() => setSel({ r: ri, c: ci })}
                      onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                      placeholder={col.key === "genre" ? "M/F" : ""}
                      title={col.key === 'email' ? row[col.key] : undefined}
                      style={{
                        ...cellInput,
                        textOverflow: col.key === 'email' ? 'ellipsis' : undefined,
                        overflow: col.key === 'email' ? 'hidden' : undefined,
                        whiteSpace: col.key === 'email' ? 'nowrap' : undefined,
                        textAlign:
                          col.key === "note" || col.key === "genre"
                            ? "center"
                            : "left",
                        fontWeight: col.key === "note" ? 700 : 400,
                        outline:
                          sel?.r === ri && sel?.c === ci
                            ? "2px solid var(--accent)"
                            : "none",
                        outlineOffset: -1,
                      }}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── confirm modal ─────────────────────────────────────────── */
function ConfirmModal({ missing, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 460,
          width: "90%",
          boxShadow: "0 8px 40px rgba(0,0,0,.2)",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 10,
            color: "var(--warn-fg)",
          }}
        >
          ⚠ {missing.length} étudiant·es{missing.length > 1 ? "s" : ""} sans note
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
          Voulez-vous les inclure dans l'envoi ?
        </div>
        <div
          style={{
            maxHeight: 140,
            overflowY: "auto",
            marginBottom: 16,
            padding: "8px 12px",
            background: "var(--warn-bg)",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {missing.map((s, i) => (
            <div key={i} style={{ padding: "2px 0", color: "var(--warn-fg)" }}>
              <b>
                {s.prenom} {s.nom}
              </b>{" "}
              — {s.email}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button onClick={() => onConfirm(false)} style={primaryBtn}>
            Sans eux
          </button>
          <button
            onClick={() => onConfirm(true)}
            style={{
              ...secondaryBtn,
              borderColor: "var(--warn-fg)",
              color: "var(--warn-fg)",
            }}
          >
            Les inclure
          </button>
          <button onClick={onCancel} style={secondaryBtn}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── send row ──────────────────────────────────────────────── */
function SendRow({ student, subject, body, module, onSent }) {
  const [open, setOpen] = useState(false);
  const fs = fill(subject, student, module);
  const fb = fill(body, student, module);
  const mailto = `mailto:${encodeURIComponent(student.email)}?subject=${encodeURIComponent(fs)}&body=${encodeURIComponent(fb)}`;

  return (
    <div
      style={{
        borderBottom: "1px solid var(--rule)",
        padding: "9px 0",
        opacity: student.sent ? 0.5 : 1,
        transition: "opacity .2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            ...badgeStyle,
            background: student.sent
              ? "var(--sent-bg)"
              : student.note
                ? "var(--badge-bg)"
                : "var(--warn-bg)",
            color: student.sent
              ? "var(--sent-fg)"
              : student.note
                ? "var(--badge-fg)"
                : "var(--warn-fg)",
          }}
        >
          {student.sent
            ? "✓"
            : `${student.prenom[0] || ""}${student.nom[0] || ""}`.toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {student.prenom} {student.nom}
          </span>
          <span
            style={{ color: "var(--muted)", fontSize: 11.5, marginLeft: 6 }}
          >
            {student.email}
          </span>
          {student.genre && (
            <span
              style={{ color: "var(--muted)", fontSize: 10, marginLeft: 4 }}
            >
              ({student.genre})
            </span>
          )}
        </div>
        {student.note ? (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {student.note}
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--warn-fg)",
              background: "var(--warn-bg)",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            sans note
          </span>
        )}
        <button onClick={() => setOpen(!open)} style={iconBtn}>
          {open ? "▲" : "▼"}
        </button>
        <a
          href={mailto}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onSent()}
          style={{ ...sendBtnSm, opacity: student.sent ? 0.4 : 1 }}
          title="Envoyer via messagerie"
        >
          ✉
        </a>
      </div>
      {open && (
        <div
          style={{
            marginTop: 8,
            marginLeft: 40,
            background: "var(--preview-bg)",
            borderRadius: 6,
            padding: 12,
            fontSize: 12,
            fontFamily: "var(--mono)",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          <div style={{ color: "var(--muted)", marginBottom: 4, fontSize: 11 }}>
            <b>À :</b> {student.email}
            {"\n"}
            <b>Objet :</b> {fs}
          </div>
          <hr
            style={{
              border: "none",
              borderTop: "1px dashed var(--rule)",
              margin: "4px 0 6px",
            }}
          />
          {fb}
        </div>
      )}
    </div>
  );
}

/* ── main app ──────────────────────────────────────────────── */
export default function App() {
  const [dark, toggleDark] = useDark();
  const [rows, setRows] = useState(() =>
    Array.from({ length: INITIAL_ROWS }, EMPTY_ROW)
  );
  const [module, setModule] = useState("");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [view, setView] = useState("edit");
  const [sendList, setSendList] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const withEmail = useMemo(() => rows.filter(hasEmail), [rows]);
  const complete = useMemo(() => withEmail.filter(hasNote), [withEmail]);
  const average = useMemo(() => {
    const notes = complete.map((r) => parseFloat(r.note)).filter((n) => !isNaN(n));
    if (notes.length === 0) return null;
    return (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2);
  }, [complete]);
  const missingNote = useMemo(
    () => withEmail.filter((r) => !hasNote(r)),
    [withEmail]
  );

  const tryGo = () => {
    if (missingNote.length > 0) {
      setShowConfirm(true);
      return;
    }
    setSendList(complete.map((s) => ({ ...s, sent: false })));
    setView("send");
  };

  const confirmSend = (inc) => {
    setSendList(
      (inc ? [...complete, ...missingNote] : [...complete]).map((s) => ({
        ...s,
        sent: false,
      }))
    );
    setShowConfirm(false);
    setView("send");
  };

  const markSent = useCallback((idx) => {
    setSendList((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, sent: true } : s))
    );
  }, []);

  const pending = useMemo(() => sendList.filter((s) => !s.sent), [sendList]);
  const sentCount = useMemo(
    () => sendList.filter((s) => s.sent).length,
    [sendList]
  );

  const bulkSend = () => {
    pending.forEach((s, i) => {
      setTimeout(() => {
        const fs = fill(subject, s, module);
        const fb = fill(body, s, module);
        window.open(
          `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent(fs)}&body=${encodeURIComponent(fb)}`,
          "_blank"
        );
        markSent(sendList.indexOf(s));
      }, i * 800);
    });
  };

  const theme = dark ? darkTheme : lightTheme;

  useEffect(() => {
    document.body.style.background = dark ? darkTheme['--bg'] : lightTheme['--bg'];
  }, [dark]);

  return (
    <div style={{ ...rootBase, ...theme }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; transition: background .3s ease, color .3s ease, border-color .3s ease, box-shadow .3s ease; }
        body { background: var(--bg, #f6f7f8); transition: background .3s ease; }
        input::placeholder, textarea::placeholder { color: var(--muted); opacity: .5; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 3px; }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      {showConfirm && (
        <ConfirmModal
          missing={missingNote}
          onConfirm={confirmSend}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* floating theme toggle */}
      <button
        onClick={toggleDark}
        title={dark ? "Mode clair" : "Mode sombre"}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 50,
          background: "var(--card)",
          border: "1px solid var(--rule)",
          borderRadius: "50%",
          width: 40,
          height: 40,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          boxShadow: "0 2px 10px rgba(0,0,0,.15)",
          transition: "color .15s, background .15s",
        }}
      >
        {dark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>

      {/* header */}
      <div
        style={{
          borderBottom: "2px solid var(--fg)",
          paddingBottom: 10,
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-.03em",
            }}
          >
            ISC Grade Mailer
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Coller · Vérifier · Envoyer
          </p>
        </div>
        <img
          src={dark ? LOGO_WHITE : LOGO_BLACK}
          alt="ISC"
          style={{ height: 32, opacity: 0.85 }}
        />
      </div>

      {view === "edit" ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="mod" style={labelSm}>
              Module ou unité d'enseignement
            </label>
            <input
              id="mod"
              type="text"
              placeholder="ex. 101.1 Programmation impérative"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <label style={labelSm}>
                Données étudiant·es{" "}
                <span style={{ fontWeight: 400, color: "var(--muted)" }}>
                  — collez depuis Excel (la colonne M/F est optionnelle)
                </span>
              </label>
              <button
                onClick={() =>
                  setRows(Array.from({ length: INITIAL_ROWS }, EMPTY_ROW))
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: 11,
                  textDecoration: "underline",
                }}
              >
                Vider
              </button>
            </div>
            <SpreadsheetTable rows={rows} setRows={setRows} />
            {missingNote.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--warn-fg)",
                }}
              >
                <span style={{ fontSize: 15 }}>⚠</span>
                <span>
                  <b>{missingNote.length}</b> étudiant
                  {missingNote.length > 1 ? "s" : ""} sans note
                </span>
              </div>
            )}
          </div>

          <details open style={{ marginBottom: 20 }}>
            <summary
              style={{
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".05em",
                color: "var(--muted)",
                userSelect: "none",
              }}
            >
              Template email ▾
            </summary>
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--rule)",
                borderRadius: 8,
                padding: 16,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                <code
                  style={{
                    background: "var(--tag-bg)",
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  {"{civilite}"}
                </code>{" "}
                → <b>Cher</b> (M), <b>Chère</b> (F) ou <b>Bonjour</b> (vide)
              </div>
              <TemplateField
                id="subj"
                label="Objet"
                value={subject}
                onChange={setSubject}
              />
              <TemplateField
                id="body"
                label="Corps"
                value={body}
                onChange={setBody}
                multiline
              />
            </div>
          </details>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={tryGo}
              disabled={withEmail.length === 0}
              style={{
                ...primaryBtn,
                opacity: withEmail.length ? 1 : 0.4,
                cursor: withEmail.length ? "pointer" : "not-allowed",
              }}
            >
              Vérifier & envoyer ({withEmail.length})
            </button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {complete.length} complet{complete.length > 1 ? "s" : ""}
              {average !== null && (
                <>
                  {" "}· moy. <b style={{ color: "var(--fg)" }}>{average}</b>
                </>
              )}
              {missingNote.length > 0 && (
                <>
                  ,{" "}
                  <span style={{ color: "var(--warn-fg)" }}>
                    {missingNote.length} sans note
                  </span>
                </>
              )}
            </span>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setView("edit")} style={secondaryBtn}>
                ← Modifier
              </button>
              {pending.length > 0 && (
                <button onClick={bulkSend} style={primaryBtn}>
                  ✉ Envoyer tout ({pending.length})
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              <b style={{ color: "var(--fg)" }}>{sendList.length}</b> étudiants
              {module ? ` · ${module}` : ""}
              {sentCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--sent-fg)" }}>
                    {sentCount} envoyé{sentCount > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--rule)",
              borderRadius: 8,
              padding: "2px 14px",
            }}
          >
            {sendList.map((s, i) => (
              <SendRow
                key={i}
                student={s}
                subject={subject}
                body={body}
                module={module}
                onSent={() => markSent(i)}
              />
            ))}
          </div>

          {sentCount === sendList.length && sendList.length > 0 && (
            <div
              style={{
                marginTop: 18,
                padding: 14,
                background: "var(--sent-bg)",
                borderRadius: 8,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--sent-fg)",
              }}
            >
              ✓ Tous les emails ont été ouverts dans votre messagerie
            </div>
          )}
        </>
      )}

      {/* footer */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 14,
          borderTop: "1px solid var(--rule)",
          textAlign: "center",
          fontSize: 11,
          color: "var(--muted)",
          letterSpacing: ".02em",
        }}
      >
        Made with{" "}
        <span
          style={{
            display: "inline-block",
            animation: "pulse 1.2s ease-in-out infinite",
            color: "#DD0069",
            fontSize: 13,
          }}
        >
          ♥
        </span>{" "}
        — ISC 2026
        <br />
        <span style={{ fontSize: 10, opacity: 0.6 }}>
          v54a3a5e · 30.03.2026
        </span>
      </div>
    </div>
  );
}

/* ── themes ────────────────────────────────────────────────── */
const lightTheme = {
  "--fg": "#1c1e21",
  "--muted": "#7a7f87",
  "--rule": "#e0e2e6",
  "--bg": "#f6f7f8",
  "--card": "#fff",
  "--accent": "#1a6be5",
  "--badge-bg": "#e5ecf5",
  "--badge-fg": "#2b5ea7",
  "--sent-bg": "#ddf5e7",
  "--sent-fg": "#1a7a42",
  "--valid-bg": "#f7faff",
  "--warn-bg": "#fff7ed",
  "--warn-fg": "#c2650a",
  "--preview-bg": "#f3f4f6",
  "--tag-bg": "#edf0f5",
  "--tag-fg": "#3d6cb9",
  "--tag-border": "#d5dbe6",
};
const darkTheme = {
  "--fg": "#d1d5db",
  "--muted": "#6b7280",
  "--rule": "#374151",
  "--bg": "#111827",
  "--card": "#1f2937",
  "--accent": "#60a5fa",
  "--badge-bg": "#1e3a5f",
  "--badge-fg": "#93c5fd",
  "--sent-bg": "#064e3b",
  "--sent-fg": "#6ee7b7",
  "--valid-bg": "#172554",
  "--warn-bg": "#451a03",
  "--warn-fg": "#fbbf24",
  "--preview-bg": "#1e293b",
  "--tag-bg": "#1e3a5f",
  "--tag-fg": "#93c5fd",
  "--tag-border": "#374151",
};
const rootBase = {
  "--mono": "'JetBrains Mono','Fira Code',monospace",
  "--body": "'DM Sans','Helvetica Neue',sans-serif",
  fontFamily: "var(--body)",
  color: "var(--fg)",
  background: "var(--bg)",
  maxWidth: "90%",
  margin: "0 auto",
  padding: "24px 18px",
  minHeight: "100vh",
};

/* ── shared styles ─────────────────────────────────────────── */
const labelSm = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: ".04em",
  marginBottom: 4,
};
const inputBase = {
  padding: "8px 11px",
  borderRadius: 6,
  border: "1px solid var(--rule)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: 13,
  outline: "none",
};
const thStyle = {
  padding: "7px 4px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".05em",
  color: "var(--muted)",
  borderBottom: "2px solid var(--rule)",
  textAlign: "left",
  background: "var(--bg)",
};
const tdStyle = { padding: 0, borderBottom: "1px solid var(--rule)" };
const rowNumStyle = {
  padding: "0 2px",
  borderBottom: "1px solid var(--rule)",
  textAlign: "center",
  background: "var(--bg)",
  borderRight: "1px solid var(--rule)",
};
const cellInput = {
  width: "100%",
  border: "none",
  background: "transparent",
  padding: "7px 6px",
  fontSize: 12.5,
  fontFamily: "var(--body)",
  color: "var(--fg)",
  borderRadius: 0,
  boxSizing: "border-box",
};
const primaryBtn = {
  padding: "9px 20px",
  borderRadius: 6,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const secondaryBtn = {
  padding: "9px 16px",
  borderRadius: 6,
  border: "1px solid var(--rule)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};
const iconBtn = {
  width: 26,
  height: 26,
  borderRadius: 5,
  border: "1px solid var(--rule)",
  background: "transparent",
  cursor: "pointer",
  fontSize: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--muted)",
};
const sendBtnSm = {
  width: 30,
  height: 30,
  borderRadius: 6,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  textDecoration: "none",
};
const badgeStyle = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".03em",
};
const tagPillStyle = {
  padding: "1px 7px",
  fontSize: 10.5,
  fontFamily: "var(--mono)",
  background: "var(--tag-bg)",
  color: "var(--tag-fg)",
  border: "1px solid var(--tag-border)",
  borderRadius: 3,
  cursor: "pointer",
  lineHeight: 1.5,
};
