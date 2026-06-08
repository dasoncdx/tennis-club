import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { authApi, studentApi, courseApi } from "./api";

interface User {
  id: number; name: string; phone: string; wechat_id: string;
  role: string; level: string; age: number; notes: string;
  created_at: string; total_purchased_hours: number; remaining_hours: number;
}
interface Package {
  id: number; student_id: number; total_hours: number;
  remaining_hours: number; price: number; purchased_at: string;
  notes: string; student_name: string;
}
interface Booking {
  id: number; student_id: number; coach_id: number;
  booking_date: string; start_time: string; end_time: string;
  status: string; court_info: string; notes: string; created_at: string;
  student_name: string; coach_name: string;
}
interface ClassRecord {
  id: number; booking_id: number; student_id: number;
  course_package_id: number; hours_consumed: number;
  notes: string; created_at: string; student_name: string; booking_date: string;
}
interface Dashboard {
  total_students: number; total_coaches: number;
  total_hours_remaining: number; monthly_bookings: number; dormant_students: number;
}

const statusLabel: Record<string, string> = { pending: "待确认", confirmed: "已确认", completed: "已完成", cancelled: "已取消" };
const statusTagClass: Record<string, string> = { pending: "tag-yellow", confirmed: "tag-green", completed: "tag-gray", cancelled: "tag-red" };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) authApi.me().then(u => setUser(u)).catch(() => localStorage.clear());
  }, []);

  const handleLogin = async (phone: string, pw: string) => {
    setError("");
    try {
      const res = await authApi.login(phone, pw);
      localStorage.setItem("token", res.access_token);
      const me = await authApi.me();
      setUser(me);
      setTab(me.role === "admin" ? "dashboard" : me.role === "coach" ? "students" : "mycourses");
    } catch (e: unknown) { setError((e as Error).message); }
  };
  const handleLogout = () => { localStorage.clear(); setUser(null); };

  if (!user) return <LoginScreen onLogin={handleLogin} error={error} />;

  const isAdmin = user.role === "admin";
  const isCoach = user.role === "coach";
  const isStudent = user.role === "student";
  const roleLabel = isAdmin ? "管理员" : isCoach ? "教练" : "学员";

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>网球俱乐部</h1>
          <p className="subtitle">{user.name} · {roleLabel}</p>
        </div>
        <button onClick={handleLogout} className="btn-logout">退出</button>
      </header>

      <div className="page-content">
        {isAdmin && tab === "dashboard" && <DashboardTab onNavigate={setTab} />}
        {isAdmin && tab === "students" && <StudentsTab />}
        {isAdmin && tab === "coaches" && <CoachManageTab />}
        {isAdmin && tab === "bookings" && <BookingsTab user={user} />}
        {isAdmin && tab === "dormant" && <DormantTab />}

        {isCoach && tab === "students" && <CoachStudentsTab user={user} />}
        {isCoach && tab === "bookings" && <CoachBookingsTab user={user} />}
        {isCoach && tab === "profile" && <CoachProfileTab user={user} />}

        {isStudent && tab === "mycourses" && <StudentCoursesTab user={user} />}
        {isStudent && tab === "book" && <StudentBookTab user={user} />}
        {isStudent && tab === "profile" && <StudentProfileTab user={user} />}
      </div>

      <div className="tab-bar">
        {isAdmin && (
          <>
            <TabBtn tab={tab} id="dashboard" set={setTab} icon="▤" label="概览" />
            <TabBtn tab={tab} id="students" set={setTab} icon="☰" label="学员" />
            <TabBtn tab={tab} id="coaches" set={setTab} icon="◎" label="教练" />
            <TabBtn tab={tab} id="bookings" set={setTab} icon="◷" label="约课" />
            <TabBtn tab={tab} id="dormant" set={setTab} icon="◉" label="提醒" />
          </>
        )}
        {isCoach && (
          <>
            <TabBtn tab={tab} id="students" set={setTab} icon="☰" label="学员" />
            <TabBtn tab={tab} id="bookings" set={setTab} icon="◷" label="约课" />
            <TabBtn tab={tab} id="profile" set={setTab} icon="◍" label="我的" />
          </>
        )}
        {isStudent && (
          <>
            <TabBtn tab={tab} id="mycourses" set={setTab} icon="◫" label="课时" />
            <TabBtn tab={tab} id="book" set={setTab} icon="◷" label="约课" />
            <TabBtn tab={tab} id="profile" set={setTab} icon="◍" label="我的" />
          </>
        )}
      </div>
    </div>
  );
}

function TabBtn({ tab, id, set, icon, label }: { tab: string; id: string; set: (v: string) => void; icon: string; label: string }) {
  const active = tab === id;
  return (
    <button className={`tab-item ${active ? "active" : ""}`} onClick={() => set(id)}>
      <span className="icon">{icon}</span>{label}
    </button>
  );
}

/* ══════════════════════════════════════════ Login ══════════════════════════════════════════ */
function LoginScreen({ onLogin, error }: { onLogin: (p: string, pw: string) => void; error: string }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regError, setRegError] = useState("");

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault(); setRegError("");
    try {
      const res = await authApi.register({ name: regName, phone: regPhone, password: regPw, role: "student" });
      localStorage.setItem("token", res.access_token);
      window.location.reload();
    } catch (e: unknown) { setRegError((e as Error).message); }
  };

  return (
    <div className="app-container flex flex-col items-center justify-center px-6" style={{ background: "linear-gradient(180deg, #F8F8F8 0%, #F0F0F0 100%)" }}>
      <div className="text-center mb-12">
        <div className="mx-auto mb-6 rounded-3xl flex items-center justify-center"
          style={{ width: 88, height: 88, background: "linear-gradient(135deg, #32D4A0, #0FA87A)", boxShadow: "0 12px 40px rgba(50, 212, 160, 0.35)" }}>
          <span style={{ fontSize: 42 }}>🎾</span>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.5px", color: "#1C1E1F" }}>网球俱乐部</h1>
        <p style={{ fontSize: 15, color: "#8E8E93", marginTop: 6 }}>专业网球培训管理</p>
      </div>

      {!showRegister ? (
        <div className="w-full" style={{ maxWidth: 320 }}>
          {error && (
            <div style={{ background: "#FFEEED", color: "#CC2F26", padding: "14px 16px", borderRadius: 14, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>{error}</div>
          )}
          <input className="input-field" style={{ marginBottom: 12 }} placeholder="手机号" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className="input-field" style={{ marginBottom: 20 }} type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn-primary w-full" style={{ marginBottom: 20 }} onClick={() => onLogin(phone, password)}>登录</button>
          <p style={{ textAlign: "center", fontSize: 14, color: "#8E8E93" }}>
            没有账号？<span style={{ color: "#32D4A0", fontWeight: 600, cursor: "pointer" }} onClick={() => setShowRegister(true)}>注册</span>
          </p>
        </div>
      ) : (
        <form className="w-full" style={{ maxWidth: 320 }} onSubmit={handleRegister}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: "#1C1E1F" }}>学员注册</h2>
          {regError && <div style={{ background: "#FFEEED", color: "#CC2F26", padding: "14px 16px", borderRadius: 14, marginBottom: 16, fontSize: 14 }}>{regError}</div>}
          <input className="input-field" style={{ marginBottom: 12 }} placeholder="姓名" value={regName} onChange={e => setRegName(e.target.value)} required />
          <input className="input-field" style={{ marginBottom: 12 }} placeholder="手机号" value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
          <input className="input-field" style={{ marginBottom: 20 }} type="password" placeholder="设置密码" value={regPw} onChange={e => setRegPw(e.target.value)} required />
          <button className="btn-primary w-full" style={{ marginBottom: 16 }} type="submit">注册</button>
          <p style={{ textAlign: "center", fontSize: 14, color: "#8E8E93" }}>
            已有账号？<span style={{ color: "#32D4A0", fontWeight: 600, cursor: "pointer" }} onClick={() => setShowRegister(false)}>返回登录</span>
          </p>
        </form>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════ Admin Dashboard ══════════════════════════════════════════ */
function DashboardTab({ onNavigate }: { onNavigate: (t: string) => void }) {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [showCoaches, setShowCoaches] = useState(false);
  useEffect(() => { studentApi.dashboard().then(setDash); }, []);
  if (!dash) return <div className="empty-state"><div className="empty-icon">⏳</div>加载中...</div>;

  const items = [
    { label: "在册学员", value: dash.total_students, icon: "👥", bg: "#FFFFFF", color: "#1C1E1F", action: () => onNavigate("students") },
    { label: "教练团队", value: dash.total_coaches, icon: "👨‍🏫", bg: "#FFFFFF", color: "#1C1E1F", action: () => setShowCoaches(true) },
    { label: "剩余课时", value: Math.round(dash.total_hours_remaining), icon: "📋", bg: "#1C1E1F", color: "#32D4A0" },
    { label: "本月约课", value: dash.monthly_bookings, icon: "📅", bg: "#FFFFFF", color: "#1C1E1F" },
    { label: "休眠学员", value: dash.dormant_students, icon: "🔔", bg: dash.dormant_students > 0 ? "#1C1E1F" : "#FFFFFF", color: dash.dormant_students > 0 ? "#FF9F0A" : "#1C1E1F", action: dash.dormant_students > 0 ? () => onNavigate("dormant") : undefined },
  ];

  return (
    <div>
      <h2 className="section-title">数据概览</h2>
      <p className="section-subtitle">俱乐部运营状况</p>

      {/* Key metric - dark card */}
      <div className="card-dark" style={{ marginBottom: 16 }}>
        <div className="card-value">{Math.round(dash.total_hours_remaining)}</div>
        <div className="card-label">剩余总课时</div>
        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
          <div><span style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>{dash.total_students}</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>在册学员</span></div>
          <div><span style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>{dash.monthly_bookings}</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>本月约课</span></div>
        </div>
      </div>

      {/* Secondary stats - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
        {items.filter(i => i.label !== "剩余课时" && i.label !== "本月约课" && i.label !== "在册学员").map(item => (
          <div key={item.label} className="stat-card" style={{ background: item.bg, color: item.color }}
            onClick={() => item.action?.()}>
            <div className="stat-icon">{item.icon}</div>
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      {dash.dormant_students > 0 && (
        <div className="alert-banner" style={{ background: "#FFF9F0", color: "#B36B00", border: "1px solid #FFE8C0" }} onClick={() => onNavigate("dormant")}>
          ⚠️ {dash.dormant_students} 名学员超过14天未约课，建议尽快跟进
        </div>
      )}

      {showCoaches && <CoachesModal onClose={() => setShowCoaches(false)} />}
    </div>
  );
}

function CoachesModal({ onClose }: { onClose: () => void }) {
  const [coaches, setCoaches] = useState<User[]>([]);
  useEffect(() => { studentApi.coaches().then(setCoaches); }, []);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F" }}>教练团队</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: "#F2F2F7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8E93", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
        {coaches.map(c => (
          <div key={c.id} className="list-item" style={{ cursor: "default" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: "#F2F2F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👨‍🏫</div>
              <div>
                <div style={{ fontWeight: 600, color: "#1C1E1F" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#8E8E93" }}>{c.phone}</div>
              </div>
            </div>
            <span className="tag tag-green">{c.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ Admin Students ══════════════════════════════════════════ */
function StudentsTab() {
  const [students, setStudents] = useState<User[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  const load = useCallback(() => { studentApi.list(keyword).then(setStudents); }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (s: User) => {
    if (swipedId !== null) { setSwipedId(null); return; }
    setSelected(s);
    const [pkgs, recs] = await Promise.all([courseApi.listPackages(s.id), courseApi.listRecords(s.id)]);
    setPackages(pkgs); setRecords(recs);
  };

  const onTouchStart = (id: number, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };
  const onTouchMove = (id: number, e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 30) setSwipedId(id);
    else if (diff < -30) setSwipedId(null);
  };
  const onTouchEnd = () => {
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff < 50) setSwipedId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await studentApi.delete(deleteTarget.id);
    setDeleteTarget(null); setSwipedId(null); load();
  };

  return (
    <div>
      <h2 className="section-title">学员管理</h2>
      <p className="section-subtitle">{students.length} 名在册学员</p>

      <div className="flex gap-2 mb-4">
        <input className="input-field flex-1" placeholder="搜索学员..." value={keyword} onChange={e => setKeyword(e.target.value)} />
        <button className="btn-primary flex-shrink-0" style={{ padding: "14px 18px", fontSize: 14 }} onClick={() => setShowAddStudent(true)}>＋ 添加</button>
      </div>

      {students.map(s => (
        <div key={s.id} style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 8 }}>
          <div
            style={{
              position: "absolute", right: 0, top: 0, bottom: 0,
              width: 80, background: "#FF453A", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 600, fontSize: 14,
              cursor: "pointer", borderRadius: "0 16px 16px 0",
            }}
            onClick={e => { e.stopPropagation(); setDeleteTarget(s); setSwipedId(null); }}
          >
            删除
          </div>
          <div className="list-item"
            onClick={() => openDetail(s)}
            onTouchStart={e => onTouchStart(s.id, e)}
            onTouchMove={e => onTouchMove(s.id, e)}
            onTouchEnd={onTouchEnd}
            style={{
              transform: swipedId === s.id ? "translateX(-80px)" : "translateX(0)",
              transition: "transform 0.2s ease",
              marginBottom: 0, borderRadius: swipedId === s.id ? "16px 0 0 16px" : 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: "#E8FAF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#32D4A0", fontWeight: 700 }}>
                {s.name[0]}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, color: "#1C1E1F" }}>{s.name}</span>
                  <span className="tag tag-green">{s.level || "未评级"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>
                  剩余 <span style={{ color: "#32D4A0", fontWeight: 600 }}>{Math.round(s.remaining_hours)}</span> 课时 · 共购 {Math.round(s.total_purchased_hours)}
                </div>
              </div>
            </div>
            <span className="chevron">›</span>
          </div>
        </div>
      ))}
      {students.length === 0 && <div className="empty-state"><div className="empty-icon">📋</div>暂无学员</div>}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
            <div className="modal-handle" />
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>确认删除</h3>
            <p style={{ fontSize: 14, color: "#8E8E93", marginBottom: 24 }}>
              确定要删除学员「{deleteTarget.name}」吗？<br />该操作将同时删除其课时包、约课记录，且不可恢复。
            </p>
            <div className="flex gap-3">
              <button className="btn-outline flex-1" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="btn-danger flex-1" onClick={handleDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {showAddStudent && <AddStudentModal onClose={() => setShowAddStudent(false)} onDone={() => { setShowAddStudent(false); load(); }} />}
      {selected && <StudentDetailModal student={selected} packages={packages} records={records} showAddPackage={showAddPackage}
        onAddPackage={() => setShowAddPackage(true)} onClosePackage={() => setShowAddPackage(false)}
        onDonePackage={() => { setShowAddPackage(false); courseApi.listPackages(selected.id).then(setPackages); load(); }}
        onClose={() => setSelected(null)}
        onStudentUpdated={load} />}
    </div>
  );
}

function StudentDetailModal({ student, packages, records, showAddPackage, onAddPackage, onClosePackage, onDonePackage, onClose, onStudentUpdated }
  : { student: User; packages: Package[]; records: ClassRecord[]; showAddPackage: boolean;
      onAddPackage: () => void; onClosePackage: () => void; onDonePackage: () => void; onClose: () => void; onStudentUpdated: () => void; }) {
  const r = (n: number) => Math.round(n);
  const [showEdit, setShowEdit] = useState(false);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F" }}>{student.name}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: "#F2F2F7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8E93", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        <div className="card-dark" style={{ marginBottom: 20 }}>
          <div className="card-value">{r(student.remaining_hours)}</div>
          <div className="card-label">剩余课时</div>
          <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
            <div><span style={{ fontSize: 18, fontWeight: 700, color: "#FFF" }}>{r(student.total_purchased_hours)}</span><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>共购</span></div>
            <div><span style={{ fontSize: 18, fontWeight: 700, color: "#FFF" }}>{r(r(student.total_purchased_hours) - r(student.remaining_hours))}</span><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>已消</span></div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#8E8E93", marginBottom: 16 }}>
          <span>{student.phone}</span>
          {student.wechat_id && <span> · 微信 {student.wechat_id}</span>}
          <span> · {student.level || "未评级"}</span>
          {student.age ? <span> · {student.age}岁</span> : null}
        </div>

        <div className="flex gap-3 mb-5">
          <button className="btn-primary flex-1" style={{ padding: "12px 0", fontSize: 14 }} onClick={onAddPackage}>购买课时</button>
          <button className="btn-outline flex-1" style={{ padding: "12px 0", fontSize: 14 }} onClick={() => setShowEdit(true)}>编辑资料</button>
        </div>

        <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 10 }}>课时包记录</h4>
        {packages.map(p => (
          <div key={p.id} className="card" style={{ background: "#F8F8F8", padding: 14 }}>
            <div className="flex justify-between items-center">
              <span style={{ fontWeight: 500 }}>{r(p.total_hours)} 课时</span>
              <span className={`tag ${p.remaining_hours > 0 ? "tag-green" : "tag-gray"}`}>剩余 {r(p.remaining_hours)}</span>
            </div>
            <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 4 }}>
              {new Date(p.purchased_at).toLocaleDateString("zh-CN")}{p.price > 0 ? ` · ¥${p.price}` : ""}
            </div>
          </div>
        ))}
        {packages.length === 0 && <p style={{ fontSize: 13, color: "#AEAEB2", padding: "12px 0" }}>暂无购课记录</p>}

        <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 10, marginTop: 20 }}>消课记录</h4>
        {records.map(rr => (
          <div key={rr.id} className="flex justify-between py-3 text-sm" style={{ borderBottom: "0.5px solid #F0F0F0" }}>
            <span style={{ color: "#636366" }}>{rr.booking_date || new Date(rr.created_at).toLocaleDateString("zh-CN")}</span>
            <span className="tag tag-gray">−{r(rr.hours_consumed)} 课时</span>
          </div>
        ))}
        {records.length === 0 && <p style={{ fontSize: 13, color: "#AEAEB2", padding: "12px 0" }}>暂无消课记录</p>}

        {showAddPackage && <AddPackageModal studentId={student.id} onClose={onClosePackage} onDone={onDonePackage} />}
        {showEdit && <StudentEditModal student={student} onClose={() => setShowEdit(false)} onDone={() => { setShowEdit(false); onStudentUpdated(); }} />}
      </div>
    </div>
  );
}

function AddStudentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("123456"); const [level, setLevel] = useState("");
  const [age, setAge] = useState(""); const [wechatId, setWechatId] = useState("");
  const [notes, setNotes] = useState(""); const [err, setErr] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    try { await authApi.register({ name, phone, password, role: "student", level, age: parseInt(age) || 0, wechat_id: wechatId, notes }); onDone(); }
    catch (e: unknown) { setErr((e as Error).message); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-handle" />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F", marginBottom: 20 }}>添加学员</h3>
        {err && <div style={{ background: "#FFEEED", color: "#CC2F26", padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>{err}</div>}
        <input className="input-field" style={{ marginBottom: 10 }} placeholder="姓名 *" value={name} onChange={e => setName(e.target.value)} required />
        <input className="input-field" style={{ marginBottom: 10 }} placeholder="手机号 *" value={phone} onChange={e => setPhone(e.target.value)} required />
        <input className="input-field" style={{ marginBottom: 10 }} placeholder="登录密码" value={password} onChange={e => setPassword(e.target.value)} />
        <input className="input-field" style={{ marginBottom: 10 }} placeholder="网球水平 (初级/中级/高级)" value={level} onChange={e => setLevel(e.target.value)} />
        <input className="input-field" style={{ marginBottom: 10 }} placeholder="年龄" type="number" value={age} onChange={e => setAge(e.target.value)} />
        <input className="input-field" style={{ marginBottom: 10 }} placeholder="微信号" value={wechatId} onChange={e => setWechatId(e.target.value)} />
        <textarea className="input-field" style={{ marginBottom: 20 }} placeholder="备注" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        <button className="btn-primary w-full" type="submit">确认添加</button>
      </form>
    </div>
  );
}

function AddPackageModal({ studentId, onClose, onDone }: { studentId: number; onClose: () => void; onDone: () => void }) {
  const [totalHours, setTotalHours] = useState(""); const [price, setPrice] = useState("");
  const [notes, setNotes] = useState(""); const [err, setErr] = useState("");
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    try { await courseApi.createPackage({ student_id: studentId, total_hours: parseFloat(totalHours), price: parseFloat(price) || 0, notes }); onDone(); }
    catch (e: unknown) { setErr((e as Error).message); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-handle" />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F", marginBottom: 20 }}>购买课时</h3>
        {err && <div style={{ background: "#FFEEED", color: "#CC2F26", padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>{err}</div>}
        <input className="input-field" style={{ marginBottom: 10 }} type="number" step="1" placeholder="课时数 *" value={totalHours} onChange={e => setTotalHours(e.target.value)} required />
        <input className="input-field" style={{ marginBottom: 10 }} type="number" placeholder="金额（元）" value={price} onChange={e => setPrice(e.target.value)} />
        <textarea className="input-field" style={{ marginBottom: 20 }} placeholder="备注" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        <button className="btn-primary w-full" type="submit">确认购买</button>
      </form>
    </div>
  );
}

/* ══════════════════════════════════════════ Dormant ══════════════════════════════════════════ */
function DormantTab() {
  const [students, setStudents] = useState<User[]>([]); const [days, setDays] = useState(14);
  useEffect(() => { studentApi.dormant(days).then(setStudents); }, [days]);
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="section-title" style={{ flex: 1 }}>休眠提醒</h2>
        <select className="input-field" style={{ width: "auto", padding: "10px 14px", fontSize: 13, borderRadius: 12 }}
          value={days} onChange={e => setDays(parseInt(e.target.value))}>
          <option value={7}>7天未约课</option><option value={14}>14天未约课</option><option value={30}>30天未约课</option>
        </select>
      </div>
      {students.map(s => (
        <div key={s.id} className="card" style={{ borderLeft: "3px solid #FF453A" }}>
          <div className="flex justify-between items-start">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "#1C1E1F" }}>{s.name}</span>
                <span style={{ fontSize: 12, color: "#8E8E93" }}>{s.phone}</span>
              </div>
              <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 4 }}>{s.notes || "无备注"}</div>
            </div>
            <span className="tag tag-red">需跟进</span>
          </div>
          <div style={{ fontSize: 14, marginTop: 10 }}>
            剩余课时 <span style={{ fontWeight: 700, color: "#32D4A0" }}>{Math.round(s.remaining_hours)}</span> 节
          </div>
        </div>
      ))}
      {students.length === 0 && <div className="empty-state"><div className="empty-icon">✨</div>所有学员近期都有约课</div>}
    </div>
  );
}

/* ══════════════════════════════════════════ Admin Bookings ══════════════════════════════════════════ */
function BookingsTab({ user }: { user: User }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showConsume, setShowConsume] = useState<Booking | null>(null);
  const isStaff = user.role !== "student";

  const load = useCallback(async () => {
    const b = await courseApi.listBookings(isStaff ? {} : { student_id: String(user.id) });
    setBookings(b);
  }, [isStaff, user.id]);
  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id: number, status: string) => { await courseApi.updateBooking(id, { status }); load(); };

  return (
    <div>
      <h2 className="section-title">约课记录</h2>
      <p className="section-subtitle">共 {bookings.length} 条记录</p>
      {bookings.map(b => (
        <div key={b.id} className="card">
          <div className="flex justify-between items-start">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "#1C1E1F" }}>{b.booking_date} {b.start_time} – {b.end_time}</div>
              <div style={{ fontSize: 14, color: "#8E8E93", marginTop: 4 }}>{b.student_name} · {b.coach_name}</div>
              {b.court_info && <div style={{ fontSize: 13, color: "#32D4A0", fontWeight: 500, marginTop: 6 }}>📍 {b.court_info}</div>}
              <div style={{ marginTop: 8 }}>
                <span className={`tag ${statusTagClass[b.status]}`}>{statusLabel[b.status]}</span>
              </div>
            </div>
            <div className="flex gap-2" style={{ marginLeft: 12 }}>
              {isStaff && b.status === "confirmed" && (
                <>
                  <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setShowConsume(b)}>消课</button>
                  <button className="btn-ghost" style={{ color: "#FF453A" }} onClick={() => handleStatus(b.id, "cancelled")}>取消</button>
                </>
              )}
              {user.role === "student" && b.status === "confirmed" && (
                <button className="btn-ghost" style={{ color: "#FF453A" }} onClick={() => handleStatus(b.id, "cancelled")}>取消</button>
              )}
            </div>
          </div>
        </div>
      ))}
      {bookings.length === 0 && <div className="empty-state"><div className="empty-icon">📅</div>暂无约课记录</div>}
      {showConsume && <ConsumeModal booking={showConsume} onClose={() => setShowConsume(null)} onDone={() => { setShowConsume(null); load(); }} />}
    </div>
  );
}

function ConsumeModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const [packages, setPackages] = useState<Package[]>([]); const [pkgId, setPkgId] = useState(0);
  const [hours, setHours] = useState("1"); const [err, setErr] = useState("");
  useEffect(() => { courseApi.listPackages(booking.student_id).then((pkgs: Package[]) => setPackages(pkgs.filter(p => p.remaining_hours > 0))); }, [booking.student_id]);
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    try { await courseApi.createRecord({ booking_id: booking.id, student_id: booking.student_id, course_package_id: pkgId || packages[0]?.id, hours_consumed: parseFloat(hours) }); onDone(); }
    catch (e: unknown) { setErr((e as Error).message); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-handle" />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F", marginBottom: 20 }}>消课确认</h3>
        <p style={{ fontSize: 14, color: "#8E8E93", marginBottom: 16 }}>{booking.student_name} · {booking.booking_date} {booking.start_time}–{booking.end_time}</p>
        {err && <div style={{ background: "#FFEEED", color: "#CC2F26", padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>{err}</div>}
        <label style={{ fontSize: 14, fontWeight: 500, color: "#636366", display: "block", marginBottom: 6 }}>选择课时包</label>
        <select className="input-field" style={{ marginBottom: 14 }} value={pkgId} onChange={e => setPkgId(parseInt(e.target.value))}>
          {packages.map(p => <option key={p.id} value={p.id}>{Math.round(p.total_hours)}课时包 (剩余{Math.round(p.remaining_hours)}节)</option>)}
        </select>
        <label style={{ fontSize: 14, fontWeight: 500, color: "#636366", display: "block", marginBottom: 6 }}>消耗课时数</label>
        <input className="input-field" style={{ marginBottom: 20 }} type="number" step="1" value={hours} onChange={e => setHours(e.target.value)} />
        <button className="btn-primary w-full" type="submit">确认消课</button>
      </form>
    </div>
  );
}

/* ══════════════════════════════════════════ Student ══════════════════════════════════════════ */
function StudentCoursesTab({ user }: { user: User }) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [me, setMe] = useState<User | null>(null);

  useEffect(() => {
    authApi.me().then(setMe);
    courseApi.listPackages(user.id).then(setPackages);
    courseApi.listRecords(user.id).then(setRecords);
  }, [user.id]);

  const r = (n: number) => Math.round(n);
  const consumed = r((me?.total_purchased_hours ?? 0) - (me?.remaining_hours ?? 0));
  const totalPurchased = r(me?.total_purchased_hours ?? 0);
  const progressPercent = totalPurchased ? Math.round((consumed / totalPurchased) * 100) : 0;

  return (
    <div>
      <h2 className="section-title">我的课时</h2>
      <p className="section-subtitle">课程进度与消课记录</p>

      {/* Hero stat card - dark */}
      <div className="card-dark" style={{ marginBottom: 20, textAlign: "center" }}>
        <div className="card-value" style={{ fontSize: 64 }}>{r(me?.remaining_hours ?? 0)}</div>
        <div className="card-label">剩余课时</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 18 }}>
          <div><div style={{ fontSize: 22, fontWeight: 700, color: "#FFF" }}>{consumed}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>已消课</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700, color: "#FFF" }}>{totalPurchased}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>共购买</div></div>
        </div>
        <div className="progress-bar" style={{ marginTop: 16 }}>
          <div className="fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>已消耗 {progressPercent}%</div>
      </div>

      <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 10 }}>购课记录</h4>
      {packages.map(p => (
        <div key={p.id} className="card" style={{ background: "#F8F8F8", padding: 14 }}>
          <div className="flex justify-between">
            <span style={{ fontWeight: 600, color: "#1C1E1F" }}>{r(p.total_hours)} 课时包</span>
            <span style={{ fontWeight: 600, color: p.remaining_hours > 0 ? "#32D4A0" : "#8E8E93" }}>剩余 {r(p.remaining_hours)}</span>
          </div>
          <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 4 }}>
            {new Date(p.purchased_at).toLocaleDateString("zh-CN")}{p.price > 0 ? ` · ¥${p.price}` : ""}
            {p.notes ? ` · ${p.notes}` : ""}
          </div>
        </div>
      ))}
      {packages.length === 0 && <p style={{ fontSize: 13, color: "#AEAEB2", padding: "12px 0", textAlign: "center" }}>暂无购课记录</p>}

      <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 10, marginTop: 20 }}>消课记录</h4>
      {records.map(rr => (
        <div key={rr.id} className="flex justify-between items-center py-3 text-sm" style={{ borderBottom: "0.5px solid #F0F0F0" }}>
          <span style={{ color: "#636366" }}>{rr.booking_date || new Date(rr.created_at).toLocaleDateString("zh-CN")}</span>
          <span className="tag tag-gray">消耗 {r(rr.hours_consumed)} 课时</span>
        </div>
      ))}
      {records.length === 0 && <p style={{ fontSize: 13, color: "#AEAEB2", padding: "12px 0", textAlign: "center" }}>暂无消课记录</p>}
    </div>
  );
}

function StudentBookTab({ user }: { user: User }) {
  const [coaches, setCoaches] = useState<User[]>([]);
  const [coachId, setCoachId] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [coachBookings, setCoachBookings] = useState<Booking[]>([]);

  useEffect(() => { studentApi.coaches().then(setCoaches); }, []);
  const loadBookings = useCallback(() => { courseApi.listBookings({ student_id: String(user.id) }).then(setBookings); }, [user.id]);
  useEffect(() => { loadBookings(); }, [loadBookings]);

  const cid = coachId || coaches[0]?.id;
  useEffect(() => {
    if (!cid) return;
    courseApi.listBookings({ coach_id: String(cid), date_from: date, date_to: date }).then((data: Booking[]) => {
      setCoachBookings(data.filter((b: Booking) => b.status !== "cancelled"));
    });
  }, [cid, date]);

  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const h = i + 8;
    return { start: `${h.toString().padStart(2, "0")}:00`, end: `${(h + 1).toString().padStart(2, "0")}:00` };
  });

  const [duration, setDuration] = useState(1);

  const isSlotOccupied = (slot: { start: string; end: string }) => {
    return coachBookings.some(b => b.start_time < slot.end && b.end_time > slot.start);
  };

  const handleSlotPick = (slot: { start: string; end: string }) => {
    if (isSlotOccupied(slot)) return;
    const h = parseInt(slot.start);
    if (duration === 2) {
      if (h >= 19) return;
      const nextEnd = `${(h + 2).toString().padStart(2, "0")}:00`;
      if (isSlotOccupied({ start: slot.end, end: nextEnd })) return;
      setStartTime(slot.start);
      setEndTime(nextEnd);
    } else {
      setStartTime(slot.start);
      setEndTime(slot.end);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    try {
      await courseApi.createBooking({ student_id: user.id, coach_id: cid, booking_date: date, start_time: startTime, end_time: endTime, notes });
      setMsg("预约已提交，等待教练确认");
      loadBookings();
    } catch (e: unknown) { setErr((e as Error).message); }
  };

  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), label: `${d.getMonth() + 1}/${d.getDate()}`, weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()] };
  });

  return (
    <div>
      <h2 className="section-title">预约约课</h2>
      <p className="section-subtitle">选择教练、日期和时间段</p>

      {/* Date selector */}
      <div style={{ marginBottom: 20 }}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {nextDays.map(d => (
            <button key={d.date} className={`date-chip ${date === d.date ? "active" : ""}`}
              onClick={() => setDate(d.date)}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{d.weekday}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{d.label}</div>
            </button>
          ))}
          <button className="date-chip" onClick={() => setShowDatePicker(!showDatePicker)}>
            <div style={{ fontSize: 20 }}>📅</div>
          </button>
        </div>
        {showDatePicker && <input className="input-field" style={{ marginTop: 10 }} type="date" value={date} onChange={e => setDate(e.target.value)} />}
      </div>

      {msg && <div style={{ background: "#E8FAF4", color: "#0FA87A", padding: "14px 16px", borderRadius: 14, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>{msg}</div>}
      {err && <div style={{ background: "#FFEEED", color: "#CC2F26", padding: "14px 16px", borderRadius: 14, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>{err}</div>}

      <form onSubmit={handleSubmit} className="card">
        <label style={{ fontSize: 14, fontWeight: 500, color: "#636366", display: "block", marginBottom: 6 }}>选择教练</label>
        <select className="input-field" style={{ marginBottom: 16 }} value={coachId} onChange={e => setCoachId(parseInt(e.target.value))}>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.name}（{c.level || "教练"}）</option>)}
        </select>

        {/* Duration toggle */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div className="segment">
            <button type="button" className={`segment-btn ${duration === 1 ? "active" : ""}`}
              onClick={() => { setDuration(1); setStartTime(""); setEndTime(""); }}>1小时</button>
            <button type="button" className={`segment-btn ${duration === 2 ? "active" : ""}`}
              onClick={() => { setDuration(2); setStartTime(""); setEndTime(""); }}>2小时</button>
          </div>
          <span style={{ fontSize: 13, color: "#8E8E93", marginLeft: "auto" }}>{startTime ? `${startTime} – ${endTime}` : "未选择"}</span>
        </div>

        {/* Time slot grid */}
        <label style={{ fontSize: 14, fontWeight: 500, color: "#636366", display: "block", marginBottom: 8 }}>
          {duration === 2 ? "选择开始时间（连续2小时）" : "选择时间段"}
          <span style={{ fontSize: 12, color: "#AEAEB2", marginLeft: 4, fontWeight: 400 }}>灰色=已约</span>
        </label>
        <div className="grid grid-cols-4 gap-2" style={{ marginBottom: 16 }}>
          {timeSlots.map(slot => {
            const occupied = isSlotOccupied(slot);
            const h = parseInt(slot.start);
            const nextSlot = h < 19 ? { start: slot.end, end: `${(h + 2).toString().padStart(2, "0")}:00` } : null;
            const twoHourOccupied = duration === 2 && (occupied || (nextSlot && isSlotOccupied(nextSlot)));
            const blocked = duration === 2 ? twoHourOccupied : occupied;
            const selected = duration === 1
              ? (startTime === slot.start && endTime === slot.end)
              : (startTime === slot.start);

            let cls = "slot-btn";
            if (blocked) cls += " occupied";
            else if (selected) cls += " selected";

            return (
              <button key={slot.start} type="button" className={cls}
                onClick={() => handleSlotPick(slot)} disabled={blocked}>
                {slot.start}
                {blocked && <div style={{ fontSize: 9, marginTop: 2 }}>{occupied ? "已约" : "—"}</div>}
                {!blocked && duration === 2 && h < 19 && <div style={{ fontSize: 9, marginTop: 2, opacity: 0.5 }}>2h</div>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3" style={{ marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: "#636366", display: "block", marginBottom: 6 }}>开始</label>
            <input className="input-field" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: "#636366", display: "block", marginBottom: 6 }}>结束</label>
            <input className="input-field" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <textarea className="input-field" style={{ marginBottom: 14 }} placeholder="备注（可选）" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        <button className="btn-primary w-full" type="submit">提交预约</button>
      </form>

      {/* My bookings */}
      <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginTop: 24, marginBottom: 10 }}>我的预约记录</h4>
      {bookings.map(b => (
        <div key={b.id} className="card">
          <div className="flex justify-between items-start">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "#1C1E1F" }}>{b.booking_date} {b.start_time} – {b.end_time}</div>
              <div style={{ fontSize: 14, color: "#8E8E93", marginTop: 4 }}>{b.coach_name}</div>
              {b.court_info && <div style={{ fontSize: 13, color: "#32D4A0", fontWeight: 500, marginTop: 6 }}>📍 {b.court_info}</div>}
              <div style={{ marginTop: 8 }}>
                <span className={`tag ${statusTagClass[b.status]}`}>{statusLabel[b.status]}</span>
              </div>
              {b.status === "pending" && <div style={{ fontSize: 12, color: "#B36B00", marginTop: 6, fontWeight: 500 }}>等待教练确认</div>}
            </div>
            {(b.status === "confirmed" || b.status === "pending") && (
              <button className="btn-ghost" style={{ color: "#FF453A", marginLeft: 12 }}
                onClick={async () => { await courseApi.updateBooking(b.id, { status: "cancelled" }); loadBookings(); }}>取消</button>
            )}
          </div>
        </div>
      ))}
      {bookings.length === 0 && <p style={{ fontSize: 13, color: "#AEAEB2", padding: "16px 0", textAlign: "center" }}>暂无预约记录</p>}
    </div>
  );
}

function StudentProfileTab({ user }: { user: User }) {
  return (
    <div>
      <h2 className="section-title">我的</h2>

      <div className="card" style={{ textAlign: "center", padding: "28px 20px", marginBottom: 16 }}>
        <div className="avatar-circle" style={{ background: "linear-gradient(135deg, #32D4A0, #0FA87A)" }}>
          <span>{user.name[0]}</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1C1E1F", marginTop: 14 }}>{user.name}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
          <span className="tag tag-green">{user.level || "未评级"}</span>
          <span className="tag tag-dark">网球学员</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 14 }}>个人信息</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="手机号" value={user.phone} />
          <Row label="微信" value={user.wechat_id || "未填写"} />
          <Row label="年龄" value={user.age ? String(user.age) : "未填写"} />
          <Row label="注册日期" value={new Date(user.created_at).toLocaleDateString("zh-CN")} />
        </div>
      </div>

      <div className="card">
        <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 14 }}>等级说明</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: "#E8FAF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🟢</div>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>初级 · 新星</div><div style={{ fontSize: 12, color: "#8E8E93" }}>基础动作学习</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: "#E8F2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔵</div>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>中级 · 进阶</div><div style={{ fontSize: 12, color: "#8E8E93" }}>对抗练习强化</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🟣</div>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>高级 · 精英</div><div style={{ fontSize: 12, color: "#8E8E93" }}>比赛战术训练</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between" style={{ fontSize: 15 }}>
      <span style={{ color: "#8E8E93" }}>{label}</span>
      <span style={{ color: "#1C1E1F", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════ Coach ══════════════════════════════════════════ */
function CoachStudentsTab({ user }: { user: User }) {
  const [students, setStudents] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [studentBookings, setStudentBookings] = useState<Booking[]>([]);

  useEffect(() => { studentApi.coachStudents().then(setStudents); }, []);

  const openDetail = async (s: User) => {
    setSelected(s);
    const [pkgs, recs, bks] = await Promise.all([
      courseApi.listPackages(s.id), courseApi.listRecords(s.id),
      courseApi.listBookings({ student_id: String(s.id) }),
    ]);
    setPackages(pkgs); setRecords(recs); setStudentBookings(bks);
  };

  return (
    <div>
      <h2 className="section-title">学员管理</h2>
      <p className="section-subtitle">{students.length} 名学员在籍</p>

      {students.map(s => (
        <div key={s.id} className="list-item" onClick={() => openDetail(s)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: "#E8FAF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#32D4A0", fontWeight: 700 }}>
              {s.name[0]}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#1C1E1F" }}>{s.name}</span>
                <span className="tag tag-green">{s.level || "未评级"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>
                剩余 <span style={{ color: "#32D4A0", fontWeight: 600 }}>{Math.round(s.remaining_hours)}</span> 课时 · 共购 {Math.round(s.total_purchased_hours)}
              </div>
            </div>
          </div>
          <span className="chevron">›</span>
        </div>
      ))}
      {students.length === 0 && <div className="empty-state"><div className="empty-icon">👥</div>暂无学员</div>}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F" }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ width: 32, height: 32, borderRadius: 16, background: "#F2F2F7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8E93", fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>

            <div className="card-dark" style={{ marginBottom: 20 }}>
              <div className="card-value">{Math.round(selected.remaining_hours)}</div>
              <div className="card-label">剩余课时</div>
              <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
                <div><span style={{ fontSize: 18, fontWeight: 700, color: "#FFF" }}>{Math.round(selected.total_purchased_hours)}</span><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>共购</span></div>
                <div><span style={{ fontSize: 18, fontWeight: 700, color: "#FFF" }}>{Math.round(selected.total_purchased_hours - selected.remaining_hours)}</span><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>已消</span></div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "#8E8E93", marginBottom: 16 }}>
              <span>{selected.phone}</span>
              {selected.wechat_id && <span> · 微信 {selected.wechat_id}</span>}
              <span> · {selected.level || "未评级"}</span>
              {selected.age ? <span> · {selected.age}岁</span> : null}
            </div>

            <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 10 }}>课时包</h4>
            {packages.map(p => (
              <div key={p.id} className="card" style={{ background: "#F8F8F8", padding: 14 }}>
                <div className="flex justify-between">
                  <span style={{ fontWeight: 500 }}>{Math.round(p.total_hours)} 课时</span>
                  <span style={{ fontWeight: 600, color: p.remaining_hours > 0 ? "#32D4A0" : "#8E8E93" }}>剩余 {Math.round(p.remaining_hours)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 4 }}>{new Date(p.purchased_at).toLocaleDateString("zh-CN")}{p.price > 0 ? ` · ¥${p.price}` : ""}</div>
              </div>
            ))}
            {packages.length === 0 && <p style={{ fontSize: 13, color: "#AEAEB2", padding: 8 }}>暂无课时包</p>}

            <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 10, marginTop: 20 }}>预约记录</h4>
            {studentBookings.map(b => (
              <div key={b.id} className="flex justify-between items-center py-3 text-sm" style={{ borderBottom: "0.5px solid #F0F0F0" }}>
                <span style={{ color: "#636366" }}>{b.booking_date} {b.start_time}–{b.end_time}</span>
                <span className={`tag ${statusTagClass[b.status]}`}>{statusLabel[b.status]}</span>
              </div>
            ))}
            {studentBookings.length === 0 && <p style={{ fontSize: 13, color: "#AEAEB2", padding: 8 }}>暂无预约记录</p>}

            <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 10, marginTop: 20 }}>消课记录</h4>
            {records.map(rr => (
              <div key={rr.id} className="flex justify-between py-3 text-sm" style={{ borderBottom: "0.5px solid #F0F0F0" }}>
                <span style={{ color: "#636366" }}>{rr.booking_date || new Date(rr.created_at).toLocaleDateString("zh-CN")}</span>
                <span className="tag tag-gray">−{Math.round(rr.hours_consumed)}</span>
              </div>
            ))}
            {records.length === 0 && <p style={{ fontSize: 13, color: "#AEAEB2", padding: 8 }}>暂无消课记录</p>}

            <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 10, marginTop: 20 }}>培训计划</h4>
            <textarea className="input-field" placeholder="为学员制定训练计划..." rows={3} defaultValue={selected.notes || ""} />
          </div>
        </div>
      )}
    </div>
  );
}

function CoachBookingsTab({ user }: { user: User }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [confirming, setConfirming] = useState<Booking | null>(null);
  const [courtInfo, setCourtInfo] = useState("");
  const [showConsume, setShowConsume] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    const b = await courseApi.listBookings({ coach_id: String(user.id) });
    setBookings(b);
  }, [user.id]);
  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirming) return;
    await courseApi.confirmBooking(confirming.id, courtInfo);
    setConfirming(null); setCourtInfo("");
    load();
  };

  const pending = bookings.filter(b => b.status === "pending");
  const active = bookings.filter(b => b.status === "confirmed");
  const past = bookings.filter(b => b.status === "completed" || b.status === "cancelled");

  return (
    <div>
      <h2 className="section-title">预约管理</h2>
      <p className="section-subtitle">
        {pending.length > 0 ? `${pending.length} 条待处理` : `${active.length} 条已确认`}
      </p>

      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: "#1C1E1F" }}>待确认</span>
            <span className="tag tag-red">{pending.length}</span>
          </div>
          {pending.map(b => (
            <div key={b.id} className="card" style={{ borderLeft: "3px solid #FF9F0A" }}>
              <div style={{ fontWeight: 600, color: "#1C1E1F" }}>{b.booking_date} {b.start_time} – {b.end_time}</div>
              <div style={{ fontSize: 14, color: "#8E8E93", marginTop: 4 }}>{b.student_name}</div>
              <div style={{ fontSize: 12, color: "#B36B00", fontWeight: 500, marginTop: 6 }}>等待确认</div>
              <div className="flex gap-2" style={{ marginTop: 14 }}>
                <button className="btn-primary flex-1" style={{ padding: "10px 0", fontSize: 13 }} onClick={() => setConfirming(b)}>确认并填场地</button>
                <button className="btn-ghost" style={{ color: "#FF453A" }}
                  onClick={async () => { await courseApi.updateBooking(b.id, { status: "cancelled" }); load(); }}>拒绝</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#1C1E1F", marginBottom: 10 }}>已确认 ({active.length})</div>
          {active.map(b => (
            <div key={b.id} className="card">
              <div className="flex justify-between items-start">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#1C1E1F" }}>{b.booking_date} {b.start_time} – {b.end_time}</div>
                  <div style={{ fontSize: 14, color: "#8E8E93", marginTop: 4 }}>{b.student_name}</div>
                  {b.court_info && <div style={{ fontSize: 13, color: "#32D4A0", fontWeight: 500, marginTop: 6 }}>📍 {b.court_info}</div>}
                </div>
                <div className="flex gap-2" style={{ marginLeft: 12 }}>
                  <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setShowConsume(b)}>消课</button>
                  <button className="btn-ghost" style={{ color: "#FF453A" }}
                    onClick={async () => { await courseApi.updateBooking(b.id, { status: "cancelled" }); load(); }}>取消</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#8E8E93", marginBottom: 10 }}>历史记录 ({past.length})</div>
          {past.slice(0, 10).map(b => (
            <div key={b.id} className="flex justify-between items-center py-3 text-sm" style={{ borderBottom: "0.5px solid #F0F0F0" }}>
              <span style={{ color: "#8E8E93" }}>{b.booking_date} {b.start_time}–{b.end_time}</span>
              <span style={{ fontSize: 12, color: "#AEAEB2" }}>{b.student_name} · {b.status === "completed" ? "已完成" : "已取消"}</span>
            </div>
          ))}
        </div>
      )}

      {bookings.length === 0 && <div className="empty-state"><div className="empty-icon">📅</div>暂无预约</div>}

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(null)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleConfirm}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F", marginBottom: 20 }}>确认预约</h3>
            <p style={{ fontSize: 14, color: "#8E8E93", marginBottom: 16 }}>{confirming.student_name} · {confirming.booking_date} {confirming.start_time}–{confirming.end_time}</p>
            <label style={{ fontSize: 14, fontWeight: 500, color: "#636366", display: "block", marginBottom: 6 }}>场地信息</label>
            <input className="input-field" style={{ marginBottom: 20 }} placeholder="如：A场 / 室内1号场" value={courtInfo} onChange={e => setCourtInfo(e.target.value)} required />
            <button className="btn-primary w-full" type="submit">确认预约</button>
          </form>
        </div>
      )}

      {showConsume && <ConsumeModal booking={showConsume} onClose={() => setShowConsume(null)} onDone={() => { setShowConsume(null); load(); }} />}
    </div>
  );
}

function CoachProfileTab({ user }: { user: User }) {
  return (
    <div>
      <h2 className="section-title">我的</h2>

      <div className="card" style={{ textAlign: "center", padding: "28px 20px", marginBottom: 16 }}>
        <div className="avatar-circle" style={{ background: "linear-gradient(135deg, #6366F1, #818CF8)" }}>
          <span>👨‍🏫</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1C1E1F", marginTop: 14 }}>{user.name}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
          <span className={`tag ${user.level === "高级" ? "tag-green" : user.level === "中级" ? "tag-yellow" : "tag-gray"}`}>{user.level || "教练"}</span>
          {user.level === "高级" && <span className="tag tag-yellow">资深教练</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 14 }}>基本信息</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="手机号" value={user.phone} />
          <Row label="微信" value={user.wechat_id || "未填写"} />
          <Row label="入职日期" value={new Date(user.created_at).toLocaleDateString("zh-CN")} />
        </div>
      </div>

      <div className="card">
        <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1F", marginBottom: 14 }}>资质与荣誉</h4>
        <textarea className="input-field" placeholder="填写教练资质、获奖经历、教学理念等..." rows={4} defaultValue={user.notes || ""} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ Student Edit Modal ══════════════════════════════════════════ */
function StudentEditModal({ student, onClose, onDone }: { student: User; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(student.phone);
  const [level, setLevel] = useState(student.level || "");
  const [age, setAge] = useState(student.age ? String(student.age) : "");
  const [wechatId, setWechatId] = useState(student.wechat_id || "");
  const [notes, setNotes] = useState(student.notes || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      await studentApi.update(student.id, {
        name, phone, level, age: parseInt(age) || 0,
        wechat_id: wechatId, notes,
      });
      onDone();
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-handle" />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F", marginBottom: 20 }}>编辑学员资料</h3>
        {err && <div style={{ background: "#FFEEED", color: "#CC2F26", padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>{err}</div>}
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>姓名</label>
        <input className="input-field" style={{ marginBottom: 12 }} value={name} onChange={e => setName(e.target.value)} required />
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>手机号</label>
        <input className="input-field" style={{ marginBottom: 12 }} value={phone} onChange={e => setPhone(e.target.value)} required />
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>网球水平</label>
        <select className="input-field" style={{ marginBottom: 12 }} value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">未评级</option>
          <option value="初级">初级</option>
          <option value="中级">中级</option>
          <option value="高级">高级</option>
        </select>
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>年龄</label>
        <input className="input-field" style={{ marginBottom: 12 }} type="number" value={age} onChange={e => setAge(e.target.value)} />
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>微信号</label>
        <input className="input-field" style={{ marginBottom: 12 }} value={wechatId} onChange={e => setWechatId(e.target.value)} />
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>备注</label>
        <textarea className="input-field" style={{ marginBottom: 20 }} value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        <div className="flex gap-3">
          <button className="btn-primary flex-1" type="submit" disabled={saving}>{saving ? "保存中..." : "保存"}</button>
          <button className="btn-outline flex-1" type="button" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

/* ══════════════════════════════════════════ Admin Coach Management ══════════════════════════════════════════ */
function CoachManageTab() {
  const [coaches, setCoaches] = useState<User[]>([]);
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  const load = useCallback(() => { studentApi.coaches().then(setCoaches); }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = coaches.filter(c =>
    !keyword || c.name.includes(keyword) || c.phone.includes(keyword)
  );

  const openEdit = (c: User) => {
    if (swipedId !== null) { setSwipedId(null); return; }
    setEditing(c);
  };

  const onTouchStart = (id: number, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };
  const onTouchMove = (id: number, e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 30) setSwipedId(id);
    else if (diff < -30) setSwipedId(null);
  };
  const onTouchEnd = () => {
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff < 50) setSwipedId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await studentApi.delete(deleteTarget.id);
    setDeleteTarget(null); setSwipedId(null); load();
  };

  return (
    <div>
      <h2 className="section-title">教练管理</h2>
      <p className="section-subtitle">{coaches.length} 名教练</p>

      <div className="flex gap-2 mb-4">
        <input className="input-field flex-1" placeholder="搜索教练..." value={keyword} onChange={e => setKeyword(e.target.value)} />
        <button className="btn-primary flex-shrink-0" style={{ padding: "14px 18px", fontSize: 14 }} onClick={() => setShowAdd(true)}>＋ 添加</button>
      </div>

      {filtered.map(c => (
        <div key={c.id} style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 8 }}>
          <div
            style={{
              position: "absolute", right: 0, top: 0, bottom: 0,
              width: 80, background: "#FF453A", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 600, fontSize: 14,
              cursor: "pointer", borderRadius: "0 16px 16px 0",
            }}
            onClick={e => { e.stopPropagation(); setDeleteTarget(c); setSwipedId(null); }}
          >
            删除
          </div>
          <div className="list-item"
            onClick={() => openEdit(c)}
            onTouchStart={e => onTouchStart(c.id, e)}
            onTouchMove={e => onTouchMove(c.id, e)}
            onTouchEnd={onTouchEnd}
            style={{
              transform: swipedId === c.id ? "translateX(-80px)" : "translateX(0)",
              transition: "transform 0.2s ease",
              marginBottom: 0, borderRadius: swipedId === c.id ? "16px 0 0 16px" : 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: "#E8F2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#0066CC", fontWeight: 700 }}>
                {c.name[0]}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, color: "#1C1E1F" }}>{c.name}</span>
                  <span className={`tag ${c.level === "高级" ? "tag-green" : c.level === "中级" ? "tag-yellow" : "tag-gray"}`}>{c.level || "未评级"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{c.phone}{c.wechat_id ? ` · ${c.wechat_id}` : ""}</div>
              </div>
            </div>
            <span className="chevron">›</span>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <div className="empty-state"><div className="empty-icon">👨‍🏫</div>暂无教练</div>}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
            <div className="modal-handle" />
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>确认删除</h3>
            <p style={{ fontSize: 14, color: "#8E8E93", marginBottom: 24 }}>
              确定要删除教练「{deleteTarget.name}」吗？<br />该操作将同时删除其约课记录，且不可恢复。
            </p>
            <div className="flex gap-3">
              <button className="btn-outline flex-1" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="btn-danger flex-1" onClick={handleDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && <CoachEditModal coach={null} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
      {editing && <CoachEditModal coach={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CoachEditModal({ coach, onClose, onDone }: { coach: User | null; onClose: () => void; onDone: () => void }) {
  const isNew = !coach;
  const [name, setName] = useState(coach?.name || "");
  const [phone, setPhone] = useState(coach?.phone || "");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState(coach?.level || "");
  const [wechatId, setWechatId] = useState(coach?.wechat_id || "");
  const [notes, setNotes] = useState(coach?.notes || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      if (isNew) {
        await authApi.register({ name, phone, password: password || "123456", role: "coach", level, wechat_id: wechatId, notes });
      } else {
        await studentApi.update(coach.id, { name, phone, level, wechat_id: wechatId, notes });
      }
      onDone();
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-handle" />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1C1E1F", marginBottom: 20 }}>
          {isNew ? "添加教练" : "编辑教练资料"}
        </h3>
        {err && <div style={{ background: "#FFEEED", color: "#CC2F26", padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>{err}</div>}
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>姓名</label>
        <input className="input-field" style={{ marginBottom: 12 }} value={name} onChange={e => setName(e.target.value)} required />
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>手机号</label>
        <input className="input-field" style={{ marginBottom: 12 }} value={phone} onChange={e => setPhone(e.target.value)} required />
        {isNew && (
          <>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>登录密码</label>
            <input className="input-field" style={{ marginBottom: 12 }} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="默认 123456" />
          </>
        )}
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>教练等级</label>
        <select className="input-field" style={{ marginBottom: 12 }} value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">未评级</option>
          <option value="初级">初级</option>
          <option value="中级">中级</option>
          <option value="高级">高级</option>
        </select>
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>微信号</label>
        <input className="input-field" style={{ marginBottom: 12 }} value={wechatId} onChange={e => setWechatId(e.target.value)} />
        <label style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", display: "block", marginBottom: 4 }}>备注/资质</label>
        <textarea className="input-field" style={{ marginBottom: 20 }} value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="教练资质、获奖经历、教学理念等..." />
        <div className="flex gap-3">
          <button className="btn-primary flex-1" type="submit" disabled={saving}>{saving ? "保存中..." : isNew ? "添加" : "保存"}</button>
          <button className="btn-outline flex-1" type="button" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}
