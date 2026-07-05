import { useState, useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase.js";

/* ─────────────────────────────────────────────
   Готовим свадьбу Насти и Серёжи · общий трекер
   Данные общие: видят и меняют все, у кого есть ссылка.
   Изменения появляются у всех в реальном времени.
   Файлы храним ссылками (Диск/Drive) — сам трекер файлы не хранит.
   ───────────────────────────────────────────── */

const DOC = doc(db, "tracker", "main");
const WEDDING = "2026-08-01";

const C = {
  bg: "#F9F4E9", card: "#FFFDF8", edge: "#E3D9C3",
  ink: "#4A3B2A", soft: "#8B7D68", faint: "#B4A78F",
  rose: "#C1702F", roseBg: "#F6E9D7",   /* рыжий из их палитры */
  gold: "#CE9B2C", goldBg: "#F7EFD4",   /* жёлтый */
  sage: "#7A8450", sageBg: "#EDEFDC",   /* олива */
  red: "#B4543B", redBg: "#F6E6DF",
};

const STATUSES = ["Не начато", "В работе", "Готово", "Проблема"];
const S_STYLE = {
  "Не начато": { color: C.soft, bg: "#F2EFEA" },
  "В работе": { color: C.gold, bg: C.goldBg },
  "Готово":   { color: C.sage, bg: C.sageBg },
  "Проблема": { color: C.red,  bg: C.redBg },
};

const seedData = () => {
  let id = 0;
  const t = (block, title, date) => ({ id: ++id, block, title, date, owner: "", status: "Не начато", note: "", links: [] });
  return {
    folderUrl: "",
    blocks: [
      "Организация", "Интро на экране", "Номер с родителями", 
      "Интервью", "Видео от друга", "Танцы", "Подарок и Кейптаун", 
      "Песня", "Финальная неделя"
    ],
    tasks: [
      t("Организация", "Утвердить сценарий и раздать роли", "2026-07-05"),
      t("Организация", "Выбрать песню для финального караоке", "2026-07-08"),
      t("Организация", "Решить и заказать форму: пилотки или жилеты", "2026-07-11"),
      t("Организация", "Договориться с площадкой: экран, звук, микрофон", "2026-07-11"),
      t("Организация", "Скинуться и зафиксировать бюджет", "2026-07-05"),
      t("Интро на экране", "Вписать имена ребят в заставку-табло", "2026-07-11"),
      t("Интро на экране", "Проверить заставку на экране площадки", "2026-07-25"),
      t("Номер с родителями", "Сделать реквизит маршрута: лента или таблички", "2026-07-18"),
      t("Номер с родителями", "Собрать детские фото ребят для экрана", "2026-07-18"),
      t("Интервью", "Написать вопросы и договориться о стоп-фразе", "2026-07-11"),
      t("Интервью", "Прогнать интервью с таймером — максимум 2:30", "2026-07-19"),
      t("Видео от друга", "Отправить другу ТЗ на видео", "2026-07-07"),
      t("Видео от друга", "Получить черновик и дать правки", "2026-07-18"),
      t("Видео от друга", "Забрать финальное видео и сохранить локально", "2026-07-24"),
      t("Танцы", "Найти тот самый тектоник-трек с росписи", "2026-07-08"),
      t("Танцы", "Выбрать трек для смешного общего танца", "2026-07-11"),
      t("Танцы", "Придумать движения и точку перехода в тектоник", "2026-07-18"),
      t("Танцы", "Отрепетировать связку целиком", "2026-07-25"),
      t("Подарок и Кейптаун", "Заказать видео-привет из Африки (делают 2–3 недели!)", "2026-07-07"),
      t("Подарок и Кейптаун", "Купить билеты или сертификат в Кейптаун", "2026-07-18"),
      t("Подарок и Кейптаун", "Красиво оформить конверт с подарком", "2026-07-24"),
      t("Подарок и Кейптаун", "Наделать бумажных самолётиков", "2026-07-25"),
      t("Песня", "Переделать текст под выбранный хит", "2026-07-11"),
      t("Песня", "Найти минусовку и проверить, что поётся", "2026-07-11"),
      t("Песня", "Собрать фото и видео ребят для нарезки", "2026-07-18"),
      t("Песня", "Первая спевка всей командой", "2026-07-19"),
      t("Песня", "Распечатать тексты крупно, каждому", "2026-07-25"),
      t("Финальная неделя", "Генеральный прогон №1 с секундомером", "2026-07-26"),
      t("Финальная неделя", "Генеральный прогон №2 и правки", "2026-07-29"),
      t("Финальная неделя", "Проверить все видео и треки на площадке", "2026-07-31"),
      t("Финальная неделя", "Пройтись по финальному чек-листу", "2026-07-31"),
    ],
    meetings: [
      { id: 1, date: "2026-07-12", title: "Встреча: как идут дела" },
      { id: 2, date: "2026-07-19", title: "Встреча + первая репетиция" },
      { id: 3, date: "2026-07-26", title: "Встреча + генеральный прогон" },
      { id: 4, date: "2026-08-01", title: "Свадьба! 💍" },
    ],
    files: [],
  };
};

/* ---------- helpers ---------- */
const fmtD = (iso) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}.${m}`; };
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysTo = (iso) => Math.ceil((new Date(iso) - new Date(todayISO())) / 86400000);

const serif = { fontFamily: "'Amatic SC', cursive", letterSpacing: "0.03em" };
const sans = { fontFamily: "'Nunito', 'Segoe UI', sans-serif" };
const hand = { fontFamily: "'Caveat', cursive" };

/* ── рисованные самолётики (как на пригласительном) ── */
const Plane = ({ w = 44, rot = 0, style = {} }) => (
  <svg width={w} height={w * 0.72} viewBox="0 0 48 34" fill="none"
    style={{ transform: `rotate(${rot}deg)`, display: "block", ...style }}>
    <path d="M2 18 C 14 13.5, 30 7.5, 46 3 C 38 12, 30.5 20, 24 31 L 19 21 Z"
      stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" fill="rgba(255,253,248,0.6)" />
    <path d="M19 21 L 45.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M24 30.5 L 21.8 23.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const Trail = ({ w = 120, style = {} }) => (
  <svg width={w} height={w * 0.3} viewBox="0 0 120 36" fill="none" style={{ display: "block", ...style }}>
    <path d="M2 30 C 26 8, 40 34, 58 18 C 66 11, 62 2, 54 8 C 47 13, 58 22, 74 16 C 90 10, 104 8, 118 6"
      stroke="currentColor" strokeWidth="1.7" strokeDasharray="1.5 6" strokeLinecap="round" />
  </svg>
);

export default function WeddingTracker() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("tasks");
  const [saving, setSaving] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [editing, setEditing] = useState(null);
  const [calMonth, setCalMonth] = useState(6); // 6 = июль (0-based)
  const [selDay, setSelDay] = useState(null);

  // Живая подписка на общий документ.
  useEffect(() => {
    const unsub = onSnapshot(
      DOC,
      async (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          // Миграция старых данных: если блоков еще нет, собираем их из задач
          if (!d.blocks) {
            d.blocks = [...new Set((d.tasks || []).map(t => t.block))];
          }
          setData(d);
        } else {
          // Документа ещё нет — заводим стартовый набор задач.
          const fresh = seedData();
          setData(fresh);
          try { await setDoc(DOC, fresh); } catch (e) { console.error(e); }
        }
      },
      (err) => {
        console.error(err);
        setSaving("нет связи с базой — проверьте интернет");
      }
    );
    return () => unsub();
  }, []);

  const persist = async (next) => {
    setData(next); // мгновенный отклик в UI
    setSaving("…");
    try {
      await setDoc(DOC, next);
      const t = new Date();
      setSaving(`сохранено ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`);
    } catch (e) {
      console.error(e);
      setSaving("не сохранилось — попробуйте ещё раз");
    }
  };

  // Управление блоками
  const addBlock = () => {
    const name = prompt("Название нового раздела:");
    if (!name || data.blocks.includes(name.trim())) return;
    persist({ ...data, blocks: [...data.blocks, name.trim()] });
  };

  const renameBlock = (oldName) => {
    const newName = prompt("Новое название раздела:", oldName);
    if (!newName || newName.trim() === oldName || data.blocks.includes(newName.trim())) return;
    const trimmed = newName.trim();
    persist({
      ...data,
      blocks: data.blocks.map(b => b === oldName ? trimmed : b),
      tasks: data.tasks.map(t => t.block === oldName ? { ...t, block: trimmed } : t)
    });
  };

  const deleteBlock = (blockName) => {
    const blockTasks = data.tasks.filter(t => t.block === blockName);
    if (blockTasks.length > 0) {
      if (!confirm(`Внимание: в разделе «${blockName}» есть задачи (${blockTasks.length} шт.).\nУдалить раздел вместе со всеми задачами?`)) return;
    } else {
      if (!confirm(`Удалить пустой раздел «${blockName}»?`)) return;
    }
    persist({
      ...data,
      blocks: data.blocks.filter(b => b !== blockName),
      tasks: data.tasks.filter(t => t.block !== blockName)
    });
  };

  // Управление задачами
  const patchTask = (id, f) => persist({ ...data, tasks: data.tasks.map(t => t.id === id ? { ...t, ...f } : t) });
  const cycle = (t) => patchTask(t.id, { status: STATUSES[(STATUSES.indexOf(t.status) + 1) % 4] });
  const delTask = (id) => { if (confirm("Удалить задачу у всех?")) persist({ ...data, tasks: data.tasks.filter(t => t.id !== id) }); };
  const addTask = (block) => {
    const title = prompt(`Новая задача в раздел «${block}»:`);
    if (!title) return;
    const id = Math.max(0, ...data.tasks.map(t => t.id)) + 1;
    persist({ ...data, tasks: [...data.tasks, { id, block, title, date: todayISO(), owner: "", status: "Не начато", note: "", links: [] }] });
  };
  const addLink = (t) => {
    const name = prompt("Название файла (например «черновик видео»):");
    if (!name) return;
    const url = prompt("Ссылка на файл (Диск, Drive, что угодно):");
    if (!url) return;
    patchTask(t.id, { links: [...(t.links || []), { name, url }] });
  };
  const delLink = (t, i) => patchTask(t.id, { links: t.links.filter((_, j) => j !== i) });

  const addMeeting = (dateISO) => {
    const title = prompt("Что за встреча?", "Собираемся у…");
    if (!title) return;
    const id = Math.max(0, ...data.meetings.map(m => m.id)) + 1;
    persist({ ...data, meetings: [...data.meetings, { id, date: dateISO, title }] });
  };
  const delMeeting = (id) => { if (confirm("Убрать встречу?")) persist({ ...data, meetings: data.meetings.filter(m => m.id !== id) }); };

  const addFile = () => {
    const name = prompt("Что за файл? (например «минусовка», «фото ребят»)");
    if (!name) return;
    const url = prompt("Ссылка:");
    if (!url) return;
    const who = prompt("Кто добавил? (имя)") || "";
    const id = Math.max(0, ...data.files.map(f => f.id), 0) + 1;
    persist({ ...data, files: [...data.files, { id, name, url, who, added: todayISO() }] });
  };
  const delFile = (id) => { if (confirm("Убрать из папки?")) persist({ ...data, files: data.files.filter(f => f.id !== id) }); };
  const setFolder = () => {
    const url = prompt("Ссылка на общую папку (Google Drive / Яндекс.Диск):", data.folderUrl || "https://");
    if (url !== null) persist({ ...data, folderUrl: url });
  };

  if (!data) return (
    <div style={{ ...hand, minHeight: "100vh", background: C.bg, color: C.soft,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 28 }}>
      <style>{css}</style><span style={{ color: C.rose }}><Plane w={34} rot={-8} /></span>Открываем…
    </div>
  );

  const { tasks, meetings, files, blocks } = data;
  const done = tasks.filter(t => t.status === "Готово").length;
  const problems = tasks.filter(t => t.status === "Проблема").length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const dd = daysTo(WEDDING);

  /* скоро дедлайн: ближайшие 5 несделанных */
  const upcoming = tasks
    .filter(t => t.status !== "Готово" && t.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, ...sans, paddingBottom: 70 }}>
      <style>{css}</style>

      {/* ───── шапка-приглашение ───── */}
      <div style={{ position: "relative", textAlign: "center", padding: "40px 16px 8px", overflow: "hidden" }}>
        <div className="float1" style={{ position: "absolute", left: "5%", top: 30, color: C.sage, opacity: 0.85 }}>
          <Plane w={40} rot={-14} />
        </div>
        <div style={{ position: "absolute", left: "11%", top: 66, color: C.sage, opacity: 0.5 }}>
          <Trail w={90} />
        </div>
        <div className="float2" style={{ position: "absolute", right: "6%", top: 74, color: C.rose, opacity: 0.9 }}>
          <Plane w={52} rot={10} />
        </div>
        <div style={{ position: "absolute", right: "13%", top: 34, color: C.gold, opacity: 0.55, transform: "scaleX(-1)" }}>
          <Trail w={110} />
        </div>

        <div style={{ ...hand, fontSize: 24, color: C.soft }}>
          готовим сюрприз на свадьбу
        </div>
        <h1 style={{ ...serif, fontWeight: 700, fontSize: "clamp(52px, 11vw, 84px)", lineHeight: 1, margin: "4px 0 2px", color: C.ink }}>
          Настя + Серёжа
        </h1>
        <div style={{ ...hand, fontSize: 24, color: C.rose }}>
          1 августа · осталось {dd > 0 ? `${dd} ${plural(dd)}` : "0 дней — сегодня!"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, margin: "10px 0 0", color: C.gold }}>
          <Trail w={130} />
          <span style={{ color: C.rose }}><Plane w={30} rot={-10} /></span>
        </div>

        {/* прогресс с самолётиком на кончике */}
        <div style={{ maxWidth: 460, margin: "6px auto 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.soft }}>
            <span>сделано {done} из {tasks.length}</span>
            <span style={{ color: problems ? C.red : C.sage, fontWeight: 700 }}>
              {problems ? `⚠ затыков: ${problems}` : "всё по плану ✓"}
            </span>
          </div>
          <div style={{ position: "relative", marginTop: 20 }}>
            <div style={{ position: "absolute", left: `calc(${pct}% - 13px)`, top: -17,
              color: C.rose, transition: "left .4s" }}>
              <Plane w={26} rot={14} />
            </div>
            <div style={{ height: 8, background: "#EFE7D3", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: pct + "%", height: "100%", borderRadius: 6,
                background: `linear-gradient(90deg, ${C.sage}, ${C.gold}, ${C.rose})`, transition: "width .4s" }} />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{saving}</div>
      </div>

      {/* ───── вкладки ───── */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "14px 0 20px", flexWrap: "wrap" }}>
        {[["tasks", "Задачи"], ["cal", "Календарь"], ["folder", "Папка"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="tabbtn"
            style={{ ...sans, fontSize: 14, fontWeight: 700, cursor: "pointer",
              padding: "9px 22px", borderRadius: 999,
              border: `1.5px solid ${tab === k ? C.rose : C.edge}`,
              background: tab === k ? C.roseBg : C.card,
              color: tab === k ? C.rose : C.soft }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px" }}>

        {/* ═════════ ЗАДАЧИ ═════════ */}
        {tab === "tasks" && <>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.soft, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
            спрятать готовые
          </label>

          {blocks.map(block => {
            const list = tasks.filter(t => t.block === block && (!hideDone || t.status !== "Готово"));
            const total = tasks.filter(t => t.block === block);
            const bd = total.filter(t => t.status === "Готово").length;
            return (
              <div key={block} style={{ marginBottom: 26 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h2 style={{ ...serif, fontSize: 34, fontWeight: 700, margin: 0 }}>{block}</h2>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => renameBlock(block)} style={{...xbtn, fontSize: 15}} title="Переименовать раздел">✎</button>
                      <button onClick={() => deleteBlock(block)} style={{...xbtn, fontSize: 14}} title="Удалить раздел">✕</button>
                    </div>
                  </div>
                  {total.length > 0 && (
                    <span style={{ fontSize: 12, color: bd === total.length ? C.sage : C.faint, fontWeight: 700 }}>
                      {bd}/{total.length}
                    </span>
                  )}
                </div>

                {list.map(t => {
                  const late = t.status !== "Готово" && t.date < todayISO();
                  const soon = !late && t.status !== "Готово" && daysTo(t.date) <= 3;
                  return (
                    <div key={t.id} style={{ background: C.card, border: `1px solid ${C.edge}`,
                      borderRadius: 14, padding: "12px 14px", marginBottom: 10,
                      boxShadow: "0 1px 3px rgba(62,58,57,0.05)" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <button onClick={() => cycle(t)} title="Нажми — сменится статус"
                          style={{ ...sans, fontSize: 11.5, fontWeight: 800, cursor: "pointer",
                            border: "none", borderRadius: 999, padding: "6px 12px", minWidth: 92,
                            color: S_STYLE[t.status].color, background: S_STYLE[t.status].bg }}>
                          {t.status}
                        </button>

                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontSize: 15, lineHeight: 1.4,
                            color: t.status === "Готово" ? C.faint : C.ink,
                            textDecoration: t.status === "Готово" ? "line-through" : "none" }}>
                            {t.title}
                          </div>
                          <div style={{ display: "flex", gap: 12, marginTop: 5, flexWrap: "wrap", alignItems: "center", fontSize: 12.5 }}>
                            <span style={{ color: late ? C.red : soon ? C.gold : C.soft, fontWeight: late || soon ? 800 : 400 }}>
                              {late ? "⏰ просрочено · " : soon ? "🔔 скоро · " : "до "}{fmtD(t.date)}
                            </span>
                            <button onClick={() => setEditing(editing === t.id ? null : t.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0,
                                fontSize: 12.5, color: t.owner ? C.rose : C.faint,
                                fontWeight: t.owner ? 800 : 400,
                                textDecoration: t.owner ? "none" : "underline dotted" }}>
                              {t.owner ? "💌 " + t.owner : "+ кто делает"}
                            </button>
                            {(t.links || []).map((l, i) => (
                              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4,
                                background: C.goldBg, borderRadius: 999, padding: "2px 9px" }}>
                                <a href={l.url} target="_blank" rel="noreferrer"
                                  style={{ color: C.gold, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
                                  📎 {l.name}
                                </a>
                                {editing === t.id &&
                                  <button onClick={() => delLink(t, i)} style={xbtn}>✕</button>}
                              </span>
                            ))}
                            {t.note && editing !== t.id &&
                              <span style={{ color: C.soft, fontStyle: "italic" }}>💬 {t.note}</span>}
                          </div>
                        </div>

                        <button onClick={() => delTask(t.id)} title="Удалить" style={xbtn}>✕</button>
                      </div>

                      {editing === t.id && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <input defaultValue={t.owner} placeholder="Кто делает"
                            onBlur={e => patchTask(t.id, { owner: e.target.value.trim() })} style={inp(130)} />
                          <input type="date" defaultValue={t.date}
                            onBlur={e => e.target.value && patchTask(t.id, { date: e.target.value })} style={inp(140)} />
                          <input defaultValue={t.note} placeholder="Комментарий"
                            onBlur={e => patchTask(t.id, { note: e.target.value.trim() })} style={inp(180)} />
                          <button onClick={() => addLink(t)} style={pill(C.gold, C.goldBg)}>📎 файл</button>
                          <button onClick={() => setEditing(null)} style={pill(C.sage, C.sageBg)}>Готово</button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button onClick={() => addTask(block)}
                  style={{ width: "100%", padding: "9px", borderRadius: 12, cursor: "pointer",
                    border: `1.5px dashed ${C.edge}`, background: "transparent",
                    color: C.faint, fontSize: 13, ...sans }}>
                  + добавить задачу
                </button>
              </div>
            );
          })}
          
          <button onClick={addBlock}
            style={{ width: "100%", padding: "14px", borderRadius: 14, cursor: "pointer",
              border: `2px dashed ${C.rose}66`, background: C.roseBg,
              color: C.rose, fontSize: 14, fontWeight: 700, ...sans, marginTop: 10 }}>
            ＋ ДОБАВИТЬ НОВЫЙ БЛОК
          </button>
        </>}

        {/* ═════════ КАЛЕНДАРЬ ═════════ */}
        {tab === "cal" && <CalendarView
          month={calMonth} setMonth={setCalMonth}
          tasks={tasks} meetings={meetings}
          selDay={selDay} setSelDay={setSelDay}
          addMeeting={addMeeting} delMeeting={delMeeting}
          upcoming={upcoming}
        />}

        {/* ═════════ ПАПКА ═════════ */}
        {tab === "folder" && <>
          <div style={{ background: C.roseBg, border: `1px solid ${C.edge}`, borderRadius: 14,
            padding: "16px 18px", marginBottom: 18 }}>
            <div style={{ ...serif, fontSize: 30, fontWeight: 700, marginBottom: 4 }}>Наша общая папка</div>
            <div style={{ fontSize: 13, color: C.soft, lineHeight: 1.5, marginBottom: 10 }}>
              Все файлы — фото, видео, треки, тексты — складываем в одну облачную папку
              (Google Drive или Яндекс.Диск), а сюда добавляем ссылки, чтобы ничего не потерялось.
            </div>
            {data.folderUrl
              ? <a href={data.folderUrl} target="_blank" rel="noreferrer"
                  style={{ color: C.rose, fontWeight: 800, fontSize: 15 }}>📁 Открыть общую папку →</a>
              : <span style={{ color: C.faint, fontSize: 14 }}>Ссылка ещё не добавлена</span>}
            <button onClick={setFolder} style={{ ...pill(C.rose, "#fff"), marginLeft: 12 }}>
              {data.folderUrl ? "изменить" : "＋ добавить ссылку"}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h2 style={{ ...serif, fontSize: 34, fontWeight: 700, margin: 0 }}>Что уже собрали</h2>
            <button onClick={addFile} style={pill(C.rose, C.roseBg)}>＋ добавить файл</button>
          </div>

          {files.length === 0 &&
            <div style={{ color: C.faint, fontSize: 14, fontStyle: "italic", padding: "18px 0",
              display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: C.sage }}><Trail w={80} /></span>
              Пока пусто. Добавь первую ссылку — минусовку, фото или черновик видео.
            </div>}

          {files.map(f => (
            <div key={f.id} style={{ background: C.card, border: `1px solid ${C.edge}`, borderRadius: 12,
              padding: "11px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <a href={f.url} target="_blank" rel="noreferrer"
                style={{ color: C.ink, fontWeight: 700, fontSize: 14.5, textDecoration: "none", flex: 1, minWidth: 160 }}>
                📎 {f.name}
              </a>
              <span style={{ fontSize: 12, color: C.faint }}>
                {f.who && `от ${f.who} · `}{fmtD(f.added)}
              </span>
              <button onClick={() => delFile(f.id)} style={xbtn}>✕</button>
            </div>
          ))}
        </>}

        {/* подвал */}
        <div style={{ marginTop: 36, borderTop: `1px solid ${C.edge}`, paddingTop: 14,
          fontSize: 12, color: C.faint, textAlign: "center", lineHeight: 1.7 }}>
          Трекер общий: всё, что меняете, видят все, у кого есть ссылка. Обновления приходят в реальном времени.<br />
          Файлы живут в облачной папке — здесь только ссылки на них.
        </div>
      </div>
    </div>
  );
}

/* ───────────── календарь ───────────── */
function CalendarView({ month, setMonth, tasks, meetings, selDay, setSelDay, addMeeting, delMeeting, upcoming }) {
  const YEAR = 2026;
  const names = ["", "", "", "", "", "", "Июль", "Август"];
  const first = new Date(YEAR, month, 1);
  const days = new Date(YEAR, month + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Пн=0
  const iso = (d) => `${YEAR}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const today = todayISO();

  const dayTasks = (d) => tasks.filter(t => t.date === iso(d));
  const dayMeets = (d) => meetings.filter(m => m.date === iso(d));

  const sel = selDay ? {
    date: selDay,
    tasks: tasks.filter(t => t.date === selDay),
    meets: meetings.filter(m => m.date === selDay),
  } : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, marginBottom: 14 }}>
        <button onClick={() => setMonth(6)} disabled={month === 6} style={navBtn(month === 6)}>‹ Июль</button>
        <h2 style={{ ...serif, fontSize: 38, fontWeight: 700, margin: 0 }}>{names[month]} {YEAR}</h2>
        <button onClick={() => setMonth(7)} disabled={month === 7} style={navBtn(month === 7)}>Август ›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {["пн","вт","ср","чт","пт","сб","вс"].map(d =>
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: C.faint, fontWeight: 800, textTransform: "uppercase" }}>{d}</div>)}
        {Array.from({ length: startDow }).map((_, i) => <div key={"e"+i} />)}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1, dIso = iso(d);
          const ts = dayTasks(d), ms = dayMeets(d);
          const isToday = dIso === today, isSel = dIso === selDay;
          const isWedding = dIso === WEDDING;
          return (
            <button key={d} onClick={() => setSelDay(isSel ? null : dIso)}
              style={{ aspectRatio: "1", borderRadius: 12, cursor: "pointer", position: "relative",
                border: `1.5px solid ${isSel ? C.rose : isToday ? C.gold : C.edge}`,
                background: isWedding ? C.roseBg : isSel ? C.roseBg : C.card,
                color: C.ink, fontWeight: isToday || isWedding ? 800 : 500, fontSize: 14, ...sans,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
              <span>{isWedding ? "💍" : d}</span>
              <span style={{ display: "flex", gap: 3 }}>
                {ts.length > 0 && <i style={dot(ts.some(t => t.status !== "Готово") ? C.rose : C.sage)} />}
                {ms.length > 0 && <i style={dot(C.gold)} />}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 12, color: C.soft, margin: "10px 0 18px" }}>
        <span><i style={dot(C.rose)} /> дедлайн задачи</span>
        <span><i style={dot(C.sage)} /> сделано</span>
        <span><i style={dot(C.gold)} /> встреча</span>
      </div>

      {sel && (
        <div style={{ background: C.card, border: `1px solid ${C.edge}`, borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ ...serif, fontSize: 30, fontWeight: 700, margin: 0 }}>{fmtD(sel.date)}</h3>
            <button onClick={() => addMeeting(sel.date)} style={pill(C.gold, C.goldBg)}>＋ встреча в этот день</button>
          </div>
          {sel.meets.map(m => (
            <div key={m.id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 14 }}>
              <span style={{ color: C.gold, fontWeight: 800 }}>◆</span> {m.title}
              <button onClick={() => delMeeting(m.id)} style={xbtn}>✕</button>
            </div>
          ))}
          {sel.tasks.map(t => (
            <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 14,
              color: t.status === "Готово" ? C.faint : C.ink,
              textDecoration: t.status === "Готово" ? "line-through" : "none" }}>
              <span style={{ color: t.status === "Готово" ? C.sage : C.rose, fontWeight: 800 }}>●</span>
              {t.title}{t.owner && <span style={{ color: C.rose, fontSize: 12.5 }}>· {t.owner}</span>}
            </div>
          ))}
          {sel.meets.length === 0 && sel.tasks.length === 0 &&
            <div style={{ color: C.faint, fontSize: 13, fontStyle: "italic", marginTop: 8 }}>
              В этот день пока ничего — можно назначить встречу.
            </div>}
        </div>
      )}

      <h3 style={{ ...serif, fontSize: 30, fontWeight: 700, margin: "6px 0 8px" }}>Горит по срокам</h3>
      {upcoming.map(t => (
        <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14,
          background: C.card, border: `1px solid ${C.edge}`, borderRadius: 12, padding: "9px 13px", marginBottom: 7 }}>
          <span style={{ fontWeight: 800, minWidth: 46, color: t.date < todayISO() ? C.red : C.gold }}>{fmtD(t.date)}</span>
          <span style={{ flex: 1 }}>{t.title}</span>
          {t.owner && <span style={{ color: C.rose, fontSize: 12.5, fontWeight: 700 }}>{t.owner}</span>}
        </div>
      ))}
    </div>
  );
}

/* ───────────── стили-хелперы ───────────── */
const plural = (n) => { const r = n % 10, h = n % 100; if (h >= 11 && h <= 14) return "дней"; if (r === 1) return "день"; if (r >= 2 && r <= 4) return "дня"; return "дней"; };
const dot = (c) => ({ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: c });
const xbtn = { background: "none", border: "none", color: "#B5ACA5", cursor: "pointer", fontSize: 13, padding: "2px 5px" };
const inp = (w) => ({ fontFamily: "'Nunito',sans-serif", fontSize: 13, background: "#FDFBF8", color: "#3E3A39",
  border: "1px solid #EAE2D8", borderRadius: 9, padding: "8px 10px", minWidth: w });
const pill = (color, bg) => ({ fontFamily: "'Nunito',sans-serif", fontSize: 12.5, fontWeight: 800, cursor: "pointer",
  color, background: bg, border: `1.5px solid ${color}33`, borderRadius: 999, padding: "7px 14px" });
const navBtn = (off) => ({ fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700,
  cursor: off ? "default" : "pointer", opacity: off ? 0.35 : 1,
  color: "#8C8480", background: "#FFFFFF", border: "1.5px solid #EAE2D8", borderRadius: 999, padding: "7px 14px" });

const css = `
@import url('https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&family=Caveat:wght@500;700&family=Nunito:wght@400;700;800&display=swap');
* { box-sizing: border-box; }
body { margin: 0; background: #F9F4E9; }
button:hover:not(:disabled) { filter: brightness(0.96); }
input:focus { outline: 2px solid #C1702F55; outline-offset: 1px; }
@keyframes floaty { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
.float1 { animation: floaty 4.5s ease-in-out infinite; }
.float2 { animation: floaty 5.5s ease-in-out infinite 1.2s; }
@media (prefers-reduced-motion: reduce) { .float1, .float2 { animation: none; } }
`;
