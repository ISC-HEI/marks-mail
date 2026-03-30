import { useState, useCallback, useMemo, useRef, useEffect } from "react";

const LOGO_BLACK = "./ISC_Logo_V3_-_black.svg";
const LOGO_WHITE = "./ISC_Logo_V3_-_white.svg";

/* ── table columns — genre first, optional ─────────────────── */
const COLS = [
  { key: "genre", label: "M/F", width: "7%" },
  { key: "nom", label: "Nom", width: "19%" },
  { key: "prenom", label: "Prénom", width: "19%" },
  { key: "email", label: "Email", width: "33%" },
  { key: "note", label: "Note", width: "10%" },
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
  { tag: "{civilite}" },
  { tag: "{prenom}" },
  { tag: "{nom}" },
  { tag: "{email}" },
  { tag: "{note}" },
  { tag: "{module}" },
];

const DEFAULT_SUBJECT = "Note — {module}";
const DEFAULT_BODY = `{civilite},

Vous trouverez ci-dessous votre note pour le module {module} :

  Étudiant·e : {prenom} {nom}
  Note :       {note}

Si vous avez des questions, n'hésitez pas à me contacter.

Cordialement,
Pierre-André`;

/* ── helpers ───────────────────────────────────────────────── */
function civilite(g) {
  const v = (g || "").trim().toUpperCase();
  if (v === "F") return "Chère";
  if (v === "M") return "Cher";
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
  const [d, setD] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e) => setD(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return [d, () => setD((p) => !p)];
}

/* ── tag pill ──────────────────────────────────────────────── */
function TagPill({ tag, onClick }) {
  return (
    <button onClick={onClick} style={tagPillStyle}>
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
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
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
                  <td key={col.key} style={tdStyle}>
                    <input
                      data-r={ri}
                      data-c={ci}
                      value={row[col.key]}
                      onChange={(e) => updateCell(ri, col.key, e.target.value)}
                      onPaste={(e) => handlePaste(e, ri, ci)}
                      onFocus={() => setSel({ r: ri, c: ci })}
                      onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                      placeholder={col.key === "genre" ? "M/F" : ""}
                      style={{
                        ...cellInput,
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
          ⚠ {missing.length} étudiant{missing.length > 1 ? "s" : ""} sans note
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

  return (
    <div style={{ ...rootBase, ...theme }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { background: var(--bg, #f6f7f8); }
        input::placeholder, textarea::placeholder { color: var(--muted); opacity: .5; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 3px; }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
      `}</style>

      {showConfirm && (
        <ConfirmModal
          missing={missingNote}
          onConfirm={confirmSend}
          onCancel={() => setShowConfirm(false)}
        />
      )}

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
            Grade Mailer
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Coller · Vérifier · Envoyer
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={toggleDark}
            title={dark ? "Mode clair" : "Mode sombre"}
            style={{
              background: "none",
              border: "1px solid var(--rule)",
              borderRadius: 6,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg)",
            }}
          >
            {dark ? "☀" : "☽"}
          </button>
          <img
            src={dark ? LOGO_WHITE : LOGO_BLACK}
            alt="ISC"
            style={{ height: 32, opacity: 0.85 }}
          />
        </div>
      </div>

      {view === "edit" ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="mod" style={labelSm}>
              Module
            </label>
            <input
              id="mod"
              type="text"
              placeholder="ex. Systèmes d'exploitation"
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
                Données étudiants{" "}
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

          <details style={{ marginBottom: 20 }}>
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
        made with{" "}
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
  "--fg": "#e4e6ea",
  "--muted": "#8b8f96",
  "--rule": "#33363b",
  "--bg": "#18191c",
  "--card": "#222326",
  "--accent": "#4d90f0",
  "--badge-bg": "#2a3448",
  "--badge-fg": "#7eadf0",
  "--sent-bg": "#1e3329",
  "--sent-fg": "#5ee09c",
  "--valid-bg": "#1d2230",
  "--warn-bg": "#33281a",
  "--warn-fg": "#e89a3c",
  "--preview-bg": "#1e1f22",
  "--tag-bg": "#2a2d33",
  "--tag-fg": "#7eadf0",
  "--tag-border": "#3a3e46",
};
const rootBase = {
  "--mono": "'JetBrains Mono','Fira Code',monospace",
  "--body": "'DM Sans','Helvetica Neue',sans-serif",
  fontFamily: "var(--body)",
  color: "var(--fg)",
  background: "var(--bg)",
  maxWidth: 760,
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
