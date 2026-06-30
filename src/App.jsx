import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, CheckSquare, BarChart2, Upload, 
  LogOut, Plus, Search, FileText, User, Home, DownloadCloud,
  Trash2, Filter, Layers, ClipboardPaste, AlertCircle, ArrowUpDown, 
  Calendar, Clock, X, Settings, Camera, Cloud, CloudOff, RefreshCw,
  Moon, Sun, FolderOpen, Award, Save, ClipboardCheck, Bell, ExternalLink, Image as ImageIcon, Link2, Edit, Menu
} from 'lucide-react';

// --- Safe Storage Wrapper ---
const safeGetItem = (key) => { try { return localStorage.getItem(key); } catch (e) { return null; } };
const safeSetItem = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { console.warn("Local storage blocked."); } };

const defaultTeacherProfile = { name: 'แอดมินระบบ', password: 'admin', profileImg: '' };

const getValidImgUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400-h400`;
  return url;
};

const resizeImage = (file) => {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 150; canvas.height = 150;
        const ctx = canvas.getContext('2d');
        const xOffset = (img.width - size) / 2;
        const yOffset = (img.height - size) / 2;
        ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.5)); 
      };
    };
  });
};

// --- Custom Confirm Modal Component ---
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, theme }) {
  if (!isOpen) return null;
  const isDark = theme === 'dark';
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
      <div className={`rounded-3xl w-full max-w-sm p-6 shadow-2xl relative border text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h3 className="text-xl font-black mb-2">{title}</h3>
        <p className={`text-sm font-bold mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className={`flex-1 py-3 rounded-xl font-bold transition-all ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>ยกเลิก</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-md">ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => safeGetItem('kasem_theme') || 'light');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [exams, setExams] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(defaultTeacherProfile);
  
  const [dbUrl, setDbUrl] = useState(() => safeGetItem('kasem_db_url') || 'https://script.google.com/macros/s/AKfycbzv7jGXKr_vjad9MjVE5FqG6Jvv5FGfYzmokFbDuGCnRHCS6oFglG0bT1xNXNU_6rao/exec');
  const [syncStatus, setSyncStatus] = useState('idle'); 
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 4000); };

  useEffect(() => {
    safeSetItem('kasem_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingDB(true);
      if (dbUrl) {
        try {
          const res = await fetch(dbUrl);
          const rawData = await res.text();
          if (rawData.trim().startsWith('<')) throw new Error('ไม่ได้ตั้งค่าสิทธิ์ให้ "ทุกคน (Anyone)" เข้าถึงได้');
          if (rawData && rawData.trim() !== '{}') {
            const data = JSON.parse(rawData);
            if (data.error) throw new Error(data.error);
            setStudents(data.students || []); setSubjects(data.subjects || []);
            setEnrollments(data.enrollments || []); setAssignments(data.assignments || []);
            setSubmissions(data.submissions || []); setAttendance(data.attendance || []);
            setExams(data.exams || []); setBehaviors(data.behaviors || []); setMaterials(data.materials || []);
            setAnnouncements(data.announcements || []);
            setTeacherProfile(data.teacherProfile || defaultTeacherProfile);
          } else {
             setTeacherProfile(defaultTeacherProfile);
          }
        } catch (error) {
          showToast(`เชื่อมต่อ DB ล้มเหลว: ${error.message}`);
          loadLocalFallback();
        }
      } else {
        loadLocalFallback();
      }
      setIsLoadingDB(false);
    };

    const loadLocalFallback = () => {
      const localData = safeGetItem('kasem_local_data');
      if (localData) {
        try {
          const data = JSON.parse(localData);
          setStudents(data.students || []); setSubjects(data.subjects || []);
          setEnrollments(data.enrollments || []); setAssignments(data.assignments || []);
          setSubmissions(data.submissions || []); setAttendance(data.attendance || []);
          setExams(data.exams || []); setBehaviors(data.behaviors || []); setMaterials(data.materials || []);
          setAnnouncements(data.announcements || []);
          setTeacherProfile(data.teacherProfile || defaultTeacherProfile);
        } catch (e) { setTeacherProfile(defaultTeacherProfile); }
      } else { setTeacherProfile(defaultTeacherProfile); }
    };

    loadData();
  }, [dbUrl]);

  const saveState = async (updates) => {
    if (updates.students) setStudents(updates.students); 
    if (updates.subjects) setSubjects(updates.subjects);
    if (updates.enrollments) setEnrollments(updates.enrollments); 
    if (updates.assignments) setAssignments(updates.assignments);
    if (updates.submissions) setSubmissions(updates.submissions); 
    if (updates.attendance) setAttendance(updates.attendance);
    if (updates.exams) setExams(updates.exams); 
    if (updates.behaviors) setBehaviors(updates.behaviors);
    if (updates.materials) setMaterials(updates.materials); 
    if (updates.announcements) setAnnouncements(updates.announcements);
    if (updates.teacherProfile) setTeacherProfile(updates.teacherProfile);

    // Ensure GAS doesn't drop columns by strictly formatting the payload
    const finalSubjects = (updates.subjects || subjects).map(s => ({
        id: s.id || '', code: s.code || '', name: s.name || '', semester: s.semester || '1', year: s.year || '',
        midtermMax: s.midtermMax !== undefined && s.midtermMax !== null ? s.midtermMax : 20,
        finalMax: s.finalMax !== undefined && s.finalMax !== null ? s.finalMax : 30
    }));

    const payload = {
      students: updates.students || students, subjects: finalSubjects, enrollments: updates.enrollments || enrollments, 
      assignments: updates.assignments || assignments, submissions: updates.submissions || submissions, 
      attendance: updates.attendance || attendance, exams: updates.exams || exams, behaviors: updates.behaviors || behaviors,
      materials: updates.materials || materials, announcements: updates.announcements || announcements, teacherProfile: updates.teacherProfile || teacherProfile
    };

    safeSetItem('kasem_local_data', JSON.stringify(payload));

    if (dbUrl) {
      setSyncStatus('syncing');
      try {
        await fetch(dbUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'sync', data: JSON.stringify(payload) }) });
        setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (e) { setSyncStatus('error'); }
    }
  };

  const getUniqueRooms = () => [...new Set(students.map(s => String(s.room || '').trim()))].filter(Boolean).sort();
  const getUniqueSections = (roomId) => [...new Set(students.filter(s => String(s.room || '').trim() === String(roomId).trim()).map(s => String(s.section || '').trim()))].filter(Boolean).sort();


  const handleLoginSuccess = (userObj) => {
    if (userObj.role === 'student') {
      const now = new Date().toLocaleString('th-TH');
      const updatedStudent = { ...userObj.data, lastLogin: now };
      const newStudents = students.map(s => String(s.id) === String(updatedStudent.id) ? updatedStudent : s);
      setStudents(newStudents);
      saveState({ students: newStudents });
      setCurrentUser({ role: 'student', data: updatedStudent });
    } else {
      setCurrentUser(userObj);
    }
  };

  if (isLoadingDB) return <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'} flex flex-col items-center justify-center`}><RefreshCw className="animate-spin text-blue-500 mb-4" size={40}/><h2 className="text-xl font-bold">กำลังโหลดฐานข้อมูล...</h2></div>;
  if (!currentUser) return <LoginView onLogin={handleLoginSuccess} students={students} teacherProfile={teacherProfile} theme={theme} showToast={showToast} />;

  let liveUser = currentUser;
  if (currentUser.role === 'student') {
     const st = students.find(s => s.id === currentUser.data.id);
     if (st) liveUser = { ...currentUser, data: st };
  } else { liveUser = { ...currentUser, data: teacherProfile }; }

  let mySubjects = subjects; let myAssignments = assignments;
  if (liveUser.role === 'student') {
    const mySubjectIds = enrollments.filter(e => e.studentId === liveUser.data.id).map(e => e.subjectId);
    mySubjects = subjects.filter(s => mySubjectIds.includes(s.id));
    myAssignments = assignments.filter(a => mySubjectIds.includes(a.subjectId));
  }

  const commonProps = {
    students, setStudents: (data) => saveState({students: data}),
    subjects: liveUser.role === 'teacher' ? subjects : mySubjects, setSubjects: (data) => saveState({subjects: data}),
    enrollments, setEnrollments: (data) => saveState({enrollments: data}),
    assignments: liveUser.role === 'teacher' ? assignments : myAssignments, setAssignments: (data) => saveState({assignments: data}),
    submissions, setSubmissions: (data) => saveState({submissions: data}),
    attendance, setAttendance: (data) => saveState({attendance: data}),
    exams, setExams: (data) => saveState({exams: data}),
    behaviors, setBehaviors: (data) => saveState({behaviors: data}),
    materials, setMaterials: (data) => saveState({materials: data}),
    announcements, setAnnouncements: (data) => saveState({announcements: data}),
    teacherProfile, setTeacherProfile: (data) => saveState({teacherProfile: data}),
    dbUrl, setDbUrl: (url) => { setDbUrl(url); safeSetItem('kasem_db_url', url); },
    getUniqueRooms, getUniqueSections, showToast, setActiveTab, theme, setTheme, saveState 
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300 ${theme === 'dark' ? 'dark bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[200] bg-blue-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center animate-in slide-in-from-right-4 font-bold">
          <AlertCircle className="mr-3 shrink-0" /> <span className="leading-tight">{toastMessage}</span>
        </div>
      )}
      
      <Sidebar 
        currentUser={liveUser} 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); }} 
        onLogout={() => {
           setCurrentUser(null);
           safeSetItem('kasem_creds', null);
        }} 
        theme={theme} 
        isOpen={isMobileMenuOpen} 
        setIsOpen={setIsMobileMenuOpen} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        <TopNav currentUser={liveUser} syncStatus={syncStatus} dbUrl={dbUrl} theme={theme} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 custom-scrollbar ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
          {liveUser.role === 'teacher' ? <TeacherView activeTab={activeTab} {...commonProps} /> : <StudentView activeTab={activeTab} student={liveUser.data} {...commonProps} />}
        </main>
      </div>
    </div>
  );
}

function LoginView({ onLogin, students, teacherProfile, theme, showToast }) {
  const [role, setRole] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const isDark = theme === 'dark';

  useEffect(() => {
    const savedCreds = safeGetItem('kasem_creds');
    if (savedCreds) {
      try {
        const creds = JSON.parse(savedCreds);
        if (creds.role) setRole(creds.role);
        if (creds.id) setStudentId(creds.id);
        if (creds.password) setPassword(creds.password);
        setRememberMe(true);
      } catch (e) {
        safeSetItem('kasem_creds', null);
      }
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    if (role === 'teacher') {
      const adminPwd = teacherProfile.password ? String(teacherProfile.password) : 'admin';
      
      if (password === adminPwd) {
        if (rememberMe) safeSetItem('kasem_creds', JSON.stringify({ role: 'teacher', password }));
        else safeSetItem('kasem_creds', null);
        onLogin({ role: 'teacher', data: teacherProfile });
      } else {
        setLoginError('รหัสผ่านแอดมิน/ครูผู้สอนไม่ถูกต้อง');
      }
    } else {
      const student = students.find(s => String(s.id).trim() === studentId.trim());
      const stuPwd = student?.password ? String(student.password) : '12345678';
      
      if (student && password === stuPwd) {
        if (rememberMe) safeSetItem('kasem_creds', JSON.stringify({ role: 'student', id: studentId, password }));
        else safeSetItem('kasem_creds', null);
        onLogin({ role: 'student', data: student });
      } else {
        setLoginError('รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง');
      }
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <div className={`max-w-md w-full rounded-3xl p-8 shadow-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className="text-center mb-8">
          <img src="https://img1.pic.in.th/images/ChatGPT-Image-26-..-2569-13_15_38.png" alt="Logo" className="h-36 md:h-40 mx-auto mb-4 object-contain drop-shadow-md" />
          <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-blue-900'}`}>Kasem One</h1>
          <p className="text-blue-500 font-bold text-sm mt-1">Platform for Teaching & Learning</p>
        </div>

        {loginError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl font-bold flex items-center animate-in fade-in zoom-in-95">
            <AlertCircle size={18} className="mr-2 shrink-0"/> {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className={`flex rounded-xl p-1.5 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
            <button type="button" onClick={() => {setRole('student'); setLoginError('');}} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${role === 'student' ? (isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}>นักเรียน</button>
            <button type="button" onClick={() => {setRole('teacher'); setLoginError('');}} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${role === 'teacher' ? (isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}>แอดมิน / ครู</button>
          </div>
          
          {role === 'student' ? (
            <div className="space-y-4">
              <div><label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>รหัสประจำตัวนักเรียน</label><input required type="text" value={studentId} onChange={e=>{setStudentId(e.target.value); setLoginError('');}} className={`w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} placeholder="เช่น 1001"/></div>
              <div><label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>รหัสผ่าน</label><input required type="password" value={password} onChange={e=>{setPassword(e.target.value); setLoginError('');}} className={`w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} placeholder="รหัสผ่านเริ่มต้น (เช่น 12345678)"/></div>
            </div>
          ) : (
            <div><label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>รหัสผ่านแอดมิน</label><input required type="password" value={password} onChange={e=>{setPassword(e.target.value); setLoginError('');}} className={`w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} placeholder="รหัสผ่าน (admin)"/></div>
          )}

          <div className="flex items-center mt-2">
            <label className="flex items-center cursor-pointer text-sm font-bold text-slate-500 select-none">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mr-2" />
              จดจำรหัสผ่านไว้ในเครื่องนี้
            </label>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">เข้าสู่ระบบ</button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wide">
           พัฒนาโดย นายเกษม พิมพ์เงิน ครูโรงเรียนสระบุรีวิทยาคม
        </div>
      </div>
    </div>
  );
}

function Sidebar({ currentUser, activeTab, setActiveTab, onLogout, theme, isOpen, setIsOpen }) {
  const isDark = theme === 'dark';
  const teacherNav = [
    { id: 'dashboard', icon: <Home size={18} />, label: 'ภาพรวมระบบ' },
    { id: 'announcements', icon: <Bell size={18} />, label: 'ประกาศข่าวสาร' },
    { id: 'subjects', icon: <Layers size={18} />, label: 'จัดการวิชาเรียน' },
    { id: 'students', icon: <Users size={18} />, label: 'จัดการนักเรียน' },
    { id: 'attendance', icon: <Calendar size={18} />, label: 'เช็กชื่อเข้าเรียน' },
    { id: 'attendance-summary', icon: <ClipboardCheck size={18} />, label: 'สรุปการเข้าเรียน' },
    { id: 'behavior', icon: <Award size={18} />, label: 'บันทึกพฤติกรรม' },
    { id: 'materials', icon: <FolderOpen size={18} />, label: 'คลังสื่อ / ใบงาน' },
    { id: 'assignments', icon: <BookOpen size={18} />, label: 'สร้างงานเก็บคะแนน' },
    { id: 'grading', icon: <CheckSquare size={18} />, label: 'ตรวจงาน (คะแนนเก็บ)' },
    { id: 'exams', icon: <FileText size={18} />, label: 'กรอกคะแนนสอบ' },
    { id: 'summary', icon: <BarChart2 size={18} />, label: 'สรุปผลคะแนน' },
    { id: 'profile', icon: <Settings size={18} />, label: 'ตั้งค่าระบบ & DB' },
  ];

  const studentNav = [
    { id: 'dashboard', icon: <Home size={18} />, label: 'แดชบอร์ดของฉัน' },
    { id: 'announcements', icon: <Bell size={18} />, label: 'ประกาศข่าวสาร' },
    { id: 'materials', icon: <FolderOpen size={18} />, label: 'คลังเอกสารใบงาน' },
    { id: 'assignments', icon: <FileText size={18} />, label: 'ส่งงาน' },
    { id: 'scores', icon: <BarChart2 size={18} />, label: 'สรุปคะแนน' },
    { id: 'attendance', icon: <Calendar size={18} />, label: 'สถิติการเข้าเรียน' },
    { id: 'profile', icon: <User size={18} />, label: 'ตั้งค่าโปรไฟล์' },
  ];

  const navs = currentUser.role === 'teacher' ? teacherNav : studentNav;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsOpen(false)}></div>
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0 shadow-2xl md:shadow-none transform transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-slate-800 border-r border-slate-700' : 'bg-white border-r border-slate-200'}`}>
        <button onClick={() => setIsOpen(false)} className="md:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
          <X size={20}/>
        </button>
        <div className={`py-6 flex flex-col items-center justify-center shrink-0 border-b ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-blue-50/50'}`}>
          <div className="flex flex-col items-center text-center">
            <img src="https://img1.pic.in.th/images/ChatGPT-Image-26-..-2569-13_15_38.png" alt="Logo" className="h-20 mb-3 object-contain drop-shadow-sm" />
            <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-blue-900'}`}>Kasem One</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-1 px-3">เมนูหลัก</div>
          {navs.map(nav => (
            <button key={nav.id} onClick={() => setActiveTab(nav.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === nav.id ? (isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100') : (isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50')}`}>
              {nav.icon}<span className="ml-3">{nav.label}</span>
            </button>
          ))}
        </nav>
        <div className={`p-4 shrink-0 border-t flex flex-col gap-3 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <button onClick={onLogout} className={`flex items-center w-full px-4 py-2 rounded-xl font-bold transition-colors ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}>
            <LogOut size={18} className="mr-3" /> ออกจากระบบ
          </button>
          <div className={`text-center text-[9px] font-bold leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            พัฒนาโดย นายเกษม พิมพ์เงิน<br/>ครูโรงเรียนสระบุรีวิทยาคม
          </div>
        </div>
      </div>
    </>
  );
}

function TopNav({ currentUser, syncStatus, dbUrl, theme, setIsMobileMenuOpen }) {
  const isDark = theme === 'dark';
  return (
    <header className={`h-16 md:h-20 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0 z-10 border-b ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
      <div className="flex items-center gap-3 md:gap-4">
        <button onClick={() => setIsMobileMenuOpen(true)} className={`md:hidden p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
          <Menu size={20} />
        </button>
        <div className={`text-lg md:text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{currentUser.role === 'teacher' ? 'ระบบผู้สอน (Admin)' : 'พื้นที่เรียนรู้'}</div>
        {currentUser.role === 'teacher' && (
           <div className={`hidden lg:flex items-center text-[10px] font-bold px-3 py-1.5 rounded-full border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
             {!dbUrl && <><CloudOff size={12} className="mr-1.5 text-slate-400"/><span className="text-slate-500">ออฟไลน์</span></>}
             {dbUrl && syncStatus === 'idle' && <><Cloud size={12} className="mr-1.5 text-emerald-500"/><span className="text-emerald-500">เชื่อมต่อแล้ว (Synced)</span></>}
             {dbUrl && syncStatus === 'syncing' && <><RefreshCw size={12} className="mr-1.5 text-blue-500 animate-spin"/><span className="text-blue-500">กำลังซิงค์...</span></>}
           </div>
        )}
      </div>
      <div className={`flex items-center rounded-full pr-4 pl-1.5 py-1.5 border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0 mr-3 border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
          {currentUser.data.profileImg ? <img src={getValidImgUrl(currentUser.data.profileImg)} className="w-full h-full object-cover rounded-full"/> : <User size={16} className="text-slate-400" />}
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-black leading-tight hidden sm:block ${isDark ? 'text-white' : 'text-slate-800'}`}>{currentUser.data.name}</span>
          <span className={`text-sm font-black leading-tight sm:hidden ${isDark ? 'text-white' : 'text-slate-800'}`}>โปรไฟล์</span>
          <span className="text-[10px] font-bold text-blue-500">{currentUser.role === 'teacher' ? 'แอดมิน' : `นักเรียน ห้อง ${currentUser.data.room}`}</span>
        </div>
      </div>
    </header>
  );
}

function TeacherView(props) {
  switch(props.activeTab) {
    case 'dashboard': return <TeacherDashboard {...props} />;
    case 'announcements': return <TeacherAnnouncements {...props} />;
    case 'subjects': return <TeacherSubjects {...props} />;
    case 'students': return <TeacherStudents {...props} />;
    case 'attendance': return <TeacherAttendance {...props} />;
    case 'attendance-summary': return <TeacherAttendanceSummary {...props} />;
    case 'behavior': return <TeacherBehavior {...props} />;
    case 'materials': return <TeacherMaterials {...props} />;
    case 'assignments': return <TeacherAssignments {...props} />;
    case 'grading': return <TeacherGrading {...props} />;
    case 'exams': return <TeacherExams {...props} />;
    case 'summary': return <TeacherSummary {...props} />;
    case 'profile': return <TeacherProfile {...props} />;
    default: return <TeacherDashboard {...props} />;
  }
}

function TeacherDashboard({ students, subjects, assignments, submissions, attendance, behaviors, enrollments, exams, theme }) {
  const isDark = theme === 'dark';
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.filter(a => a.date === today);
  const presentToday = todayAtt.filter(a => a.status === 'present').length;
  const totalBehaviors = behaviors.reduce((sum, b) => sum + b.points, 0);

  // คำนวณนักเรียน Top 3 ของแต่ละวิชา
  const topStudentsBySubject = subjects.map(sub => {
     const enrolledIds = enrollments.filter(e => e.subjectId === sub.id).map(e => String(e.studentId).trim());
     const enrolledSts = students.filter(s => enrolledIds.includes(String(s.id).trim()));
     const targetAsgs = assignments.filter(a => a.subjectId === sub.id);

     const studentScores = enrolledSts.map(stu => {
         let asgTotal = 0;
         targetAsgs.forEach(asg => {
             const subM = submissions.find(s => s.assignmentId === asg.id && String(s.studentId).trim() === String(stu.id).trim());
             if (subM && subM.status === 'graded') {
                 asgTotal += subM.score;
             }
         });
         const examRec = exams.find(e => e.subjectId === sub.id && String(e.studentId).trim() === String(stu.id).trim()) || {};
         const mid = examRec.midterm || 0;
         const fin = examRec.final || 0;
         const grandTotal = asgTotal + mid + fin;
         return { ...stu, grandTotal };
     });

     // เรียงลำดับจากมากไปน้อย และดึงแค่ 3 อันดับแรก
     const top3 = studentScores.sort((a, b) => b.grandTotal - a.grandTotal).slice(0, 3);
     return { subject: sub, top3 };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in">
      <h2 className="text-2xl font-black mb-6 border-l-4 border-blue-600 pl-4">ภาพรวมระบบ</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard title="นักเรียนทั้งหมด" value={students.length} icon={<Users size={24} className="text-blue-500" />} bg={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'} theme={theme} />
        <StatCard title="วิชาที่สอน" value={subjects.length} icon={<Layers size={24} className="text-emerald-500" />} bg={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'} theme={theme} />
        <StatCard title="งานทั้งหมด" value={assignments.length} icon={<BookOpen size={24} className="text-indigo-500" />} bg={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-indigo-100'} theme={theme} />
        <StatCard title="งานรอตรวจ" value={submissions.filter(s => s.status === 'submitted').length} icon={<CheckSquare size={24} className="text-amber-500" />} bg={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'} theme={theme} />
        <StatCard title="มาเรียนวันนี้ (คน/ทั้งหมด)" value={todayAtt.length > 0 ? `${presentToday}/${todayAtt.length}` : '-'} icon={<Calendar size={24} className="text-pink-500" />} bg={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-pink-100'} theme={theme} />
        <StatCard title="คะแนนพฤติกรรมสะสม" value={totalBehaviors > 0 ? `+${totalBehaviors}` : totalBehaviors} icon={<Award size={24} className="text-violet-500" />} bg={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-violet-100'} theme={theme} />
      </div>

      <h2 className="text-xl font-black mt-10 mb-4 border-l-4 border-emerald-500 pl-4">Top 3 นักเรียนคะแนนรวมสูงสุด (แยกตามวิชา)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {topStudentsBySubject.map(({ subject, top3 }) => (
           <div key={subject.id} className={`p-6 rounded-3xl shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
             <h3 className="font-black text-lg mb-4 text-blue-600 dark:text-blue-400 flex items-center justify-between">
               <span className="truncate pr-2">{subject.name}</span>
               <span className="text-xs font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 px-2 py-1 rounded-md shrink-0">{subject.code}</span>
             </h3>
             {top3.length > 0 ? (
               <div className="space-y-3">
                 {top3.map((stu, index) => (
                   <div key={stu.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                     <div className="flex items-center gap-3 overflow-hidden">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${index === 0 ? 'bg-amber-100 text-amber-600 border-2 border-amber-400' : index === 1 ? 'bg-slate-200 text-slate-500 border-2 border-slate-300' : 'bg-orange-100 text-orange-600 border-2 border-orange-300'}`}>
                         {index + 1}
                       </div>
                       <div className="flex flex-col min-w-0">
                         <span className="font-bold text-sm truncate">{stu.name}</span>
                         <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ห้อง {stu.room} | เลขที่ {stu.number}</span>
                       </div>
                     </div>
                     <div className="font-black text-emerald-500 ml-2 shrink-0">{stu.grandTotal} <span className="text-[10px] text-slate-400 font-bold">คะแนน</span></div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className={`text-center py-8 text-sm font-bold border-2 border-dashed rounded-2xl ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                 ยังไม่มีข้อมูลคะแนน
               </div>
             )}
           </div>
        ))}
        {topStudentsBySubject.length === 0 && (
           <div className={`col-span-full text-center py-8 font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีวิชาเรียนในระบบ</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bg, theme }) {
  return (
    <div className={`p-6 rounded-3xl border shadow-sm flex items-center justify-between ${bg}`}>
      <div><p className={`text-sm font-bold mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p><h3 className="text-3xl font-black">{value}</h3></div>
      <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>{icon}</div>
    </div>
  );
}

function TeacherAnnouncements({ announcements, setAnnouncements, subjects, getUniqueRooms, dbUrl, showToast, theme }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', linkUrl: '', targetSubject: 'all', targetRoom: 'all' });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); 
  const isDark = theme === 'dark';

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return showToast('กรุณากรอกหัวข้อและเนื้อหาประกาศให้ครบถ้วน');
    
    let uploadedImageUrl = '';
    if (imageFile) {
      if (!dbUrl) return showToast('กรุณาตั้งค่า Database URL เพื่ออัปโหลดรูปภาพ');
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        await new Promise((resolve) => {
          reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            const payload = { action: 'uploadMaterial', filename: `ann_${Date.now()}_${imageFile.name}`, mimeType: imageFile.type, fileData: base64 };
            const res = await fetch(dbUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.url) uploadedImageUrl = data.url;
            resolve();
          };
        });
      } catch (error) { showToast('อัปโหลดรูปล้มเหลว ประกาศจะถูกสร้างโดยไม่มีรูป'); } finally { setIsUploading(false); }
    }

    const newAnn = { ...form, id: `ann${Date.now()}`, date: new Date().toLocaleString('th-TH'), imageUrl: uploadedImageUrl };
    setAnnouncements([newAnn, ...announcements]);
    setShowForm(false); showToast('สร้างประกาศสำเร็จ');
    setForm({ title: '', content: '', linkUrl: '', targetSubject: 'all', targetRoom: 'all' });
    setImageFile(null);
  };

  const executeDelete = () => { setAnnouncements(announcements.filter(a => a.id !== confirmDel)); setConfirmDel(null); showToast('ลบประกาศเรียบร้อยแล้ว'); };

  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ConfirmModal isOpen={!!confirmDel} title="ยืนยันการลบประกาศ" message="คุณต้องการลบประกาศข่าวสารนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้" onConfirm={executeDelete} onCancel={() => setConfirmDel(null)} theme={theme} />
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black flex items-center border-l-4 border-blue-600 pl-3"><Bell className="mr-2 text-blue-500"/> จัดการประกาศข่าวสาร</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors"><Plus size={16} className="inline mr-2"/> สร้างประกาศ</button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className={`p-6 md:p-8 rounded-3xl shadow-sm space-y-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div><label className="block text-sm font-bold mb-2">หัวข้อประกาศ *</label><input required type="text" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className={inputClass} placeholder="เช่น ปิดปรับปรุงระบบ / กิจกรรมวันสำคัญ..." /></div>
          <div><label className="block text-sm font-bold mb-2">เนื้อหาประกาศ *</label><textarea required rows="4" value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className={inputClass} placeholder="รายละเอียดที่ต้องการแจ้งให้นักเรียนทราบ..." /></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-dashed border-slate-300 dark:border-slate-600">
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center"><Layers size={16} className="mr-2 text-blue-500"/> แสดงเฉพาะวิชา</label>
              <select value={form.targetSubject} onChange={e=>setForm({...form, targetSubject: e.target.value})} className={inputClass}><option value="all">ทุกวิชา (เห็นทุกคน)</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center"><Users size={16} className="mr-2 text-emerald-500"/> แสดงเฉพาะห้องเรียน</label>
              <select value={form.targetRoom} onChange={e=>setForm({...form, targetRoom: e.target.value})} className={inputClass}><option value="all">ทุกห้อง (เห็นทุกคน)</option>{getUniqueRooms().map(r => <option key={r} value={r}>ห้อง {r}</option>)}</select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-dashed border-slate-300 dark:border-slate-600">
            <div><label className="block text-sm font-bold mb-2 flex items-center"><ExternalLink size={16} className="mr-2 text-indigo-500"/> แนบลิงก์เพิ่มเติม (ถ้ามี)</label><input type="text" value={form.linkUrl} onChange={e=>setForm({...form, linkUrl: e.target.value})} className={inputClass} placeholder="เช่น https://www.google.com" /></div>
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center"><ImageIcon size={16} className="mr-2 text-pink-500"/> แนบรูปภาพประกอบ (ถ้ามี)</label>
              <div className={`border-2 border-dashed rounded-xl p-3 text-center relative cursor-pointer transition-colors ${isDark ? 'border-slate-600 bg-slate-900/50 hover:border-pink-500' : 'border-slate-300 bg-slate-50 hover:border-pink-500'}`}>
                 <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                 <span className={`text-sm font-bold ${imageFile ? 'text-pink-500' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{imageFile ? imageFile.name : 'คลิกเพื่อเลือกไฟล์รูปภาพ'}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4"><button type="submit" disabled={isUploading} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md flex items-center disabled:opacity-50">{isUploading ? <><RefreshCw size={18} className="mr-2 animate-spin"/> กำลังอัปโหลด...</> : 'บันทึกและประกาศ'}</button></div>
        </form>
      )}

      <div className="space-y-5">
        {announcements.map(ann => {
          const targetedSubjectName = ann.targetSubject !== 'all' ? subjects.find(s => s.id === ann.targetSubject)?.name : 'ทุกวิชา';
          return (
            <div key={ann.id} className={`p-6 rounded-3xl shadow-sm relative group border flex flex-col md:flex-row gap-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <button onClick={() => setConfirmDel(ann.id)} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
              {ann.imageUrl && (
                <div className="w-full md:w-64 h-40 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm"><img src={getValidImgUrl(ann.imageUrl)} alt="Announcement" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/></div>
              )}
              <div className="flex-1 flex flex-col">
                <div className="flex flex-wrap gap-2 mb-3">
                   <div className={`text-xs font-bold flex items-center px-2 py-1 rounded-md ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-500'}`}><Clock size={12} className="mr-1.5"/> {ann.date}</div>
                   {(ann.targetSubject !== 'all' || ann.targetRoom !== 'all') && (
                     <div className="text-xs font-bold text-white bg-amber-500 px-3 py-1 rounded-md shadow-sm">เฉพาะ: {ann.targetSubject !== 'all' ? targetedSubjectName : 'ทุกวิชา'} {ann.targetRoom !== 'all' ? `(ห้อง ${ann.targetRoom})` : ''}</div>
                   )}
                </div>
                <h3 className="text-2xl font-black mb-3 pr-8 text-blue-600 dark:text-blue-400">{ann.title}</h3>
                <p className={`whitespace-pre-wrap font-medium mb-5 flex-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{ann.content}</p>
                {ann.linkUrl && (
                  <div className="mt-auto pt-4"><a href={ann.linkUrl.startsWith('http') ? ann.linkUrl : `https://${ann.linkUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-colors shadow-sm"><ExternalLink size={14} className="mr-2"/> เปิดลิงก์แนบ</a></div>
                )}
              </div>
            </div>
          );
        })}
        {announcements.length === 0 && <div className={`text-center py-16 rounded-3xl border border-dashed font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>ยังไม่มีการสร้างประกาศข่าวสาร</div>}
      </div>
    </div>
  );
}

function TeacherSubjects({ subjects, setSubjects, showToast, theme }) {
  const [showForm, setShowForm] = useState(false);
  const [newSub, setNewSub] = useState({ code: '', name: '', semester: '1', year: new Date().getFullYear() + 543 + '', midtermMax: 20, finalMax: 30 });
  const [editSub, setEditSub] = useState(null); 
  const [confirmDel, setConfirmDel] = useState(null); 
  const isDark = theme === 'dark';

  const handleSaveCreate = (e) => {
    e.preventDefault();
    setSubjects([...subjects, { ...newSub, id: `sub${Date.now()}` }]);
    setShowForm(false); showToast('สร้างวิชาใหม่สำเร็จ');
    setNewSub({ code: '', name: '', semester: '1', year: new Date().getFullYear() + 543 + '', midtermMax: 20, finalMax: 30 });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setSubjects(subjects.map(s => s.id === editSub.id ? editSub : s));
    setEditSub(null); showToast('บันทึกการแก้ไขรายวิชาสำเร็จ');
  };

  const executeDelete = () => { setSubjects(subjects.filter(s => s.id !== confirmDel)); setConfirmDel(null); showToast('ลบวิชาเรียบร้อยแล้ว'); };

  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 border font-bold ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <ConfirmModal isOpen={!!confirmDel} title="ยืนยันการลบวิชาเรียน" message="คุณต้องการลบรายวิชานี้ใช่หรือไม่? ข้อมูลการลงทะเบียนเรียนและคะแนนที่ผูกกับวิชานี้อาจได้รับผลกระทบ" onConfirm={executeDelete} onCancel={() => setConfirmDel(null)} theme={theme} />
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black flex items-center border-l-4 border-blue-600 pl-3"><Layers className="mr-2 text-blue-500"/> จัดการวิชาเรียน</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md"><Plus size={16} className="inline mr-2"/> สร้างวิชา</button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveCreate} className={`p-6 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div><label className="block text-sm font-bold mb-2">รหัสวิชา</label><input required type="text" value={newSub.code} onChange={e=>setNewSub({...newSub, code: e.target.value})} className={inputClass} placeholder="เช่น ว21101" /></div>
          <div><label className="block text-sm font-bold mb-2">ชื่อวิชา</label><input required type="text" value={newSub.name} onChange={e=>setNewSub({...newSub, name: e.target.value})} className={inputClass} /></div>
          <div><label className="block text-sm font-bold mb-2">ภาคเรียน</label><select value={newSub.semester} onChange={e=>setNewSub({...newSub, semester: e.target.value})} className={inputClass}><option value="1">1</option><option value="2">2</option></select></div>
          <div><label className="block text-sm font-bold mb-2">ปีการศึกษา</label><input required type="text" value={newSub.year} onChange={e=>setNewSub({...newSub, year: e.target.value})} className={inputClass} /></div>
          <div className={`md:col-span-2 p-5 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h4 className="font-bold text-blue-500 mb-4 flex items-center"><Settings size={16} className="mr-2" /> ตั้งค่าคะแนนเต็มสำหรับการสอบ</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-bold mb-2">คะแนนเต็ม กลางภาค</label><input required type="number" min="0" value={newSub.midtermMax} onChange={e=>setNewSub({...newSub, midtermMax: parseInt(e.target.value) || 0})} className={inputClass} /></div>
              <div><label className="block text-sm font-bold mb-2">คะแนนเต็ม ปลายภาค</label><input required type="number" min="0" value={newSub.finalMax} onChange={e=>setNewSub({...newSub, finalMax: parseInt(e.target.value) || 0})} className={inputClass} /></div>
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end mt-2"><button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold">บันทึกวิชา</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map(sub => (
          <div key={sub.id} className={`p-6 rounded-2xl shadow-sm relative group border flex flex-col justify-between transition-all ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
            <div>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => setEditSub(sub)} className={`p-1.5 rounded-lg transition-colors text-amber-500 ${isDark ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'bg-amber-50 hover:bg-amber-100'}`} title="แก้ไขข้อมูลวิชา"><Edit size={16}/></button>
                 <button onClick={() => setConfirmDel(sub.id)} className={`p-1.5 rounded-lg transition-colors text-red-500 ${isDark ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-red-50 hover:bg-red-100'}`} title="ลบวิชา"><Trash2 size={16}/></button>
              </div>
              <div className="text-blue-500 font-bold font-mono text-xs bg-blue-500/10 px-3 py-1.5 rounded-lg inline-block">{sub.code}</div>
              <h3 className="text-xl font-black mt-4">{sub.name}</h3>
              <div className={`text-sm font-bold mt-4 p-2.5 rounded-xl flex items-center ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}><Calendar size={14} className="mr-2"/> เทอม {sub.semester}/{sub.year}</div>
            </div>
            <div className={`text-xs font-bold mt-4 pt-4 border-t flex flex-col gap-1.5 ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
              <div className="flex justify-between"><span>กลางภาค</span><span className="text-amber-500">เต็ม {sub.midtermMax ?? 20}</span></div>
              <div className="flex justify-between"><span>ปลายภาค</span><span className="text-emerald-500">เต็ม {sub.finalMax ?? 30}</span></div>
            </div>
          </div>
        ))}
      </div>

      {editSub && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className={`rounded-3xl w-full max-w-xl p-8 shadow-2xl relative border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setEditSub(null)} className={`absolute top-5 right-5 p-2 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:text-white bg-slate-900' : 'text-slate-500 hover:text-slate-900 bg-slate-100'}`}><X size={20}/></button>
            <h3 className="text-xl font-black mb-6 flex items-center"><Edit className="mr-2 text-amber-500"/> แก้ไขรายวิชา</h3>
            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-bold mb-2">รหัสวิชา</label><input required type="text" value={editSub.code || ''} onChange={e=>setEditSub({...editSub, code: e.target.value})} className={inputClass} /></div>
              <div><label className="block text-sm font-bold mb-2">ชื่อวิชา</label><input required type="text" value={editSub.name || ''} onChange={e=>setEditSub({...editSub, name: e.target.value})} className={inputClass} /></div>
              <div><label className="block text-sm font-bold mb-2">ภาคเรียน</label><select value={editSub.semester || '1'} onChange={e=>setEditSub({...editSub, semester: e.target.value})} className={inputClass}><option value="1">1</option><option value="2">2</option></select></div>
              <div><label className="block text-sm font-bold mb-2">ปีการศึกษา</label><input required type="text" value={editSub.year || ''} onChange={e=>setEditSub({...editSub, year: e.target.value})} className={inputClass} /></div>
              <div className={`md:col-span-2 p-5 rounded-2xl mt-2 border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="font-bold text-amber-500 mb-4 flex items-center"><Settings size={16} className="mr-2" /> แก้ไขคะแนนเต็มสำหรับการสอบ</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-2">คะแนนเต็ม กลางภาค</label><input required type="number" min="0" value={editSub.midtermMax ?? 20} onChange={e=>setEditSub({...editSub, midtermMax: parseInt(e.target.value) || 0})} className={inputClass} /></div>
                  <div><label className="block text-sm font-bold mb-2">คะแนนเต็ม ปลายภาค</label><input required type="number" min="0" value={editSub.finalMax ?? 30} onChange={e=>setEditSub({...editSub, finalMax: parseInt(e.target.value) || 0})} className={inputClass} /></div>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end mt-4"><button type="submit" className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md w-full md:w-auto">บันทึกการแก้ไข</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherStudents({ subjects, students, setStudents, enrollments, setEnrollments, assignments, submissions, behaviors, saveState, showToast, theme, getUniqueRooms, getUniqueSections }) {
  const [filterSub, setFilterSub] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  
  const [showImport, setShowImport] = useState(false);
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [showBatchEnroll, setShowBatchEnroll] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [importSub, setImportSub] = useState(subjects[0]?.id || '');
  
  const [singleStu, setSingleStu] = useState({ id: '', name: '', number: '', section: '', room: '', subjectId: '' });
  const [editForm, setEditForm] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); 
  const [viewingStudent, setViewingStudent] = useState(null);

  const [batchSub, setBatchSub] = useState(subjects[0]?.id || '');
  const [batchRoom, setBatchRoom] = useState('');

  const isDark = theme === 'dark';
  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`;

  const enrolledStudentIds = filterSub === 'all' ? students.map(s => String(s.id).trim()) : enrollments.filter(e => e.subjectId === filterSub).map(e => String(e.studentId).trim());
  const dynamicRooms = getUniqueRooms();
  const dynamicSections = getUniqueSections(filterRoom);

  const targetStudents = students
      .filter(s => enrolledStudentIds.includes(String(s.id).trim()))
      .filter(s => filterRoom === 'all' || String(s.room || '').trim() === String(filterRoom).trim())
      .filter(s => filterSection === 'all' || String(s.section || '').trim() === String(filterSection).trim());

  const handleExportExcel = () => {
    let csv = '\uFEFF'; 
    csv += 'รหัสประจำตัว,ชื่อ-สกุล,เลขที่,ห้อง,ตอน,เบอร์นักเรียน,เบอร์ผู้ปกครอง,ความสัมพันธ์\n';
    
    targetStudents.forEach(stu => {
       csv += `="${stu.id}","${stu.name}",${stu.number},="${stu.room}","${stu.section || ''}","${stu.studentPhone || ''}","${stu.parentPhone || ''}","${stu.parentRelation || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Student_Data_${filterRoom !== 'all' ? 'Room_'+filterRoom : 'All'}.csv`; link.click();
    showToast('ดาวน์โหลดไฟล์ข้อมูลนักเรียนเรียบร้อยแล้ว');
  };

  const handleBulkImport = () => {
    if (!importSub) return showToast('เลือกวิชาก่อนนำเข้า');
    const lines = pasteData.trim().split('\n'); const newSts = []; const newEnrolls = [];
    lines.forEach(line => {
      const parts = line.split('\t'); if(parts.length < 2) return;
      const id = parts[0]?.trim(), name = parts[1]?.trim(), number = parts[2]?.trim() || '', section = parts[3]?.trim() || '-', room = parts[4]?.trim() || '';
      if(!id || !name) return;
      if(!students.find(s => String(s.id).trim() === String(id)) && !newSts.find(s => String(s.id).trim() === String(id))) newSts.push({ id, password: '12345678', name, number, section, room, profileImg: '' });
      if(!enrollments.find(e => String(e.studentId).trim() === String(id) && e.subjectId === importSub) && !newEnrolls.find(e => String(e.studentId).trim() === String(id) && e.subjectId === importSub)) 
        newEnrolls.push({ id: `e${Date.now()}_${id}`, studentId: id, subjectId: importSub });
    });
    if(newSts.length > 0 || newEnrolls.length > 0) {
      saveState({ students: [...students, ...newSts], enrollments: [...enrollments, ...newEnrolls] });
      showToast(`สำเร็จ: ใหม่ ${newSts.length} คน / ลงทะเบียน ${newEnrolls.length} รายการ`); 
      setShowImport(false); setPasteData('');
    } else showToast('ไม่มีข้อมูลใหม่');
  };

  const handleAddSingle = (e) => {
    e.preventDefault();
    if (!singleStu.id || !singleStu.name) return showToast('กรุณากรอกรหัสและชื่อ');
    const exists = students.find(s => String(s.id).trim() === String(singleStu.id).trim());
    
    let newStudents = students;
    if (!exists) {
        newStudents = [...students, { id: singleStu.id.trim(), password: '12345678', name: singleStu.name, number: singleStu.number, section: singleStu.section || '-', room: singleStu.room.trim(), profileImg: '' }];
    }

    let newEnrollments = enrollments;
    if (singleStu.subjectId) {
       const isEnrolled = enrollments.find(en => String(en.studentId).trim() === String(singleStu.id).trim() && en.subjectId === singleStu.subjectId);
       if (!isEnrolled) {
           newEnrollments = [...enrollments, { id: `e${Date.now()}_${singleStu.id}`, studentId: singleStu.id.trim(), subjectId: singleStu.subjectId }];
       }
    }
    
    saveState({ students: newStudents, enrollments: newEnrollments });
    showToast('เพิ่มนักเรียนสำเร็จ'); 
    setSingleStu({ id: '', name: '', number: '', section: '', room: '', subjectId: singleStu.subjectId }); 
    setShowAddSingle(false);
  };

  const handleBatchEnrollSubmit = () => {
    if (!batchSub || !batchRoom) return showToast('กรุณาเลือกวิชาและห้องที่ต้องการลงทะเบียน');
    const studentsInRoom = students.filter(s => String(s.room).trim() === String(batchRoom).trim());
    if (studentsInRoom.length === 0) return showToast('ไม่พบรายชื่อนักเรียนในห้องที่เลือก');
    
    const newEnrolls = [];
    studentsInRoom.forEach(s => {
       const exists = enrollments.find(e => String(e.studentId).trim() === String(s.id).trim() && e.subjectId === batchSub);
       if (!exists) newEnrolls.push({ id: `e${Date.now()}_${s.id}_${batchSub}`, studentId: s.id, subjectId: batchSub });
    });
    
    if (newEnrolls.length > 0) {
       saveState({ enrollments: [...enrollments, ...newEnrolls] }); 
       showToast(`ลงทะเบียนวิชานี้ให้นักเรียนห้อง ${batchRoom} จำนวน ${newEnrolls.length} คนสำเร็จ`); 
       setShowBatchEnroll(false);
    } else { showToast('นักเรียนทุกคนในห้องนี้ลงทะเบียนวิชานี้ครบอยู่แล้ว'); }
  };

  const executeDelete = () => {
     saveState({
         students: students.filter(x => x.id !== confirmDel),
         enrollments: enrollments.filter(x => x.studentId !== confirmDel)
     });
     setConfirmDel(null); 
     showToast('ลบนักเรียนออกจากระบบสำเร็จ');
  };

  const openEdit = (e, s) => {
    e.stopPropagation();
    const enrolledSubIds = enrollments.filter(e => String(e.studentId).trim() === String(s.id).trim()).map(e => e.subjectId);
    setEditForm({ ...s, enrolledSubjectIds: enrolledSubIds });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const updatedStudents = students.map(s => String(s.id).trim() === String(editForm.id).trim() ? { ...s, name: editForm.name, room: editForm.room, number: editForm.number, section: editForm.section } : s);
    
    let newEnrollments = enrollments.filter(e => String(e.studentId).trim() !== String(editForm.id).trim());
    const newEnrollsToAdd = editForm.enrolledSubjectIds.map(subId => ({ id: `e${Date.now()}_${editForm.id}_${subId}`, studentId: editForm.id, subjectId: subId }));
    newEnrollments = [...newEnrollments, ...newEnrollsToAdd];

    saveState({ students: updatedStudents, enrollments: newEnrollments });
    setEditForm(null); 
    showToast('อัปเดตข้อมูลและรายวิชาสำเร็จ');
  };

  const toggleSubject = (subId) => {
     if(editForm.enrolledSubjectIds.includes(subId)) setEditForm({...editForm, enrolledSubjectIds: editForm.enrolledSubjectIds.filter(id => id !== subId)});
     else setEditForm({...editForm, enrolledSubjectIds: [...editForm.enrolledSubjectIds, subId]});
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ConfirmModal isOpen={!!confirmDel} title="ยืนยันการลบนักเรียน" message="คุณต้องการลบนักเรียนคนนี้ใช่หรือไม่? ข้อมูลการเรียน คะแนน และการเข้าเรียนจะถูกลบทั้งหมด" onConfirm={executeDelete} onCancel={() => setConfirmDel(null)} theme={theme} />

      <div className={`rounded-3xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <h2 className="text-lg font-black flex items-center shrink-0"><Users className="mr-2 text-blue-500" size={20} /> ทะเบียนนักเรียน</h2>
          <div className="flex gap-2 flex-wrap w-full lg:w-auto">
            <select value={filterSub} onChange={e => {setFilterSub(e.target.value); setFilterRoom('all'); setFilterSection('all');}} className={`font-bold rounded-xl p-2.5 outline-none border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}><option value="all">ทุกวิชา</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select value={filterRoom} onChange={e => {setFilterRoom(e.target.value); setFilterSection('all');}} className={`font-bold rounded-xl p-2.5 outline-none border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}><option value="all">ทุกห้อง</option>{dynamicRooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}</select>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={`font-bold rounded-xl p-2.5 outline-none border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} disabled={filterRoom === 'all'}><option value="all">ทุกตอน</option>{dynamicSections.map(s => <option key={s} value={s}>ตอน {s}</option>)}</select>
            
            <button onClick={handleExportExcel} className={`px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all`} title="ส่งออก Excel เบอร์โทร"><DownloadCloud size={16} className="inline md:mr-1" /><span className="hidden md:inline"> ส่งออก Excel</span></button>
            <button onClick={() => {setShowBatchEnroll(!showBatchEnroll); setShowAddSingle(false); setShowImport(false);}} className={`px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all`}><Layers size={16} className="inline md:mr-1"/><span className="hidden md:inline"> ลงทะเบียนทั้งห้อง</span></button>
            <button onClick={() => {setShowAddSingle(!showAddSingle); setShowBatchEnroll(false); setShowImport(false);}} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"><User size={16} className="inline md:mr-1" /><span className="hidden md:inline"> เพิ่มทีละคน</span></button>
            <button onClick={() => {setShowImport(!showImport); setShowAddSingle(false); setShowBatchEnroll(false);}} className={`px-4 py-2.5 rounded-xl font-bold border ${isDark ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}><ClipboardPaste size={16} className="inline md:mr-1" /><span className="hidden md:inline"> นำเข้า Excel</span></button>
          </div>
        </div>

        {showBatchEnroll && (
          <div className={`p-6 border-b bg-indigo-50/50 dark:bg-indigo-900/10`}>
             <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center"><Layers size={18} className="mr-2"/> ผูกรายชื่อนักเรียนทั้งห้องเข้ากับวิชา</h4>
             <div className="flex flex-col sm:flex-row gap-4 mb-4">
               <select value={batchSub} onChange={e => setBatchSub(e.target.value)} className={inputClass}><option value="" disabled>เลือกวิชา...</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
               <select value={batchRoom} onChange={e => setBatchRoom(e.target.value)} className={inputClass}><option value="" disabled>เลือกห้องเรียน...</option>{dynamicRooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}</select>
             </div>
             <div className="text-right"><button onClick={handleBatchEnrollSubmit} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700">บันทึกลงทะเบียน</button></div>
          </div>
        )}

        {showAddSingle && (
          <form onSubmit={handleAddSingle} className={`p-6 border-b grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
             <div className="md:col-span-3 font-bold text-blue-500 mb-2">เพิ่มนักเรียนใหม่ (ทีละคน)</div>
             <div><label className="block text-xs font-bold mb-1">รหัสประจำตัว *</label><input required value={singleStu.id || ''} onChange={e=>setSingleStu({...singleStu, id: e.target.value})} className={inputClass} placeholder="รหัส" /></div>
             <div><label className="block text-xs font-bold mb-1">ชื่อ-นามสกุล *</label><input required value={singleStu.name || ''} onChange={e=>setSingleStu({...singleStu, name: e.target.value})} className={inputClass} placeholder="ชื่อสกุล" /></div>
             <div><label className="block text-xs font-bold mb-1">ห้อง (เช่น 1/1) *</label><input required value={singleStu.room || ''} onChange={e=>setSingleStu({...singleStu, room: e.target.value})} className={inputClass} placeholder="ห้อง" /></div>
             <div><label className="block text-xs font-bold mb-1">เลขที่</label><input value={singleStu.number || ''} onChange={e=>setSingleStu({...singleStu, number: e.target.value})} className={inputClass} placeholder="เลขที่" /></div>
             <div><label className="block text-xs font-bold mb-1">ตอน</label><input value={singleStu.section || ''} onChange={e=>setSingleStu({...singleStu, section: e.target.value})} className={inputClass} placeholder="ก/ข (ไม่บังคับ)" /></div>
             <div><label className="block text-xs font-bold mb-1">ลงทะเบียนวิชา</label><select value={singleStu.subjectId} onChange={e=>setSingleStu({...singleStu, subjectId: e.target.value})} className={inputClass}><option value="">ไม่ลงทะเบียนตอนนี้</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
             <div className="md:col-span-3 text-right"><button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md">บันทึกข้อมูล</button></div>
          </form>
        )}

        {showImport && (
          <div className={`p-6 border-b ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
             <select value={importSub} onChange={e => setImportSub(e.target.value)} className={`mb-3 w-full sm:w-1/2 p-3 rounded-xl border font-bold outline-none ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}><option value="" disabled>เลือกวิชาที่จะให้ลงทะเบียน...</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
             <p className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>คัดลอก Excel 5 คอลัมน์มาวาง: รหัส | ชื่อ-สกุล | เลขที่ | ตอน | ห้อง</p>
             <textarea value={pasteData} onChange={e => setPasteData(e.target.value)} className={`w-full h-32 p-4 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`} placeholder="1001&#9;เด็กชายสมชาย ใจดี&#9;1&#9;ก&#9;1/1" />
             <div className="mt-3 text-right"><button onClick={handleBulkImport} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold">บันทึก นำเข้า</button></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className={`font-bold border-b ${isDark ? 'bg-slate-900/50 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              <tr><th className="p-4 text-center">รูป</th><th className="p-4">รหัส</th><th className="p-4">ชื่อ-สกุล</th><th className="p-4">เลขที่/ห้อง</th><th className="p-4 text-center">ใช้งานล่าสุด</th><th className="p-4 text-center">จัดการ</th></tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
              {targetStudents.map(s => (
                <tr key={s.id} onClick={() => setViewingStudent(s)} className={`transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50/50'}`}>
                  <td className="p-4 text-center"><div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto overflow-hidden border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    {s.profileImg ? <img src={getValidImgUrl(s.profileImg)} className="w-full h-full object-cover rounded-full"/> : <User size={18}/>}
                  </div></td>
                  <td className="p-4 font-mono font-bold text-blue-500">{s.id}</td>
                  <td className="p-4 font-bold">{s.name}</td>
                  <td className="p-4 font-medium">{s.number} / {s.room} <span className="opacity-50 ml-1 text-xs">{s.section}</span></td>
                  <td className={`p-4 text-center text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.lastLogin ? s.lastLogin : '-'}</td>
                  <td className="p-4 text-center">
                    <button onClick={(e) => openEdit(e, s)} className="text-amber-500 hover:text-amber-600 mr-3" title="แก้ไขข้อมูล/ลงทะเบียนวิชา"><Edit size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDel(s.id); }} className="text-red-400 hover:text-red-500" title="ลบนักเรียน"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
              {targetStudents.length === 0 && <tr><td colSpan="6" className="text-center p-8 text-slate-500 font-bold">ไม่พบรายชื่อนักเรียน</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {viewingStudent && (
         <ViewStudentModal 
            student={viewingStudent} 
            onClose={() => setViewingStudent(null)} 
            students={students} 
            setStudents={setStudents}
            assignments={assignments}
            submissions={submissions}
            behaviors={behaviors}
            enrollments={enrollments}
            saveState={saveState}
            showToast={showToast}
            theme={theme}
         />
      )}

      {editForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className={`rounded-3xl w-full max-w-lg p-8 shadow-2xl relative border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setEditForm(null)} className={`absolute top-5 right-5 p-2 rounded-full ${isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'} transition-colors`}><X size={20}/></button>
            <h3 className="text-xl font-black mb-4 flex items-center"><Edit className="mr-2 text-blue-500"/> แก้ไขและลงทะเบียนวิชา</h3>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold mb-1">รหัสประจำตัว</label><input disabled value={editForm.id || ''} className={`${inputClass} opacity-50 cursor-not-allowed`} /></div>
                <div><label className="block text-xs font-bold mb-1">ชื่อ-สกุล</label><input required value={editForm.name || ''} onChange={e=>setEditForm({...editForm, name: e.target.value})} className={inputClass} /></div>
                <div><label className="block text-xs font-bold mb-1">ห้อง</label><input required value={editForm.room || ''} onChange={e=>setEditForm({...editForm, room: e.target.value})} className={inputClass} /></div>
                <div><label className="block text-xs font-bold mb-1">เลขที่</label><input value={editForm.number || ''} onChange={e=>setEditForm({...editForm, number: e.target.value})} className={inputClass} /></div>
                <div className="col-span-2"><label className="block text-xs font-bold mb-1">ตอน (Group / Section)</label><input value={editForm.section || ''} onChange={e=>setEditForm({...editForm, section: e.target.value})} className={inputClass} placeholder="เช่น ก หรือ ข (ไม่บังคับ)" /></div>
              </div>

              <div className={`p-4 rounded-xl mt-4 border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block text-sm font-bold mb-3 text-blue-500 flex items-center"><Layers size={16} className="mr-2"/> เลือกวิชาที่ต้องการลงทะเบียนเรียน</label>
                <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                  {subjects.map(sub => (
                    <label key={sub.id} className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all ${editForm.enrolledSubjectIds.includes(sub.id) ? (isDark ? 'bg-blue-900/30 border-blue-500/50' : 'bg-blue-50 border-blue-200') : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}`}>
                      <input type="checkbox" checked={editForm.enrolledSubjectIds.includes(sub.id)} onChange={() => toggleSubject(sub.id)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mr-3" />
                      <span className="font-bold text-sm">{sub.name} <span className="opacity-50 text-xs ml-1">({sub.code})</span></span>
                    </label>
                  ))}
                  {subjects.length === 0 && <div className="text-xs text-slate-500 font-bold">ยังไม่มีรายวิชาในระบบ</div>}
                </div>
              </div>
              <div className="pt-4 flex justify-end"><button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md w-full">บันทึกการแก้ไข</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewStudentModal({ student, onClose, students, setStudents, assignments, submissions, behaviors, enrollments, saveState, showToast, theme }) {
  const isDark = theme === 'dark';
  const inputClass = `w-full rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`;

  const [contactForm, setContactForm] = useState({
     studentPhone: student.studentPhone || '',
     parentPhone: student.parentPhone || '',
     parentRelation: student.parentRelation || ''
  });

  const totalBehaviors = behaviors.filter(b => String(b.studentId).trim() === String(student.id).trim()).reduce((sum, b) => sum + b.points, 0);
  
  // คำนวณงานค้างส่งเฉพาะวิชาที่นักเรียนลงทะเบียนเรียน
  const enrolledSubjectIds = (enrollments || []).filter(e => String(e.studentId).trim() === String(student.id).trim()).map(e => e.subjectId);
  const availableAsgs = assignments.filter(a => 
     enrolledSubjectIds.includes(a.subjectId) && 
     (a.targetRoom === 'all' || String(a.targetRoom).trim() === String(student.room).trim())
  );
  const missingCount = availableAsgs.filter(a => !submissions.find(s => s.assignmentId === a.id && String(s.studentId).trim() === String(student.id).trim())).length;

  const handleSaveContact = (e) => {
     e.preventDefault();
     const updatedStudents = students.map(s => String(s.id).trim() === String(student.id).trim() ? { ...s, ...contactForm } : s);
     saveState({ students: updatedStudents });
     showToast('บันทึกข้อมูลติดต่อสำเร็จ');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={onClose}>
      <div className={`rounded-3xl w-full max-w-2xl shadow-2xl relative border flex flex-col max-h-[90vh] overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
         
         <div className={`p-6 border-b flex justify-between items-center bg-gradient-to-r ${isDark ? 'from-blue-900/50 to-slate-800 border-slate-700' : 'from-blue-50 to-white border-slate-200'}`}>
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden bg-white shrink-0">
                  {student.profileImg ? <img src={getValidImgUrl(student.profileImg)} className="w-full h-full object-cover" /> : <User size={32} className="w-full h-full p-2 text-slate-400" />}
               </div>
               <div>
                 <h2 className="text-xl font-black">{student.name}</h2>
                 <div className="flex gap-2 text-sm font-bold mt-1">
                    <span className="text-blue-500 font-mono">{student.id}</span>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>| ห้อง {student.room} | เลขที่ {student.number}</span>
                 </div>
               </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-full transition-colors shrink-0 ${isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'}`}><X size={20}/></button>
         </div>

         <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-xs font-bold text-slate-500 mb-1">งานค้างส่ง (ทั้งหมด)</p>
                  <p className={`text-3xl font-black ${missingCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{missingCount}</p>
               </div>
               <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-xs font-bold text-slate-500 mb-1">คะแนนพฤติกรรมสะสม</p>
                  <p className={`text-3xl font-black ${totalBehaviors > 0 ? 'text-emerald-500' : totalBehaviors < 0 ? 'text-red-500' : 'text-blue-500'}`}>{totalBehaviors > 0 ? `+${totalBehaviors}` : totalBehaviors}</p>
               </div>
            </div>

            <form onSubmit={handleSaveContact} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/30 border-slate-700' : 'bg-white border-slate-200'}`}>
               <h3 className="font-bold text-blue-500 mb-4 flex items-center"><User size={16} className="mr-2"/> ข้อมูลการติดต่อ</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold mb-1">เบอร์โทรศัพท์นักเรียน</label><input type="text" value={contactForm.studentPhone} onChange={e=>setContactForm({...contactForm, studentPhone: e.target.value})} className={inputClass} placeholder="08x-xxx-xxxx" /></div>
                  <div><label className="block text-xs font-bold mb-1">เบอร์โทรศัพท์ผู้ปกครอง</label><input type="text" value={contactForm.parentPhone} onChange={e=>setContactForm({...contactForm, parentPhone: e.target.value})} className={inputClass} placeholder="08x-xxx-xxxx" /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-bold mb-1">ความสัมพันธ์ผู้ปกครอง (เช่น บิดา, มารดา)</label><input type="text" value={contactForm.parentRelation} onChange={e=>setContactForm({...contactForm, parentRelation: e.target.value})} className={inputClass} /></div>
               </div>
               <div className="mt-4 text-right"><button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-sm">บันทึกข้อมูลติดต่อ</button></div>
            </form>
         </div>
      </div>
    </div>
  );
}


function TeacherAttendance({ subjects, students, enrollments, attendance, setAttendance, showToast, theme, getUniqueRooms, getUniqueSections }) {
  const [selectedSub, setSelectedSub] = useState(subjects[0]?.id || '');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tempStatus, setTempStatus] = useState({});
  const isDark = theme === 'dark';

  const enrolledIds = enrollments.filter(e => e.subjectId === selectedSub).map(e => String(e.studentId).trim());
  const enrolledSts = students.filter(s => enrolledIds.includes(String(s.id).trim()));
  const dynamicRooms = getUniqueRooms();
  const dynamicSections = getUniqueSections(selectedRoom);
  
  const targetStudents = enrolledSts
       .filter(s => selectedRoom === 'all' || String(s.room || '').trim() === String(selectedRoom).trim())
       .filter(s => selectedSection === 'all' || String(s.section || '').trim() === String(selectedSection).trim());

  useEffect(() => {
    let initialStatus = {};
    targetStudents.forEach(s => {
      const existingRecord = attendance.find(a => a.studentId === s.id && a.subjectId === selectedSub && a.date === date);
      initialStatus[s.id] = existingRecord ? existingRecord.status : 'present';
    });
    setTempStatus(initialStatus);
  }, [selectedSub, date, targetStudents.length]); 

  const handleStatusChange = (studentId, status) => { setTempStatus({ ...tempStatus, [studentId]: status }); };

  const handleSaveAttendance = () => {
    let newAttendance = [...attendance];
    let changesMade = false;

    targetStudents.forEach(s => {
      const status = tempStatus[s.id] || 'present';
      const existingIndex = newAttendance.findIndex(a => a.studentId === s.id && a.subjectId === selectedSub && a.date === date);
      if (existingIndex >= 0) {
        if (newAttendance[existingIndex].status !== status) { newAttendance[existingIndex].status = status; changesMade = true; }
      } else {
        newAttendance.push({ id: `at${Date.now()}_${s.id}_${Math.random()}`, subjectId: selectedSub, studentId: s.id, date, status }); changesMade = true;
      }
    });

    if (changesMade) { setAttendance(newAttendance); showToast('บันทึกข้อมูลการเข้าเรียนสำเร็จ'); } 
    else { showToast('ไม่มีการเปลี่ยนแปลงข้อมูล'); }
  };

  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-black flex items-center border-l-4 border-blue-600 pl-3"><Calendar className="mr-2 text-blue-500"/> เช็กชื่อเข้าเรียน</h2>
        <button onClick={handleSaveAttendance} className="w-full sm:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center transition-colors"><Save size={18} className="mr-2"/> บันทึกการเข้าเรียน</button>
      </div>
      
      <div className={`p-6 rounded-3xl flex flex-wrap gap-4 items-end shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex-1 min-w-[200px]"><label className="block text-sm font-bold mb-2">วิชา</label><select value={selectedSub} onChange={e=>{setSelectedSub(e.target.value); setSelectedRoom('all'); setSelectedSection('all');}} className={inputClass}>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="block text-sm font-bold mb-2">ห้อง</label><select value={selectedRoom} onChange={e=>{setSelectedRoom(e.target.value); setSelectedSection('all');}} className={inputClass}><option value="all">ทุกห้อง</option>{dynamicRooms.map(r=><option key={r} value={r}>ห้อง {r}</option>)}</select></div>
        <div><label className="block text-sm font-bold mb-2">ตอน (Section)</label><select value={selectedSection} onChange={e=>setSelectedSection(e.target.value)} className={inputClass} disabled={selectedRoom === 'all'}><option value="all">ทุกตอน</option>{dynamicSections.map(s=><option key={s} value={s}>ตอน {s}</option>)}</select></div>
        <div><label className="block text-sm font-bold mb-2">วันที่</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputClass} /></div>
      </div>

      <div className={`rounded-3xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-4 text-sm font-bold border-b flex items-center ${isDark ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
          <AlertCircle size={16} className="mr-2 shrink-0"/> <span className="leading-tight">ระบบตั้งค่า "มาเรียน" ให้ทุกคนอัตโนมัติ แก้ไขสถานะให้เสร็จก่อน แล้วจึงกด "บันทึกการเข้าเรียน" ด้านบน</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className={`font-bold border-b ${isDark ? 'bg-slate-900/50 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              <tr><th className="p-4 w-16 text-center">ห้อง</th><th className="p-4 w-16 text-center">ตอน</th><th className="p-4 w-16 text-center">เลขที่</th><th className="p-4">รหัส / ชื่อ-สกุล</th><th className="p-4 text-center">สถานะการมาเรียน</th></tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
              {targetStudents.map(s => (
                <tr key={s.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50/50'}`}>
                  <td className="p-4 text-center font-bold text-slate-500">{s.room}</td>
                  <td className="p-4 text-center font-bold text-slate-500">{s.section || '-'}</td>
                  <td className="p-4 text-center font-bold">{s.number}</td>
                  <td className="p-4 font-bold"><span className="text-blue-500 mr-2 font-mono">{s.id}</span>{s.name}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleStatusChange(s.id, 'present')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${tempStatus[s.id] === 'present' ? 'bg-green-500 text-white shadow-md shadow-green-500/30' : (isDark ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>มา</button>
                      <button onClick={() => handleStatusChange(s.id, 'late')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${tempStatus[s.id] === 'late' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : (isDark ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>สาย</button>
                      <button onClick={() => handleStatusChange(s.id, 'leave')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${tempStatus[s.id] === 'leave' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' : (isDark ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>ลา</button>
                      <button onClick={() => handleStatusChange(s.id, 'absent')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${tempStatus[s.id] === 'absent' ? 'bg-red-500 text-white shadow-md shadow-red-500/30' : (isDark ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>ขาด</button>
                    </div>
                  </td>
                </tr>
              ))}
              {targetStudents.length === 0 && <tr><td colSpan="5" className="text-center p-8 text-slate-500 font-bold">ไม่พบรายชื่อนักเรียน</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeacherAttendanceSummary({ subjects, students, enrollments, attendance, theme, showToast, getUniqueRooms, getUniqueSections }) {
  const [filterSub, setFilterSub] = useState(subjects[0]?.id || '');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const isDark = theme === 'dark';

  const enrolledIds = enrollments.filter(e => e.subjectId === filterSub).map(e => String(e.studentId).trim());
  const enrolledSts = students.filter(s => enrolledIds.includes(String(s.id).trim()));
  const dynamicRooms = getUniqueRooms();
  const dynamicSections = getUniqueSections(filterRoom);
  
  const targetStudents = enrolledSts
      .filter(s => filterRoom === 'all' || String(s.room || '').trim() === String(filterRoom).trim())
      .filter(s => filterSection === 'all' || String(s.section || '').trim() === String(filterSection).trim());

  const subObj = subjects.find(s => s.id === filterSub);

  const allDatesInMonth = [...new Set(attendance.filter(a => a.subjectId === filterSub && a.date.startsWith(filterMonth)).map(a => a.date))].sort();

  const getStatusText = (status) => {
    switch(status) {
      case 'present': return { text: 'ม', color: isDark ? 'text-green-400 bg-green-900/30' : 'text-green-600 bg-green-50' };
      case 'late': return { text: 'ส', color: isDark ? 'text-amber-400 bg-amber-900/30' : 'text-amber-600 bg-amber-50' };
      case 'leave': return { text: 'ล', color: isDark ? 'text-blue-400 bg-blue-900/30' : 'text-blue-600 bg-blue-50' };
      case 'absent': return { text: 'ข', color: isDark ? 'text-red-400 bg-red-900/30' : 'text-red-600 bg-red-50' };
      default: return { text: '-', color: 'text-slate-400' };
    }
  };

  const handleExportAttendance = () => {
    if (!subObj) return;
    let csv = '\uFEFF'; 
    csv += `สรุปการเข้าเรียน วิชา ${subObj.name} (${subObj.code}) - เดือน ${filterMonth}\n`;
    csv += 'ห้อง,ตอน,เลขที่,รหัส,ชื่อ-สกุล,';
    allDatesInMonth.forEach(d => csv += `"${d.split('-')[2]}/${d.split('-')[1]}",`);
    csv += 'มา (ครั้ง),สาย (ครั้ง),ลา (ครั้ง),ขาด (ครั้ง)\n';

    targetStudents.forEach(stu => {
      let counts = { present: 0, late: 0, leave: 0, absent: 0 };
      csv += `="${stu.room}","${stu.section || ''}",${stu.number},="${stu.id}","${stu.name}",`;
      
      allDatesInMonth.forEach(date => {
        const record = attendance.find(a => a.studentId === stu.id && a.subjectId === filterSub && a.date === date);
        if (record) counts[record.status]++;
        const statusTxt = record ? (record.status === 'present' ? 'ม' : record.status === 'late' ? 'ส' : record.status === 'leave' ? 'ล' : 'ข') : '-';
        csv += `${statusTxt},`;
      });
      csv += `${counts.present},${counts.late},${counts.leave},${counts.absent}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Attendance_${subObj.code}_${filterMonth}.csv`; link.click();
    showToast('ดาวน์โหลดรายงานเช็กชื่อ Excel (.csv) สำเร็จ');
  };

  const selectClass = `font-bold rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 border flex-1 md:flex-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
    <div className="max-w-full mx-auto space-y-6 flex flex-col h-[calc(100vh-100px)]">
      <div className={`p-5 rounded-3xl flex flex-wrap gap-4 items-center justify-between shadow-sm shrink-0 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <div className="flex gap-4 w-full md:w-auto items-end flex-wrap">
           <div className="flex-1 min-w-[200px]"><label className="block text-sm font-bold mb-2">วิชา</label><select value={filterSub} onChange={e=>{setFilterSub(e.target.value); setFilterRoom('all'); setFilterSection('all');}} className={`w-full ${selectClass}`}>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
           <div><label className="block text-sm font-bold mb-2">ห้อง</label><select value={filterRoom} onChange={e=>{setFilterRoom(e.target.value); setFilterSection('all');}} className={selectClass}><option value="all">ทุกห้อง</option>{dynamicRooms.map(r=><option key={r} value={r}>ห้อง {r}</option>)}</select></div>
           <div><label className="block text-sm font-bold mb-2">ตอน</label><select value={filterSection} onChange={e=>setFilterSection(e.target.value)} className={selectClass} disabled={filterRoom === 'all'}><option value="all">ทุกตอน</option>{dynamicSections.map(s=><option key={s} value={s}>ตอน {s}</option>)}</select></div>
           <div><label className="block text-sm font-bold mb-2">เดือน</label><input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className={selectClass} /></div>
         </div>
         <button onClick={handleExportAttendance} className="flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md w-full md:w-auto justify-center transition-colors"><DownloadCloud size={18} className="mr-2" /> ส่งออก Excel</button>
      </div>

      <div className={`border rounded-3xl overflow-hidden flex-1 flex flex-col shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm min-w-max border-collapse">
            <thead className={`font-bold sticky top-0 z-10 border-b shadow-sm ${isDark ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              <tr>
                <th className={`p-4 border-r text-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>ห้อง</th><th className={`p-4 border-r text-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>ตอน</th><th className={`p-4 border-r text-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>เลขที่</th><th className={`p-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>รหัส / ชื่อ-สกุล</th>
                {allDatesInMonth.map(d => (<th key={d} className={`p-2 text-center border-r text-xs whitespace-nowrap ${isDark ? 'border-slate-700 bg-blue-900/20' : 'border-slate-200 bg-blue-50/50'}`}>{d.split('-')[2]}/{d.split('-')[1]}</th>))}
                {allDatesInMonth.length === 0 && <th className={`p-4 text-center border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>ไม่มีข้อมูลในเดือนนี้</th>}
                <th className={`p-2 text-center border-r ${isDark ? 'border-slate-700 bg-green-900/20 text-green-400' : 'border-slate-200 bg-green-50 text-green-700'}`}>มา</th>
                <th className={`p-2 text-center border-r ${isDark ? 'border-slate-700 bg-amber-900/20 text-amber-400' : 'border-slate-200 bg-amber-50 text-amber-700'}`}>สาย</th>
                <th className={`p-2 text-center border-r ${isDark ? 'border-slate-700 bg-blue-900/20 text-blue-400' : 'border-slate-200 bg-blue-50 text-blue-700'}`}>ลา</th>
                <th className={`p-2 text-center ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}`}>ขาด</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
              {targetStudents.map(stu => {
                let counts = { present: 0, late: 0, leave: 0, absent: 0 };
                return (
                  <tr key={stu.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50/40'}`}>
                    <td className={`p-4 text-center font-bold border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{stu.room}</td>
                    <td className={`p-4 text-center font-bold border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{stu.section || '-'}</td>
                    <td className={`p-4 text-center border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{stu.number}</td>
                    <td className={`p-4 font-bold border-r whitespace-nowrap ${isDark ? 'border-slate-700' : 'border-slate-100'}`}><span className="text-blue-500 mr-2 font-mono">{stu.id}</span>{stu.name}</td>
                    {allDatesInMonth.map(date => {
                      const record = attendance.find(a => a.studentId === stu.id && a.subjectId === filterSub && a.date === date);
                      if (record) counts[record.status]++;
                      const statusInfo = getStatusText(record?.status);
                      return (<td key={date} className={`p-2 text-center font-black border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{record ? <span className={`w-8 h-8 flex items-center justify-center rounded-lg mx-auto ${statusInfo.color}`}>{statusInfo.text}</span> : <span className="text-slate-400">-</span>}</td>);
                    })}
                    {allDatesInMonth.length === 0 && <td className={`p-4 text-center border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>-</td>}
                    <td className={`p-4 text-center font-black border-r ${isDark ? 'border-slate-700 text-green-400' : 'border-slate-100 text-green-600'}`}>{counts.present > 0 ? counts.present : '-'}</td>
                    <td className={`p-4 text-center font-black border-r ${isDark ? 'border-slate-700 text-amber-400' : 'border-slate-100 text-amber-600'}`}>{counts.late > 0 ? counts.late : '-'}</td>
                    <td className={`p-4 text-center font-black border-r ${isDark ? 'border-slate-700 text-blue-400' : 'border-slate-100 text-blue-600'}`}>{counts.leave > 0 ? counts.leave : '-'}</td>
                    <td className={`p-4 text-center font-black text-red-500`}>{counts.absent > 0 ? counts.absent : '-'}</td>
                  </tr>
                );
              })}
              {targetStudents.length === 0 && <tr><td colSpan={8 + allDatesInMonth.length} className="p-8 text-center font-bold text-slate-500">ไม่พบนักเรียนในวิชาและห้องที่เลือก</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeacherBehavior({ subjects, students, enrollments, behaviors, setBehaviors, showToast, theme, getUniqueRooms, getUniqueSections }) {
  const [selectedSub, setSelectedSub] = useState(subjects[0]?.id || '');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const isDark = theme === 'dark';

  const enrolledIds = enrollments.filter(e => e.subjectId === selectedSub).map(e => String(e.studentId).trim());
  const enrolledSts = students.filter(s => enrolledIds.includes(String(s.id).trim()));
  const dynamicRooms = getUniqueRooms();
  const dynamicSections = getUniqueSections(selectedRoom);
  
  const targetStudents = enrolledSts
       .filter(s => selectedRoom === 'all' || String(s.room || '').trim() === String(selectedRoom).trim())
       .filter(s => selectedSection === 'all' || String(s.section || '').trim() === String(selectedSection).trim());


  const handleSaveBehavior = (studentId) => {
    const ptsInput = document.getElementById(`beh-pts-${studentId}`);
    const remInput = document.getElementById(`beh-rem-${studentId}`);
    const pts = parseFloat(ptsInput.value);
    const rem = remInput.value.trim();

    if (isNaN(pts) || !rem) return showToast('กรุณากรอกคะแนนพฤติกรรม (เป็นตัวเลข) และพิมพ์หมายเหตุให้ครบถ้วน');

    setBehaviors([...behaviors, { id: `b${Date.now()}_${Math.random()}`, subjectId: selectedSub, studentId, date, points: pts, remark: rem }]);
    ptsInput.value = ''; remInput.value = '';
    showToast(`บันทึกพฤติกรรม ${pts > 0 ? '+'+pts : pts} คะแนน ให้รหัส ${studentId} สำเร็จ`);
  };

  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-xl font-black flex items-center border-l-4 border-blue-600 pl-3"><Award className="mr-2 text-blue-500"/> บันทึกพฤติกรรมนักเรียน</h2>
      <div className={`p-6 rounded-3xl flex flex-wrap gap-4 items-end shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex-1 min-w-[200px]"><label className="block text-sm font-bold mb-2">วิชา</label><select value={selectedSub} onChange={e=>{setSelectedSub(e.target.value); setSelectedRoom('all'); setSelectedSection('all');}} className={inputClass}>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="block text-sm font-bold mb-2">ห้อง</label><select value={selectedRoom} onChange={e=>{setSelectedRoom(e.target.value); setSelectedSection('all');}} className={inputClass}><option value="all">ทุกห้อง</option>{dynamicRooms.map(r=><option key={r} value={r}>ห้อง {r}</option>)}</select></div>
        <div><label className="block text-sm font-bold mb-2">ตอน</label><select value={selectedSection} onChange={e=>setSelectedSection(e.target.value)} className={inputClass} disabled={selectedRoom === 'all'}><option value="all">ทุกตอน</option>{dynamicSections.map(s=><option key={s} value={s}>ตอน {s}</option>)}</select></div>
        <div><label className="block text-sm font-bold mb-2">วันที่</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputClass} /></div>
      </div>

      <div className={`rounded-3xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className={`font-bold border-b ${isDark ? 'bg-slate-900/50 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              <tr><th className="p-4 w-16 text-center">ห้อง</th><th className="p-4 w-16 text-center">ตอน</th><th className="p-4 w-16 text-center">เลขที่</th><th className="p-4 w-64">รหัส / ชื่อ-สกุล</th><th className="p-4 text-center">บันทึกคะแนนพฤติกรรม และ หมายเหตุ</th></tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
              {targetStudents.map(s => (
                <tr key={s.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50/50'}`}>
                  <td className="p-4 text-center font-bold text-slate-500">{s.room}</td>
                  <td className="p-4 text-center font-bold text-slate-500">{s.section || '-'}</td>
                  <td className="p-4 text-center font-bold">{s.number}</td>
                  <td className="p-4 font-bold"><span className="text-blue-500 mr-2 font-mono">{s.id}</span>{s.name}</td>
                  <td className="p-4">
                     <div className="flex items-center justify-center gap-2">
                       <input type="number" id={`beh-pts-${s.id}`} placeholder="+/-" className={`w-16 rounded-lg p-2.5 text-center font-bold outline-none border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                       <input type="text" id={`beh-rem-${s.id}`} placeholder="พิมพ์รายละเอียดพฤติกรรม..." className={`flex-1 rounded-lg p-2.5 font-bold outline-none border ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 focus:border-blue-500'}`} />
                       <button onClick={()=>handleSaveBehavior(s.id)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md">บันทึก</button>
                     </div>
                  </td>
                </tr>
              ))}
              {targetStudents.length === 0 && <tr><td colSpan="5" className="text-center p-8 text-slate-500 font-bold">ไม่พบนักเรียนในวิชาหรือห้องที่เลือก</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function TeacherMaterials({ subjects, materials, setMaterials, dbUrl, showToast, theme }) {
  const [form, setForm] = useState({ subjectId: subjects[0]?.id || '', title: '', description: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const isDark = theme === 'dark';

  const filteredMaterials = materials.filter(m => 
    String(m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    String(m.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return showToast('กรุณาเลือกไฟล์');
    if (!dbUrl) return showToast('กรุณาตั้งค่า Database URL ในเมนูตั้งค่าก่อน');
    
    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const payload = { action: 'uploadMaterial', filename: file.name, mimeType: file.type, fileData: base64 };
      try {
        const res = await fetch(dbUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.url) {
           setMaterials([{ id: `m${Date.now()}`, ...form, fileName: file.name, url: data.url, uploadedAt: new Date().toISOString().split('T')[0] }, ...materials]);
           showToast('อัปโหลดไฟล์ไปที่ Google Drive แล้ว');
           setFile(null); setForm({ ...form, title: '', description: '' });
        }
      } catch (error) { showToast('อัปโหลดล้มเหลว ตรวจสอบการเชื่อมต่อ'); } finally { setUploading(false); }
    };
  };

  const executeDelete = () => { setMaterials(materials.filter(m => m.id !== confirmDel)); setConfirmDel(null); showToast('ลบใบงานเรียบร้อยแล้ว'); };

  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
       <ConfirmModal isOpen={!!confirmDel} title="ยืนยันการลบเอกสารใบงาน" message="คุณต้องการลบสื่อการเรียน/ใบงานนี้ใช่หรือไม่? ไฟล์ที่อยู่บน Google Drive จะไม่ถูกลบ แต่จะไม่แสดงในระบบนี้อีก" onConfirm={executeDelete} onCancel={() => setConfirmDel(null)} theme={theme} />
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <h2 className="text-xl font-black flex items-center border-l-4 border-blue-600 pl-3"><FolderOpen className="mr-2 text-blue-500"/> คลังสื่อการเรียน / ใบงาน</h2>
         <div className="relative w-full sm:w-auto">
           <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
           <input type="text" placeholder="ค้นหาใบงาน..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`pl-10 pr-4 py-2.5 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
         </div>
       </div>

       <div className={`p-6 rounded-3xl shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div><label className="block text-sm font-bold mb-2">วิชา</label><select value={form.subjectId} onChange={e=>setForm({...form, subjectId: e.target.value})} className={inputClass}>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
             <div><label className="block text-sm font-bold mb-2">ชื่อเอกสาร / ใบงาน</label><input required type="text" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className={inputClass}/></div>
             <div className="md:col-span-2"><label className="block text-sm font-bold mb-2">คำอธิบาย (ถ้ามี)</label><input type="text" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className={inputClass}/></div>
             <div className={`md:col-span-2 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer relative transition-colors ${isDark ? 'border-blue-500/50 bg-blue-900/20 hover:bg-blue-900/40' : 'border-blue-300 bg-blue-50/50 hover:bg-blue-100'}`}>
               <input type="file" required onChange={e=>setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
               <Upload size={40} className="mx-auto text-blue-500 mb-3"/>
               <p className="font-bold text-blue-500 text-lg">{file ? file.name : 'คลิกหรือลากไฟล์เอกสารมาวาง (PDF/Image)'}</p>
             </div>
             <div className="md:col-span-2 flex justify-end mt-2"><button type="submit" disabled={uploading} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 disabled:opacity-50">{uploading ? 'กำลังอัปโหลดไป Drive...' : 'อัปโหลดสื่อ'}</button></div>
          </form>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {filteredMaterials.map(m => {
            const sub = subjects.find(s => s.id === m.subjectId);
            return (
              <div key={m.id} className={`p-5 rounded-2xl shadow-sm relative group border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button onClick={()=>setConfirmDel(m.id)} className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                <div className="text-xs bg-blue-500/10 text-blue-500 font-bold px-3 py-1.5 rounded inline-block mb-3">{sub?.name}</div>
                <h4 className="font-black text-lg">{m.title}</h4>
                <p className={`text-sm my-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{m.description}</p>
                <div className={`mt-4 pt-4 border-t flex justify-between items-center ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <span className="text-xs text-slate-500 font-bold">อัปโหลด: {m.uploadedAt}</span>
                  <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-500 font-bold text-sm bg-blue-500/10 px-4 py-2 rounded-lg hover:bg-blue-500/20 flex items-center"><DownloadCloud size={14} className="mr-2"/> เปิด Folder Drive</a>
                </div>
              </div>
            )
         })}
         {filteredMaterials.length === 0 && <div className={`col-span-full text-center py-12 rounded-2xl border font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>ไม่พบใบงานที่ค้นหา</div>}
       </div>
    </div>
  );
}

function TeacherAssignments({ assignments, setAssignments, subjects, showToast, theme, getUniqueRooms, dbUrl }) {
  const [showForm, setShowForm] = useState(false);
  const [newAsg, setNewAsg] = useState({ subjectId: subjects[0]?.id || '', title: '', description: '', maxScore: 10, dueDate: '', targetRoom: 'all', linkUrl: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editAsg, setEditAsg] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  
  const isDark = theme === 'dark';

  const handleCreate = async (e) => {
    e.preventDefault();
    if(!newAsg.subjectId) return showToast('กรุณาสร้างวิชาเรียนก่อน');

    let uploadedImageUrl = '';
    if (imageFile) {
      if (!dbUrl) return showToast('กรุณาตั้งค่า Database URL เพื่ออัปโหลดรูปภาพ');
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        await new Promise((resolve) => {
          reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            const payload = { action: 'uploadAssignmentImg', filename: `asg_${Date.now()}_${imageFile.name}`, mimeType: imageFile.type, fileData: base64 };
            const res = await fetch(dbUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.url) uploadedImageUrl = data.url;
            resolve();
          };
        });
      } catch (error) {
        showToast('อัปโหลดรูปภาพล้มเหลว งานจะถูกสร้างโดยไม่มีรูปประกอบ');
      } finally {
        setIsUploading(false);
      }
    }

    setAssignments([{ ...newAsg, id: `a${Date.now()}`, imageUrl: uploadedImageUrl }, ...assignments]);
    setShowForm(false); showToast('สร้างงานใหม่สำเร็จ');
    setNewAsg({ subjectId: subjects[0]?.id || '', title: '', description: '', maxScore: 10, dueDate: '', targetRoom: 'all', linkUrl: '' });
    setImageFile(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    let uploadedImageUrl = editAsg.imageUrl || '';
    if (imageFile) {
      if (!dbUrl) return showToast('กรุณาตั้งค่า Database URL เพื่ออัปโหลดรูปภาพ');
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        await new Promise((resolve) => {
          reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            const payload = { action: 'uploadAssignmentImg', filename: `asg_${Date.now()}_${imageFile.name}`, mimeType: imageFile.type, fileData: base64 };
            const res = await fetch(dbUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.url) uploadedImageUrl = data.url;
            resolve();
          };
        });
      } catch (error) {
        showToast('อัปโหลดรูปภาพล้มเหลว งานจะถูกอัปเดตโดยไม่มีรูปใหม่');
      } finally {
        setIsUploading(false);
      }
    }

    setAssignments(assignments.map(a => a.id === editAsg.id ? { ...editAsg, imageUrl: uploadedImageUrl } : a));
    setEditAsg(null);
    setImageFile(null);
    showToast('แก้ไขงานสำเร็จ');
  };

  const executeDelete = () => {
    setAssignments(assignments.filter(a => a.id !== confirmDel));
    setConfirmDel(null);
    showToast('ลบงานเรียบร้อยแล้ว');
  };

  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 border font-bold ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      <ConfirmModal isOpen={!!confirmDel} title="ยืนยันการลบงาน" message="คุณต้องการลบงานนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้" onConfirm={executeDelete} onCancel={() => setConfirmDel(null)} theme={theme} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-black flex items-center border-l-4 border-blue-600 pl-3"><BookOpen className="mr-2 text-blue-500"/> จัดการงานเก็บคะแนน</h2>
        <button onClick={() => {setShowForm(!showForm); setEditAsg(null);}} className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors"><Plus size={16} className="mr-2" /> สร้างงานใหม่</button>
      </div>

      {(showForm || editAsg) && (
        <form onSubmit={editAsg ? handleSaveEdit : handleCreate} className={`p-8 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            
            <div className="md:col-span-2 flex justify-between items-center mb-2">
              <h3 className="text-xl font-black text-blue-500">{editAsg ? 'แก้ไขงาน' : 'สร้างงานใหม่'}</h3>
              {editAsg && <button type="button" onClick={() => setEditAsg(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>}
            </div>

            {/* Form Fields */}
            <div>
              <label className="block text-sm font-bold mb-2">เลือกวิชา *</label>
              <select required value={editAsg ? editAsg.subjectId : newAsg.subjectId} onChange={e => editAsg ? setEditAsg({...editAsg, subjectId: e.target.value}) : setNewAsg({...newAsg, subjectId: e.target.value})} className={inputClass}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center text-emerald-600 dark:text-emerald-500"><Users size={16} className="mr-1.5"/> มอบหมายเฉพาะห้องเรียน</label>
              <select value={editAsg ? editAsg.targetRoom : newAsg.targetRoom} onChange={e => editAsg ? setEditAsg({...editAsg, targetRoom: e.target.value}) : setNewAsg({...newAsg, targetRoom: e.target.value})} className={inputClass}>
                <option value="all">ทุกห้องที่เรียนวิชานี้ (เห็นทุกคน)</option>
                {getUniqueRooms().map(r => <option key={r} value={r}>ห้อง {r}</option>)}
              </select>
            </div>
            
            <div className="md:col-span-2"><label className="block text-sm font-bold mb-2">ชื่องาน *</label><input required type="text" value={editAsg ? editAsg.title : newAsg.title} onChange={e => editAsg ? setEditAsg({...editAsg, title: e.target.value}) : setNewAsg({...newAsg, title: e.target.value})} className={inputClass} placeholder="เช่น ใบงานที่ 1.1 / ส่งสมุด..." /></div>
            <div className="md:col-span-2"><label className="block text-sm font-bold mb-2">คำสั่ง / รายละเอียด *</label><textarea required value={editAsg ? editAsg.description : newAsg.description} onChange={e => editAsg ? setEditAsg({...editAsg, description: e.target.value}) : setNewAsg({...newAsg, description: e.target.value})} className={`${inputClass} h-24`} placeholder="อธิบายสิ่งที่นักเรียนต้องทำ..." /></div>
            
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-dashed border-slate-300 dark:border-slate-600">
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center"><ExternalLink size={16} className="mr-2 text-indigo-500"/> แนบลิงก์เพิ่มเติม (ถ้ามี)</label>
                <input type="text" value={editAsg ? (editAsg.linkUrl || '') : newAsg.linkUrl} onChange={e => editAsg ? setEditAsg({...editAsg, linkUrl: e.target.value}) : setNewAsg({...newAsg, linkUrl: e.target.value})} className={inputClass} placeholder="เช่น https://youtube.com/..." />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center"><ImageIcon size={16} className="mr-2 text-pink-500"/> แนบรูปภาพใหม่ (แทนที่รูปเดิม)</label>
                <div className={`border-2 border-dashed rounded-xl p-3 text-center relative cursor-pointer transition-colors ${isDark ? 'border-slate-600 bg-slate-900/50 hover:border-pink-500' : 'border-slate-300 bg-slate-50 hover:border-pink-500'}`}>
                   <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                   <span className={`text-sm font-bold ${imageFile ? 'text-pink-500' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{imageFile ? imageFile.name : 'คลิกเพื่อเลือกไฟล์รูปภาพ'}</span>
                </div>
              </div>
            </div>

            <div><label className="block text-sm font-bold mb-2">คะแนนเต็ม *</label><input required type="number" min="1" value={editAsg ? editAsg.maxScore : newAsg.maxScore} onChange={e => editAsg ? setEditAsg({...editAsg, maxScore: parseInt(e.target.value)}) : setNewAsg({...newAsg, maxScore: parseInt(e.target.value)})} className={inputClass} /></div>
            <div><label className="block text-sm font-bold mb-2">กำหนดส่ง *</label><input required type="date" value={editAsg ? editAsg.dueDate : newAsg.dueDate} onChange={e => editAsg ? setEditAsg({...editAsg, dueDate: e.target.value}) : setNewAsg({...newAsg, dueDate: e.target.value})} className={inputClass} /></div>
            <div className="md:col-span-2 flex justify-end mt-4">
              <button type="submit" disabled={isUploading} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md flex items-center disabled:opacity-50">
                {isUploading ? <><RefreshCw size={18} className="mr-2 animate-spin"/> กำลังอัปโหลด...</> : (editAsg ? 'บันทึกการแก้ไข' : 'บันทึกงานเก็บคะแนน')}
              </button>
            </div>
        </form>
      )}

      <div className="space-y-5">
        {assignments.map(asg => {
          const sub = subjects.find(s => s.id === asg.subjectId);
          return (
            <div key={asg.id} className={`p-6 rounded-3xl shadow-sm border flex flex-col md:flex-row gap-6 relative group ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button onClick={() => {setEditAsg(asg); setShowForm(false); window.scrollTo(0, 0);}} className={`p-2 rounded-lg transition-colors text-amber-500 shadow-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-slate-50 border border-slate-200'}`} title="แก้ไขงาน"><Edit size={16}/></button>
                 <button onClick={() => setConfirmDel(asg.id)} className={`p-2 rounded-lg transition-colors text-red-500 shadow-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-slate-50 border border-slate-200'}`} title="ลบงาน"><Trash2 size={16}/></button>
              </div>

              {asg.imageUrl && (
                <div className="w-full md:w-56 h-40 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={getValidImgUrl(asg.imageUrl)} alt="Assignment" className="w-full h-full object-cover"/>
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3 pr-20">
                    <h3 className="text-xl font-black text-blue-600 dark:text-blue-400 leading-tight">{asg.title}</h3>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg">{sub?.name}</span>
                      {asg.targetRoom && asg.targetRoom !== 'all' && <span className="text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-sm">เฉพาะห้อง {asg.targetRoom}</span>}
                    </div>
                  </div>
                  <p className={`text-sm mb-5 p-4 rounded-xl font-medium border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{asg.description}</p>
                  
                  {asg.linkUrl && (
                    <div className="mb-5">
                       <a href={asg.linkUrl.startsWith('http') ? asg.linkUrl : `https://${asg.linkUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-colors shadow-sm"><ExternalLink size={14} className="mr-2"/> เปิดลิงก์แนบ</a>
                    </div>
                  )}
                </div>
                <div className={`flex flex-wrap gap-2 text-xs font-bold pt-4 border-t mt-auto ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                  <span className={`px-4 py-2 rounded-lg shadow-sm border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}><BarChart2 size={12} className="inline mr-1 text-emerald-500"/> เต็ม: {asg.maxScore}</span>
                  <span className={`px-4 py-2 rounded-lg shadow-sm border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}><Clock size={12} className="inline mr-1 text-amber-500"/> กำหนดส่ง: {asg.dueDate}</span>
                </div>
              </div>
            </div>
          );
        })}
        {assignments.length === 0 && <div className={`text-center py-16 rounded-3xl border font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>ยังไม่มีการสร้างงานเก็บคะแนน</div>}
      </div>
    </div>
  );
}

function TeacherGrading({ assignments, submissions, setSubmissions, students, subjects, enrollments, showToast, theme, getUniqueRooms, getUniqueSections }) {
  const [filterSub, setFilterSub] = useState(subjects[0]?.id || '');
  const [filterAsg, setFilterAsg] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); 
  const isDark = theme === 'dark';

  const enrolledIds = enrollments.filter(e => e.subjectId === filterSub).map(e => String(e.studentId).trim());
  const enrolledSts = students.filter(s => enrolledIds.includes(String(s.id).trim()));
  const dynamicRooms = getUniqueRooms();
  const dynamicSections = getUniqueSections(filterRoom);
  const availableAsgs = assignments.filter(a => a.subjectId === filterSub);

  const filteredSubs = submissions.filter(sub => {
    const asg = assignments.find(a => a.id === sub.assignmentId);
    const stu = students.find(s => String(s.id).trim() === String(sub.studentId).trim());
    if (!asg || !stu) return false;
    if (filterSub && asg.subjectId !== filterSub) return false;
    if (filterAsg !== 'all' && asg.id !== filterAsg) return false;
    if (filterRoom !== 'all' && String(stu.room || '').trim() !== String(filterRoom).trim()) return false;
    if (filterSection !== 'all' && String(stu.section || '').trim() !== String(filterSection).trim()) return false;
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    return true;
  });

  const handleGrade = (subId, maxScore) => {
    const scoreInput = document.getElementById(`score-${subId}`).value;
    const penaltyInput = document.getElementById(`penalty-${subId}`).value || 0;
    
    const rawScore = parseFloat(scoreInput);
    const penalty = parseFloat(penaltyInput);
    
    if (isNaN(rawScore) || rawScore < 0 || rawScore > maxScore) return showToast(`คะแนนต้องอยู่ระหว่าง 0 - ${maxScore}`);
    
    const finalScore = Math.max(0, rawScore - penalty);
    
    setSubmissions(submissions.map(s => s.id === subId ? { ...s, status: 'graded', score: finalScore, rawScore, penalty } : s)); 
    showToast('บันทึกคะแนนและประเมินเรียบร้อย');
  };

  const handleEditGrade = (subId) => {
    setSubmissions(submissions.map(s => s.id === subId ? { ...s, status: 'submitted' } : s));
  };

  const handleRejectSubmission = (subId) => {
    if(window.confirm('คุณต้องการยกเลิกการส่งงานของนักเรียนคนนี้ เพื่อให้ส่งใหม่ใช่หรือไม่?')) {
       setSubmissions(submissions.filter(s => s.id !== subId));
       showToast('ยกเลิกการส่งงานเรียบร้อย นักเรียนสามารถส่งใหม่ได้แล้ว');
    }
  };

  const selectClass = `font-bold rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`;

  return (
    <div className={`max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-120px)] border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className={`p-5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'}`}>
        <h2 className="text-lg font-black flex items-center shrink-0"><CheckSquare className="mr-2 text-blue-500" size={20} /> ตรวจงานนักเรียน</h2>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <select value={filterSub} onChange={e => {setFilterSub(e.target.value); setFilterAsg('all'); setFilterRoom('all'); setFilterSection('all');}} className={selectClass}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select value={filterAsg} onChange={e => setFilterAsg(e.target.value)} className={selectClass}><option value="all">ทุกงานในวิชานี้</option>{availableAsgs.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
          <select value={filterRoom} onChange={e => {setFilterRoom(e.target.value); setFilterSection('all');}} className={selectClass}><option value="all">ทุกห้อง</option>{dynamicRooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}</select>
          <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={selectClass} disabled={filterRoom === 'all'}><option value="all">ทุกตอน</option>{dynamicSections.map(s => <option key={s} value={s}>ตอน {s}</option>)}</select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`font-bold rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 border ${filterStatus === 'submitted' ? 'bg-amber-100 text-amber-700 border-amber-200' : filterStatus === 'graded' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : (isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300')}`}>
             <option value="all">สถานะทั้งหมด</option><option value="submitted">⏳ รอตรวจ</option><option value="graded">✅ ตรวจแล้ว</option>
          </select>
        </div>
      </div>
      <div className={`p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 ${isDark ? 'bg-slate-900/30' : 'bg-slate-50/30'}`}>
        {filteredSubs.map(sub => {
          const stu = students.find(s => s.id === sub.studentId); const asg = assignments.find(a => a.id === sub.assignmentId);
          const isLate = sub.submittedAtISO && asg?.dueDate ? new Date(sub.submittedAtISO) > new Date(asg.dueDate + 'T23:59:59') : false;
          
          return (
            <div key={sub.id} className={`flex flex-col lg:flex-row lg:items-center justify-between p-5 rounded-2xl shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start gap-4">
                 <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border flex items-center justify-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
                   {stu?.profileImg ? <img src={getValidImgUrl(stu.profileImg)} className="w-full h-full object-cover rounded-full"/> : <User size={20} className="text-slate-400"/>}
                 </div>
                 <div>
                   <div className="flex flex-wrap items-center gap-2 mb-1"><span className="font-mono text-blue-500 font-bold">{stu?.id}</span><span className="font-black">{stu?.name}</span><span className={`text-xs px-2 py-0.5 rounded font-bold border ${isDark ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>ห้อง {stu?.room} {stu?.section ? `(${stu.section})` : ''}</span></div>
                   <div className={`text-sm font-bold flex flex-wrap gap-2 items-center ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span>{asg?.title}</span> <span className="text-slate-500 font-medium ml-1">(เต็ม {asg?.maxScore})</span>
                      {isLate && <span className="text-xs text-white bg-red-500 px-2 py-1 rounded ml-2 font-bold animate-pulse inline-flex items-center"><AlertCircle size={12} className="mr-1"/> ส่งช้า</span>}
                   </div>
                 </div>
              </div>
              <div className="flex flex-col lg:flex-row items-center justify-end gap-3 mt-4 lg:mt-0 w-full lg:w-auto">
                <a href={sub.fileUrl.startsWith('http') ? sub.fileUrl : `https://${sub.fileUrl}`} target="_blank" rel="noreferrer" className={`font-bold text-sm px-4 py-3 rounded-xl whitespace-nowrap flex items-center shadow-sm border transition-colors ${isDark ? 'bg-slate-900 hover:bg-slate-700 text-blue-400 border-slate-700' : 'bg-white hover:bg-blue-50 text-blue-600 border-slate-200'}`}>
                  {sub.type === 'link' ? <ExternalLink size={16} className="mr-2"/> : <DownloadCloud size={16} className="mr-2"/>} 
                  {sub.type === 'link' ? 'เปิดลิงก์ผลงาน' : 'โหลดไฟล์ผลงาน'}
                </a>
                
                {sub.status === 'graded' ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-green-500 font-black bg-green-500/10 border border-green-500/20 px-5 py-2.5 rounded-xl">{sub.score} / {asg?.maxScore}</div>
                      {sub.penalty > 0 && <div className="text-xs font-bold text-red-500 mt-1">ถูกหักส่งช้า -{sub.penalty}</div>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleEditGrade(sub.id)} className={`p-2 rounded-lg text-amber-500 transition-colors ${isDark ? 'bg-amber-900/30 hover:bg-amber-900/50' : 'bg-amber-50 hover:bg-amber-100'}`} title="แก้ไขคะแนนใหม่"><Edit size={16}/></button>
                      <button onClick={() => handleRejectSubmission(sub.id)} className={`p-2 rounded-lg text-red-500 transition-colors ${isDark ? 'bg-red-900/30 hover:bg-red-900/50' : 'bg-red-50 hover:bg-red-100'}`} title="ตีกลับ / ยกเลิกการส่ง"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`flex flex-col gap-2 p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <input type="number" id={`score-${sub.id}`} className={`w-20 rounded-lg px-2 py-2 text-center font-bold outline-none border ${isDark ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-white border-slate-300 focus:border-blue-500'}`} placeholder="คะแนน" />
                        <span className="text-slate-500 font-bold w-12">/ {asg?.maxScore}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" id={`penalty-${sub.id}`} className={`w-20 rounded-lg px-2 py-2 text-center font-bold outline-none border ${isDark ? 'bg-slate-800 border-slate-600 text-red-400 focus:border-red-500' : 'bg-white border-red-200 text-red-600 focus:border-red-500'}`} placeholder="หักส่งช้า" defaultValue={isLate ? "1" : "0"} />
                        <button onClick={() => handleGrade(sub.id, asg?.maxScore)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex-1">บันทึก</button>
                      </div>
                    </div>
                    <button onClick={() => handleRejectSubmission(sub.id)} className={`p-3 rounded-xl text-red-500 transition-colors h-full border ${isDark ? 'bg-slate-900 border-slate-700 hover:bg-red-900/30' : 'bg-slate-50 border-slate-200 hover:bg-red-50'}`} title="ตีกลับ / ยกเลิกการส่งเพื่อให้นักเรียนส่งใหม่"><Trash2 size={20}/></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredSubs.length === 0 && <div className="text-center text-slate-500 py-16 font-bold">ไม่พบงานตามเงื่อนไขที่เลือก</div>}
      </div>
    </div>
  );
}

function TeacherExams({ subjects, students, enrollments, exams, setExams, showToast, theme, getUniqueRooms, getUniqueSections }) {
  const [filterSub, setFilterSub] = useState(subjects[0]?.id || '');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [examType, setExamType] = useState('midterm');
  const isDark = theme === 'dark';

  const enrolledIds = enrollments.filter(e => e.subjectId === filterSub).map(e => String(e.studentId).trim());
  const enrolledSts = students.filter(s => enrolledIds.includes(String(s.id).trim()));
  const dynamicRooms = getUniqueRooms();
  const dynamicSections = getUniqueSections(filterRoom);
  
  const targetStudents = enrolledSts
       .filter(s => filterRoom === 'all' || String(s.room || '').trim() === String(filterRoom).trim())
       .filter(s => filterSection === 'all' || String(s.section || '').trim() === String(filterSection).trim());

  const subObj = subjects.find(s => s.id === filterSub);
  const maxScore = examType === 'midterm' ? (subObj?.midtermMax ?? 20) : (subObj?.finalMax ?? 30);
  const examLabel = examType === 'midterm' ? 'กลางภาค' : 'ปลายภาค';

  const getExamRecord = (studentId) => exams.find(e => e.studentId === studentId && e.subjectId === filterSub) || { midterm: '', final: '' };

  const handleBatchSave = () => {
     let updatedExams = [...exams];
     let hasChanges = false;

     targetStudents.forEach(s => {
        const inputEl = document.getElementById(`exam-input-${s.id}`);
        if (!inputEl || inputEl.value === '') return;
        const scoreVal = parseFloat(inputEl.value);
        if (isNaN(scoreVal)) return;

        const existingIdx = updatedExams.findIndex(e => e.studentId === s.id && e.subjectId === filterSub);
        
        if (existingIdx >= 0) {
           updatedExams[existingIdx] = { ...updatedExams[existingIdx], [examType]: scoreVal };
        } else {
           updatedExams.push({ 
             id: `ex${Date.now()}_${s.id}_${Math.random()}`, 
             subjectId: filterSub, 
             studentId: s.id, 
             midterm: examType === 'midterm' ? scoreVal : 0, 
             final: examType === 'final' ? scoreVal : 0 
           });
        }
        hasChanges = true;
     });

     if(hasChanges) {
        setExams(updatedExams);
        showToast(`บันทึกคะแนน ${examLabel} ของทั้งห้องสำเร็จ`);
     } else {
        showToast(`ไม่มีข้อมูลคะแนนใหม่ให้บันทึก`);
     }
  };

  const selectClass = `w-full rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-blue-500 border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <div className={`p-6 rounded-3xl flex gap-4 shadow-sm items-end flex-wrap border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex-1 min-w-[200px]"><label className="block text-sm font-bold mb-2">วิชา</label><select value={filterSub} onChange={e=>{setFilterSub(e.target.value); setFilterRoom('all'); setFilterSection('all');}} className={selectClass}>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="block text-sm font-bold mb-2">ห้อง</label><select value={filterRoom} onChange={e=>{setFilterRoom(e.target.value); setFilterSection('all');}} className={selectClass}><option value="all">ทุกห้อง</option>{dynamicRooms.map(r=><option key={r} value={r}>ห้อง {r}</option>)}</select></div>
          <div><label className="block text-sm font-bold mb-2">ตอน</label><select value={filterSection} onChange={e=>setFilterSection(e.target.value)} className={selectClass} disabled={filterRoom === 'all'}><option value="all">ทุกตอน</option>{dynamicSections.map(s=><option key={s} value={s}>ตอน {s}</option>)}</select></div>
       </div>

       <div className={`rounded-3xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         
         <div className={`p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`flex rounded-xl p-1.5 w-full md:w-auto ${isDark ? 'bg-slate-900' : 'bg-slate-200/60'}`}>
              <button onClick={() => setExamType('midterm')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${examType === 'midterm' ? (isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 shadow-sm') : 'text-slate-500'}`}>สอบกลางภาค</button>
              <button onClick={() => setExamType('final')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${examType === 'final' ? (isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 shadow-sm') : 'text-slate-500'}`}>สอบปลายภาค</button>
            </div>
            <button onClick={handleBatchSave} className="flex items-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md w-full md:w-auto justify-center transition-all"><Save size={18} className="mr-2" /> บันทึกคะแนนทั้งห้อง</button>
         </div>

         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm min-w-[600px]">
             <thead className={`font-bold border-b ${isDark ? 'bg-slate-900/50 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
               <tr>
                 <th className="p-4 w-16 text-center">ห้อง</th>
                 <th className="p-4 w-16 text-center">ตอน</th>
                 <th className="p-4 w-16 text-center">เลขที่</th>
                 <th className="p-4 w-24">รหัส</th>
                 <th className="p-4">ชื่อ-สกุล</th>
                 <th className="p-4 text-center text-blue-500 text-base border-l bg-blue-500/5">คะแนน {examLabel} <br/><span className="text-xs font-normal text-slate-500">(เต็ม {maxScore})</span></th>
               </tr>
             </thead>
             <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
               {targetStudents.map(s => {
                  const rec = getExamRecord(s.id);
                  const currentScore = examType === 'midterm' ? rec.midterm : rec.final;
                  return (
                     <tr key={s.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50/50'}`}>
                       <td className="p-4 text-center font-bold text-slate-500">{s.room}</td>
                       <td className="p-4 text-center font-bold text-slate-500">{s.section || '-'}</td>
                       <td className="p-4 text-center font-bold">{s.number}</td>
                       <td className="p-4 font-mono font-bold text-blue-500">{s.id}</td>
                       <td className="p-4 font-bold">{s.name}</td>
                       <td className="p-4 text-center border-l bg-blue-500/5">
                         <input type="number" id={`exam-input-${s.id}`} defaultValue={currentScore} className={`w-24 p-2.5 text-center rounded-xl font-black text-lg outline-none focus:ring-2 focus:ring-blue-500 border shadow-inner ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`} placeholder="-" />
                       </td>
                     </tr>
                  );
               })}
               {targetStudents.length === 0 && <tr><td colSpan="6" className="text-center p-8 font-bold text-slate-500">ไม่พบนักเรียนในวิชาและห้องนี้</td></tr>}
             </tbody>
           </table>
         </div>
       </div>
    </div>
  );
}

function TeacherSummary({ subjects, students, assignments, submissions, exams, behaviors, enrollments, showToast, theme, getUniqueRooms, getUniqueSections }) {
  const [filterSub, setFilterSub] = useState(subjects[0]?.id || '');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const isDark = theme === 'dark';

  const subObj = subjects.find(s => s.id === filterSub);
  const maxMid = subObj?.midtermMax ?? 20;
  const maxFin = subObj?.finalMax ?? 30;

  const targetAsgs = assignments.filter(a => a.subjectId === filterSub);
  const enrolledIds = enrollments.filter(e => e.subjectId === filterSub).map(e => String(e.studentId).trim());
  const enrolledSts = students.filter(s => enrolledIds.includes(String(s.id).trim()));
  const dynamicRooms = getUniqueRooms();
  const dynamicSections = getUniqueSections(filterRoom);
  
  const targetSts = enrolledSts
      .filter(s => filterRoom === 'all' || String(s.room || '').trim() === String(filterRoom).trim())
      .filter(s => filterSection === 'all' || String(s.section || '').trim() === String(filterSection).trim());

  const matrix = targetSts.map(stu => {
    let asgTotal = 0;
    const scores = targetAsgs.reduce((acc, asg) => {
      const sub = submissions.find(s => s.studentId === stu.id && s.assignmentId === asg.id);
      const score = (sub && sub.status === 'graded') ? sub.score : 0;
      asgTotal += score; acc[asg.id] = score; return acc;
    }, {});
    
    const examRec = exams.find(e => e.studentId === stu.id && e.subjectId === filterSub) || { midterm: 0, final: 0 };
    const behaviorTotal = behaviors.filter(b => b.subjectId === filterSub && b.studentId === stu.id).reduce((sum, b) => sum + b.points, 0);
    const grandTotal = asgTotal + (examRec.midterm || 0) + (examRec.final || 0);

    return { ...stu, scores, asgTotal, mid: examRec.midterm || 0, fin: examRec.final || 0, behaviorTotal, grandTotal };
  });

  const maxAsgTotal = targetAsgs.reduce((sum, asg) => sum + asg.maxScore, 0);
  const maxGrandTotal = maxAsgTotal + maxMid + maxFin;

  const handleExport = () => {
    let csv = '\uFEFF'; 
    csv += `สรุปคะแนน วิชา ${subObj?.name} (${subObj?.code}) - เทอม ${subObj?.semester}/${subObj?.year}\n`;
    csv += 'ห้อง,ตอน,เลขที่,รหัส,ชื่อ-สกุล,';
    targetAsgs.forEach(a => csv += `"${a.title} (${a.maxScore})",`);
    csv += `รวมงาน (${maxAsgTotal}),กลางภาค (${maxMid}),ปลายภาค (${maxFin}),รวมสุทธิ (${maxGrandTotal}),พฤติกรรม\n`;

    matrix.forEach(row => {
      csv += `="${row.room}","${row.section || ''}",${row.number},="${row.id}","${row.name}",`;
      targetAsgs.forEach(a => csv += `${row.scores[a.id]},`);
      csv += `${row.asgTotal},${row.mid},${row.fin},${row.grandTotal},${row.behaviorTotal}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Score_${subObj?.code}_Room_${filterRoom}.csv`; link.click();
    showToast('ดาวน์โหลดไฟล์ Excel (.csv) สำเร็จ');
  };

  const selectClass = `font-bold rounded-xl p-3 outline-none border flex-1 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
    <div className="max-w-full mx-auto space-y-6 flex flex-col h-[calc(100vh-100px)]">
      <div className={`p-5 rounded-3xl flex flex-wrap gap-4 items-center justify-between shadow-sm shrink-0 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <div className="flex gap-4 w-full md:w-auto">
           <select value={filterSub} onChange={e => {setFilterSub(e.target.value); setFilterRoom('all'); setFilterSection('all');}} className={selectClass}><option value="">-- เลือกวิชา --</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
           <select value={filterRoom} onChange={e => {setFilterRoom(e.target.value); setFilterSection('all');}} className={selectClass}><option value="all">ทุกห้อง</option>{dynamicRooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}</select>
           <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={selectClass} disabled={filterRoom === 'all'}><option value="all">ทุกตอน</option>{dynamicSections.map(s => <option key={s} value={s}>ตอน {s}</option>)}</select>
         </div>
         <button onClick={handleExport} className="flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md w-full md:w-auto justify-center transition-colors"><DownloadCloud size={18} className="mr-2" /> ส่งออก Excel</button>
      </div>
      <div className={`border rounded-3xl overflow-hidden flex-1 flex flex-col shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm min-w-max border-collapse">
            <thead className={`font-bold sticky top-0 z-10 border-b shadow-sm ${isDark ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              <tr>
                <th className={`p-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`} rowSpan="2">ห้อง</th>
                <th className={`p-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`} rowSpan="2">ตอน</th>
                <th className={`p-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`} rowSpan="2">เลขที่</th>
                <th className={`p-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`} rowSpan="2">รหัส / ชื่อ-สกุล</th>
                <th className={`p-2 text-center border-r border-b ${isDark ? 'border-slate-700 bg-blue-900/20' : 'border-slate-200 bg-blue-50/50'}`} colSpan={targetAsgs.length || 1}>คะแนนเก็บ (งาน)</th>
                <th className={`p-2 text-center border-r border-b ${isDark ? 'border-slate-700 bg-amber-900/20 text-amber-500' : 'border-slate-200 bg-amber-50 text-amber-700'}`} colSpan="2">คะแนนสอบ</th>
                <th className={`p-4 text-center border-r ${isDark ? 'border-slate-700 bg-slate-900/80 text-white' : 'border-slate-200 bg-slate-100 text-slate-800'}`} rowSpan="2">รวมสุทธิ<br/><span className="text-xs font-normal">(เต็ม {maxGrandTotal})</span></th>
                <th className={`p-4 text-center ${isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'}`} rowSpan="2">พฤติกรรม<br/><span className="text-xs font-normal">(คะแนนพิเศษ)</span></th>
              </tr>
              <tr>
                {targetAsgs.length === 0 && <th className={`p-2 text-center border-r ${isDark ? 'border-slate-700 bg-blue-900/20' : 'border-slate-200 bg-blue-50/50'}`}>-</th>}
                {targetAsgs.map(a => <th key={a.id} className={`p-2 text-center border-r text-xs ${isDark ? 'border-slate-700 bg-blue-900/20' : 'border-slate-200 bg-blue-50/50'}`}><div className="truncate w-20 mx-auto" title={a.title}>{a.title}</div><div className="text-blue-500 mt-1 font-bold">เต็ม {a.maxScore}</div></th>)}
                <th className={`p-2 text-center border-r text-xs ${isDark ? 'border-slate-700 bg-amber-900/20 text-amber-400' : 'border-slate-200 bg-amber-50 text-amber-600'}`}>กลางภาค ({maxMid})</th>
                <th className={`p-2 text-center border-r text-xs ${isDark ? 'border-slate-700 bg-amber-900/20 text-amber-400' : 'border-slate-200 bg-amber-50 text-amber-600'}`}>ปลายภาค ({maxFin})</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
              {matrix.map((row) => (
                <tr key={row.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50/40'}`}>
                  <td className={`p-4 text-center font-bold border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{row.room}</td>
                  <td className={`p-4 text-center font-bold border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{row.section || '-'}</td>
                  <td className={`p-4 text-center border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{row.number}</td>
                  <td className={`p-4 font-bold border-r whitespace-nowrap ${isDark ? 'border-slate-700' : 'border-slate-100'}`}><span className="text-blue-500 mr-2 font-mono">{row.id}</span>{row.name}</td>
                  {targetAsgs.length === 0 && <td className={`p-4 text-center border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>-</td>}
                  {targetAsgs.map(a => <td key={a.id} className={`p-4 text-center font-black border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{row.scores[a.id] > 0 ? <span className="text-emerald-500">{row.scores[a.id]}</span> : <span className="text-slate-500">-</span>}</td>)}
                  <td className={`p-4 text-center font-black text-amber-500 border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{row.mid > 0 ? row.mid : '-'}</td>
                  <td className={`p-4 text-center font-black text-amber-500 border-r ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>{row.fin > 0 ? row.fin : '-'}</td>
                  <td className={`p-4 text-center font-black text-blue-500 text-lg border-r shadow-[-2px_0_5px_rgba(0,0,0,0.02)] sticky right-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>{row.grandTotal}</td>
                  <td className="p-4 text-center font-black text-lg"><span className={row.behaviorTotal > 0 ? 'text-green-500' : row.behaviorTotal < 0 ? 'text-red-500' : 'text-slate-500'}>{row.behaviorTotal > 0 ? `+${row.behaviorTotal}` : row.behaviorTotal}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeacherProfile({ teacherProfile, setTeacherProfile, dbUrl, setDbUrl, showToast, theme, setTheme }) {
  const [form, setForm] = useState({ name: teacherProfile.name, password: teacherProfile.password, confirm: teacherProfile.password });
  const [urlInput, setUrlInput] = useState(dbUrl);
  const [profileImg, setProfileImg] = useState(teacherProfile.profileImg);
  const isDark = theme === 'dark';

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    showToast('กำลังบันทึกรูปภาพ... กรุณารอสักครู่');
    const resized = await resizeImage(file);
    if (resized) {
      setProfileImg(resized);
      setTeacherProfile({ ...teacherProfile, profileImg: resized });
      showToast('อัปเดตรูปประจำตัวสำเร็จแล้ว');
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if(form.password !== form.confirm) return showToast('รหัสผ่านไม่ตรงกัน');
    setTeacherProfile({ ...teacherProfile, name: form.name, password: form.password }); showToast('อัปเดตข้อมูลแอดมินสำเร็จ');
  }

  const handleSaveDb = async (e) => {
    e.preventDefault();
    if (!urlInput.includes('/exec')) return showToast('URL ไม่ถูกต้อง (ต้องลงท้ายด้วย /exec)');
    
    showToast('กำลังทดสอบการเชื่อมต่อและดึงข้อมูล...');
    try {
      const res = await fetch(urlInput);
      const rawData = await res.text();
      
      if (rawData.trim().startsWith('<')) {
        return showToast('การเชื่อมต่อถูกปฏิเสธ: โปรดตรวจสอบว่าตั้งค่าสิทธิ์ Anyone (ทุกคน) หรือยัง');
      }
      
      setDbUrl(urlInput);
      safeSetItem('kasem_db_url', urlInput);
      showToast('เชื่อมต่อและดึงข้อมูลกลับมาสำเร็จ!');
    } catch (err) {
      showToast('URL ไม่ถูกต้อง หรือไม่สามารถเชื่อมต่อได้');
    }
  }

  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
     <div className="max-w-4xl mx-auto space-y-8 pb-10">
       <div className={`border rounded-3xl p-6 shadow-sm flex items-center justify-between ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <div><h3 className="text-xl font-black mb-1 flex items-center"><Moon className="mr-3 text-blue-500"/> รูปแบบหน้าจอ (Theme)</h3><p className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ปรับโทนสีสว่าง/มืดตามอุปกรณ์</p></div>
         <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-4 rounded-full font-bold shadow-md transition-all ${isDark ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-white'}`}>{theme === 'dark' ? <Sun size={24}/> : <Moon size={24}/>}</button>
       </div>

       <div className={`border rounded-3xl p-6 md:p-8 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <h3 className="text-xl font-black mb-6 flex items-center border-b pb-4"><Cloud className="mr-3 text-blue-500"/> ฐานข้อมูล (Google Sheets)</h3>
         <form onSubmit={handleSaveDb} className="flex flex-col md:flex-row gap-4">
            <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="วางลิงก์ Web App URL จาก Google Apps Script (ลงท้ายด้วย /exec)" className={inputClass} />
            <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md whitespace-nowrap">บันทึก & ดึงข้อมูล</button>
         </form>
         <p className={`text-xs mt-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>* ระบบจะไม่เด้งออกแล้วเมื่อกดบันทึก ข้อมูลทั้งหมดจะซิงค์กลับมาให้ทันทีเบื้องหลัง</p>
       </div>

       <div className={`border rounded-3xl p-6 md:p-8 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <h3 className="text-xl font-black mb-6 flex items-center border-b pb-4"><Settings className="mr-3 text-blue-500"/> โปรไฟล์และการตั้งค่าแอดมิน</h3>
         <div className="flex flex-col md:flex-row gap-8">
            <div className="shrink-0 flex flex-col items-center">
               <div className={`w-32 h-32 rounded-full border-4 shadow-lg relative group overflow-hidden flex justify-center items-center ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-white'}`}>
                  {profileImg ? <img src={getValidImgUrl(profileImg)} className="w-full h-full object-cover rounded-full" /> : <User size={48} className="text-slate-400"/>}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><Camera className="text-white" size={32} /><input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer"/></div>
               </div>
               <span className="text-xs font-bold text-slate-400 mt-3">คลิกที่รูปเพื่อเปลี่ยน</span>
            </div>
            <form onSubmit={handleSaveProfile} className="flex-1 space-y-5">
               <div><label className="block text-sm font-bold mb-2">ชื่อผู้สอน (แสดงผล)</label><input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className={inputClass} /></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-sm font-bold mb-2">รหัสผ่าน</label><input type="password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} className={inputClass} /></div>
                  <div><label className="block text-sm font-bold mb-2">ยืนยันรหัสผ่าน</label><input type="password" value={form.confirm} onChange={e=>setForm({...form, confirm: e.target.value})} className={inputClass} /></div>
               </div>
               <div className="pt-2 flex justify-end"><button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md">บันทึกข้อมูล</button></div>
            </form>
         </div>
       </div>
     </div>
  );
}

// ==========================================
// STUDENT VIEWS
// ==========================================
function StudentView(props) {
  switch(props.activeTab) {
    case 'dashboard': return <StudentDashboard {...props} />;
    case 'announcements': return <StudentAnnouncements {...props} />;
    case 'materials': return <StudentMaterials {...props} />;
    case 'assignments': return <StudentAssignments {...props} />;
    case 'scores': return <StudentScores {...props} />;
    case 'attendance': return <StudentAttendance {...props} />;
    case 'profile': return <StudentProfile {...props} />;
    default: return <StudentDashboard {...props} />;
  }
}

function StudentDashboard({ student, subjects, assignments, submissions, setActiveTab, theme }) {
  const isDark = theme === 'dark';
  const pendingAsgs = assignments.filter(a => !submissions.find(s => s.assignmentId === a.id && String(s.studentId).trim() === String(student.id).trim()));
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={`rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start text-center md:text-left shadow-lg relative overflow-hidden bg-gradient-to-br ${isDark ? 'from-blue-900 to-indigo-900 border border-blue-800' : 'from-blue-600 to-cyan-500 border border-blue-500'}`}>
        <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-white/30 flex items-center justify-center text-4xl font-black text-white shrink-0 mb-4 md:mb-0 shadow-lg relative z-10 overflow-hidden">
          {student.profileImg ? <img src={getValidImgUrl(student.profileImg)} className="w-full h-full object-cover rounded-full"/> : student.name.charAt(0)}
        </div>
        <div className="md:ml-8 relative z-10 text-white">
          <h2 className="text-3xl font-black mb-3">{student.name}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-xl font-mono font-bold text-sm shadow-sm border border-white/10">รหัส {student.id}</span>
            <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-xl font-bold text-sm shadow-sm border border-white/10">ห้อง {student.room} {student.section ? `(${student.section})` : ''} | เลขที่ {student.number}</span>
          </div>
          <p className="text-sm font-bold mt-5 flex items-center justify-center md:justify-start"><Layers size={16} className="mr-2"/> ลงทะเบียนเรียน {subjects.length} วิชา</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8">
        <div className={`p-8 rounded-3xl border flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm hover:border-amber-500 group relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} onClick={() => setActiveTab('assignments')}>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><AlertCircle size={100}/></div>
          <AlertCircle className="text-amber-500 mb-4" size={40} />
          <h3 className="text-xl font-black">งานที่ยังไม่ส่ง</h3>
          <p className="text-5xl font-black text-amber-500 mt-2">{pendingAsgs.length} <span className="text-lg font-bold opacity-60">ชิ้น</span></p>
        </div>
        <div className={`p-8 rounded-3xl border flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm hover:border-emerald-500 group relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} onClick={() => setActiveTab('scores')}>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><BarChart2 size={100}/></div>
          <BarChart2 className="text-emerald-500 mb-4" size={40} />
          <h3 className="text-xl font-black">สรุปคะแนน</h3>
          <p className={`text-sm font-bold mt-4 px-5 py-2.5 rounded-xl ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>คลิกเพื่อดูคะแนน</p>
        </div>
      </div>
    </div>
  );
}

function StudentAnnouncements({ student, subjects, announcements, theme }) {
  const isDark = theme === 'dark';
  const mySubIds = subjects.map(s => s.id);
  
  const visibleAnnouncements = announcements.filter(ann => {
    if (ann.targetSubject && ann.targetSubject !== 'all' && !mySubIds.includes(ann.targetSubject)) return false;
    if (ann.targetRoom && ann.targetRoom !== 'all' && String(ann.targetRoom).trim() !== String(student.room).trim()) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-black border-l-4 border-blue-500 pl-4 mb-6">ประกาศข่าวสาร</h2>
      <div className="space-y-5">
        {visibleAnnouncements.map(ann => (
          <div key={ann.id} className={`p-6 md:p-8 rounded-3xl shadow-sm border border-l-8 border-l-blue-500 flex flex-col md:flex-row gap-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            {ann.imageUrl && (
              <div className="w-full md:w-64 h-40 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={getValidImgUrl(ann.imageUrl)} alt="Announcement" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/>
              </div>
            )}
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-black mb-3 text-blue-600 dark:text-blue-400">{ann.title}</h3>
              <p className={`whitespace-pre-wrap font-medium mb-5 flex-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{ann.content}</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto">
                <div className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Clock size={14} className="mr-1"/> {ann.date}
                </div>
                {ann.linkUrl && (
                  <a href={ann.linkUrl.startsWith('http') ? ann.linkUrl : `https://${ann.linkUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-colors shadow-sm">
                    <ExternalLink size={14} className="mr-2"/> เปิดลิงก์แนบ
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {visibleAnnouncements.length === 0 && <div className={`text-center py-16 rounded-3xl border font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>ยังไม่มีประกาศข่าวสารใหม่</div>}
      </div>
    </div>
  );
}

function StudentMaterials({ subjects, materials, theme }) {
  const [searchQuery, setSearchQuery] = useState('');
  const isDark = theme === 'dark';
  const mySubIds = subjects.map(s => s.id);
  const myMats = materials.filter(m => 
    mySubIds.includes(m.subjectId) && 
    (String(m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
     String(m.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
         <h2 className="text-2xl font-black border-l-4 border-blue-500 pl-4">คลังสื่อการเรียน / ใบงาน</h2>
         <div className="relative w-full sm:w-auto">
           <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
           <input type="text" placeholder="ค้นหาใบงาน..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`pl-10 pr-4 py-2.5 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
         </div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
         {myMats.map(m => {
            const sub = subjects.find(s => s.id === m.subjectId);
            return (
              <div key={m.id} className={`p-6 rounded-3xl shadow-sm flex flex-col justify-between border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div>
                  <div className="text-xs bg-blue-500/10 text-blue-500 font-bold px-3 py-1.5 rounded-lg inline-block mb-3">{sub?.name}</div>
                  <h4 className="font-black text-xl">{m.title}</h4>
                  <p className={`text-sm my-3 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{m.description}</p>
                </div>
                <div className={`mt-4 pt-4 border-t text-right ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <a href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"><DownloadCloud size={16} className="mr-2"/> เปิดดูเอกสาร</a>
                </div>
              </div>
            )
         })}
         {myMats.length === 0 && <div className={`col-span-full text-center py-16 rounded-3xl border font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>ไม่พบใบงานที่ค้นหา</div>}
       </div>
    </div>
  );
}

function StudentAssignments({ student, assignments, submissions, setSubmissions, subjects, showToast, dbUrl, theme }) {
  const [selectedAsg, setSelectedAsg] = useState(null);
  const [file, setFile] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [submitMode, setSubmitMode] = useState('file'); // 'file' or 'link'
  const [isUploading, setIsUploading] = useState(false);
  const [filterSub, setFilterSub] = useState('all');
  const isDark = theme === 'dark';

  const validAssignments = assignments.filter(a => {
    if (a.targetRoom && a.targetRoom !== 'all' && String(a.targetRoom).trim() !== String(student.room).trim()) return false;
    return true;
  });

  const filteredAsgs = filterSub === 'all' ? validAssignments : validAssignments.filter(a => a.subjectId === filterSub);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitMode === 'link') {
      if (!linkInput) return showToast('กรุณากรอกลิงก์ผลงาน');
      if (!linkInput.startsWith('http://') && !linkInput.startsWith('https://')) return showToast('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
      
      setSubmissions([...submissions, { id: `s${Date.now()}`, assignmentId: selectedAsg.id, studentId: String(student.id).trim(), status: 'submitted', score: null, fileUrl: linkInput, type: 'link', submittedAt: new Date().toLocaleString('th-TH'), submittedAtISO: new Date().toISOString() }]);
      showToast('ส่งงานในรูปแบบลิงก์เรียบร้อยแล้ว');
      setSelectedAsg(null); setLinkInput('');
      return;
    }

    if (!file) return showToast('กรุณาเลือกไฟล์');
    if (!dbUrl) return showToast('ระบบไม่ได้เชื่อมต่อฐานข้อมูล ครูผู้สอนยังไม่ได้เปิดระบบอัปโหลด');
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const payload = { action: 'uploadSubmission', filename: `${student.id}_${file.name}`, mimeType: file.type, fileData: base64 };
      try {
        const res = await fetch(dbUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if(data.url) {
          setSubmissions([...submissions, { id: `s${Date.now()}`, assignmentId: selectedAsg.id, studentId: String(student.id).trim(), status: 'submitted', score: null, fileUrl: data.url, type: 'file', submittedAt: new Date().toLocaleString('th-TH'), submittedAtISO: new Date().toISOString() }]);
          showToast('ส่งงานเรียบร้อย บันทึกไฟล์ลง Google Drive สำเร็จ');
          setSelectedAsg(null); setFile(null);
        }
      } catch (error) { showToast('อัปโหลดล้มเหลว กรุณาลองใหม่'); } finally { setIsUploading(false); }
    };
  };

  const selectClass = `font-bold rounded-xl p-3 outline-none border focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-2xl font-black border-l-4 border-blue-500 pl-4">งานที่ต้องส่ง</h3>
        <select value={filterSub} onChange={e => setFilterSub(e.target.value)} className={selectClass}><option value="all">ทุกวิชา</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>

      <div className="space-y-5">
        {filteredAsgs.map(asg => {
          const subObj = subjects.find(s => s.id === asg.subjectId);
          const sub = submissions.find(s => s.assignmentId === asg.id && String(s.studentId).trim() === String(student.id).trim());
          return (
            <div key={asg.id} className={`rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row justify-between gap-6 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              
              {asg.imageUrl && (
                <div className="w-full lg:w-56 h-48 lg:h-40 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={getValidImgUrl(asg.imageUrl)} alt="Assignment" className="w-full h-full object-cover"/>
                </div>
              )}
              
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg mb-3 self-start">{subObj?.name}</span>
                <h4 className="text-2xl font-black mb-3 text-blue-600 dark:text-blue-400">{asg.title}</h4>
                <p className={`text-sm font-bold mb-5 p-4 rounded-xl border flex-1 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{asg.description}</p>
                
                <div className="mb-5 flex flex-wrap gap-2">
                  {asg.linkUrl && (
                     <a href={asg.linkUrl.startsWith('http') ? asg.linkUrl : `https://${asg.linkUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-colors shadow-sm"><ExternalLink size={14} className="mr-2"/> เปิดลิงก์ที่ครูแนบไว้</a>
                  )}
                  {asg.imageUrl && (
                     <a href={asg.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 px-4 py-2 rounded-xl transition-colors shadow-sm"><DownloadCloud size={14} className="mr-2"/> เปิดดู/โหลดไฟล์แนบ</a>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mt-auto">
                  <span className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center shadow-sm border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}><Clock size={14} className="mr-2 text-amber-500"/> กำหนดส่ง: {asg.dueDate}</span>
                  <span className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center shadow-sm border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}><BarChart2 size={14} className="mr-2 text-emerald-500"/> เต็ม: {asg.maxScore}</span>
                </div>
              </div>

              <div className={`flex flex-col justify-center min-w-[200px] border-t lg:border-t-0 lg:border-l pt-5 lg:pt-0 lg:pl-6 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                {sub ? (
                  sub.status === 'graded' ? (
                     <div className="text-center w-full">
                        <div className="text-xs font-bold text-emerald-500 mb-2 uppercase tracking-wide">ตรวจแล้ว</div>
                        <div className="text-4xl font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-5 py-4 rounded-2xl">{sub.score} <span className="text-base font-bold opacity-50">/ {asg.maxScore}</span></div>
                        {sub.penalty > 0 && <div className="text-xs font-bold text-red-500 mt-2">หักคะแนนส่งช้า -{sub.penalty}</div>}
                     </div>
                  ) : (<div className="w-full px-5 py-6 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-base font-black flex items-center justify-center"><Clock size={20} className="mr-2" /> ส่งแล้ว รอตรวจ</div>)
                ) : (
                  <button onClick={() => { setSelectedAsg(asg); setSubmitMode('file'); }} className="w-full px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md transition-all text-lg flex justify-center items-center"><Upload size={18} className="mr-2"/> ส่งงานนี้</button>
                )}
              </div>
            </div>
          );
        })}
        {filteredAsgs.length === 0 && <div className={`text-center py-16 rounded-3xl border font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>เย่! ไม่มีงานที่ต้องส่งในขณะนี้</div>}
      </div>

      {selectedAsg && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className={`rounded-3xl w-full max-w-lg p-8 shadow-2xl relative border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setSelectedAsg(null)} className={`absolute top-5 right-5 p-2 rounded-full ${isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'} transition-colors`}><X size={20}/></button>
            <h3 className="text-2xl font-black mb-2">อัปโหลดส่งงาน</h3>
            <h4 className="text-blue-500 font-bold mb-6 pb-4 border-b border-slate-700/50 text-lg">{selectedAsg.title}</h4>
            
            <div className={`flex rounded-xl p-1.5 mb-6 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <button onClick={() => setSubmitMode('file')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center transition-all ${submitMode === 'file' ? (isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}><Upload size={16} className="mr-2"/> อัปโหลดไฟล์</button>
              <button onClick={() => setSubmitMode('link')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center transition-all ${submitMode === 'link' ? (isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}><Link2 size={16} className="mr-2"/> ส่งเป็นลิงก์</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {submitMode === 'file' ? (
                <div className={`border-2 border-dashed rounded-2xl p-10 text-center relative cursor-pointer hover:border-blue-500 transition-colors ${isDark ? 'border-slate-600 bg-slate-900/50' : 'border-slate-300 bg-slate-50'}`}>
                  <input type="file" required onChange={(e) => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <Upload size={40} className="mx-auto text-blue-500 mb-4" />
                  <p className="font-bold text-lg">{file ? file.name : 'คลิกเลือกไฟล์ / ลากมาวาง'}</p>
                  <p className={`text-sm font-bold mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>รองรับไฟล์รูปภาพ, PDF, Word ฯลฯ</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-bold">วางลิงก์ผลงาน (เช่น YouTube, Drive, Canva, Padlet)</label>
                  <input type="url" required value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="https://..." className={`w-full rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                  <p className={`text-xs font-bold mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>* โปรดตรวจสอบให้แน่ใจว่าลิงก์เปิดเป็นสาธารณะ (Public) แล้ว</p>
                </div>
              )}

              <button type="submit" disabled={(submitMode === 'file' && !file) || isUploading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold disabled:opacity-50 shadow-md text-lg flex justify-center items-center transition-colors">
                {isUploading ? <><RefreshCw size={20} className="mr-2 animate-spin"/> กำลังอัปโหลด...</> : 'ยืนยันการส่งงาน'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentScores({ student, subjects, assignments, submissions, theme }) {
  const isDark = theme === 'dark';
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h3 className="text-2xl font-black border-l-4 border-blue-500 pl-4 mb-6">สรุปคะแนนแยกรายวิชา</h3>
      {subjects.map(sub => {
        const subAsgs = assignments.filter(a => a.subjectId === sub.id);
        if(subAsgs.length === 0) return null;
        let totalScore = 0; let maxTotal = 0;
        
        return (
          <div key={sub.id} className={`rounded-3xl overflow-hidden mb-6 shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-5 md:p-6 border-b flex justify-between items-center ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div><span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg mr-3">{sub.code}</span><span className="text-xl font-black">{sub.name}</span></div>
              <div className={`text-sm font-bold px-4 py-1.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>เทอม {sub.semester}/{sub.year}</div>
            </div>
            <table className="w-full text-left text-sm font-bold">
              <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {subAsgs.map(asg => {
                  maxTotal += asg.maxScore;
                  const subM = submissions.find(s => s.assignmentId === asg.id && String(s.studentId).trim() === String(student.id).trim());
                  const score = (subM && subM.status === 'graded') ? subM.score : 0;
                  totalScore += score;
                  return (
                    <tr key={asg.id} className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-5">{asg.title}</td>
                      <td className="p-5 text-right">{subM && subM.status === 'graded' ? <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{score} / {asg.maxScore}</span> : <span className="text-slate-500">- / {asg.maxScore}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="p-6 bg-blue-600 flex justify-between items-center text-white">
              <span className="font-bold text-lg">คะแนนรวมวิชานี้</span>
              <span className="text-3xl font-black">{totalScore} <span className="text-xl font-bold opacity-70">/ {maxTotal}</span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentAttendance({ student, subjects, attendance, behaviors, theme }) {
  const isDark = theme === 'dark';
  const studentAtt = attendance.filter(a => String(a.studentId).trim() === String(student.id).trim());
  const studentBeh = behaviors.filter(b => String(b.studentId).trim() === String(student.id).trim());
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h3 className="text-2xl font-black border-l-4 border-blue-500 pl-4 mb-6">สถิติการเข้าเรียน & พฤติกรรม</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {subjects.map(sub => {
          const subAtt = studentAtt.filter(a => a.subjectId === sub.id);
          const present = subAtt.filter(a => a.status === 'present').length;
          const late = subAtt.filter(a => a.status === 'late').length;
          const absent = subAtt.filter(a => a.status === 'absent').length;
          const bTotal = studentBeh.filter(b => b.subjectId === sub.id).reduce((sum, b) => sum + b.points, 0);
          
          return (
            <div key={sub.id} className={`p-8 rounded-3xl shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
               <h4 className="text-xl font-black mb-2">{sub.name}</h4>
               <p className={`text-xs font-bold mb-6 px-3 py-1 rounded-lg inline-block border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{sub.code} | เทอม {sub.semester}/{sub.year}</p>
               <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="bg-green-500/10 border border-green-500/20 py-4 rounded-2xl text-green-500"><span className="block text-xs font-bold mb-1">มา</span><span className="text-3xl font-black">{present}</span></div>
                  <div className="bg-amber-500/10 border border-amber-500/20 py-4 rounded-2xl text-amber-500"><span className="block text-xs font-bold mb-1">สาย</span><span className="text-3xl font-black">{late}</span></div>
                  <div className="bg-red-500/10 border border-red-500/20 py-4 rounded-2xl text-red-500"><span className="block text-xs font-bold mb-1">ขาด</span><span className="text-3xl font-black">{absent}</span></div>
               </div>
               <div className={`p-4 rounded-2xl text-center font-black text-lg border ${bTotal > 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : bTotal < 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : (isDark ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200')}`}>
                 คะแนนพฤติกรรม: {bTotal > 0 ? `+${bTotal}` : bTotal}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentProfile({ student, students, setStudents, showToast, dbUrl, theme, saveState }) {
  const [pwdForm, setPwdForm] = useState({ old: '', new: '', confirm: '' });
  const [profileImg, setProfileImg] = useState(student.profileImg);
  
  const [contactForm, setContactForm] = useState({
     studentPhone: student.studentPhone || '',
     parentPhone: student.parentPhone || '',
     parentRelation: student.parentRelation || ''
  });

  const isDark = theme === 'dark';

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    showToast('กำลังบันทึกรูปภาพ... กรุณารอสักครู่');
    const resized = await resizeImage(file);
    if (resized) {
      setProfileImg(resized);
      setStudents(students.map(s => s.id === student.id ? { ...s, profileImg: resized } : s));
      showToast('อัปเดตรูปประจำตัวสำเร็จ');
    }
  };

  const handleChangePwd = (e) => {
    e.preventDefault();
    const currentPwd = student.password ? String(student.password) : '12345678';
    
    if (pwdForm.old !== currentPwd) return showToast('รหัสผ่านเดิมไม่ถูกต้อง');
    if (pwdForm.new !== pwdForm.confirm) return showToast('รหัสผ่านใหม่ไม่ตรงกัน');
    
    setStudents(students.map(s => s.id === student.id ? { ...s, password: pwdForm.new } : s));
    showToast('เปลี่ยนรหัสผ่านสำเร็จ'); 
    setPwdForm({ old: '', new: '', confirm: '' });
  };
  
  const handleSaveContact = (e) => {
     e.preventDefault();
     const updatedStudents = students.map(s => String(s.id).trim() === String(student.id).trim() ? { ...s, ...contactForm } : s);
     saveState({ students: updatedStudents });
     showToast('บันทึกข้อมูลติดต่อของคุณสำเร็จแล้ว');
  };

  const inputClass = `w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex flex-col md:flex-row gap-6">
       
       <div className="md:w-1/3 flex flex-col gap-6">
           <div className={`rounded-3xl p-8 shadow-sm text-center relative overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
             <div className="absolute top-0 left-0 w-full h-32 bg-blue-600"></div>
             <div className={`w-32 h-32 mx-auto rounded-full border-4 shadow-lg relative group overflow-hidden mt-12 flex justify-center items-center z-10 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-white'}`}>
                {profileImg ? <img src={getValidImgUrl(profileImg)} className="w-full h-full object-cover rounded-full" /> : <User size={48} className="text-slate-400"/>}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="text-white" size={32} /><input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer"/></div>
             </div>
             <h3 className="text-2xl font-black mt-4 relative z-10">{student.name}</h3>
             <p className="text-blue-500 font-bold text-sm relative z-10 mb-2">รหัส {student.id}</p>
             <div className="mt-4"><label className="cursor-pointer inline-flex items-center px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-colors"><Camera size={18} className="mr-2" /> เปลี่ยนรูปประจำตัว<input type="file" accept="image/*" onChange={handleImageChange} className="hidden" /></label></div>
           </div>

           <div className={`rounded-3xl p-6 shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
             <h4 className="font-bold text-slate-500 text-sm mb-4">ข้อมูลนักเรียน (เปลี่ยนไม่ได้)</h4>
             <div className="space-y-3 font-bold">
                <div className={`flex justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}><span className="text-slate-500">ห้อง</span><span>{student.room}</span></div>
                <div className={`flex justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}><span className="text-slate-500">เลขที่</span><span>{student.number}</span></div>
                <div className={`flex justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}><span className="text-slate-500">ตอน</span><span>{student.section || '-'}</span></div>
             </div>
           </div>
       </div>

       <div className="md:w-2/3 flex flex-col gap-6">
           <form onSubmit={handleSaveContact} className={`rounded-3xl p-8 shadow-sm space-y-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
             <h3 className="text-xl font-black mb-6 flex items-center border-b pb-4"><User className="mr-3 text-blue-500"/> ข้อมูลการติดต่อ</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-sm font-bold mb-2">เบอร์โทรศัพท์ของคุณ (นักเรียน)</label><input type="text" value={contactForm.studentPhone} onChange={e=>setContactForm({...contactForm, studentPhone: e.target.value})} className={inputClass} placeholder="08x-xxx-xxxx" /></div>
                <div><label className="block text-sm font-bold mb-2">เบอร์โทรศัพท์ผู้ปกครอง</label><input type="text" value={contactForm.parentPhone} onChange={e=>setContactForm({...contactForm, parentPhone: e.target.value})} className={inputClass} placeholder="08x-xxx-xxxx" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-bold mb-2">ความสัมพันธ์ผู้ปกครอง (เช่น บิดา, มารดา, ป้า, ปู่, พี่)</label><input type="text" value={contactForm.parentRelation} onChange={e=>setContactForm({...contactForm, parentRelation: e.target.value})} className={inputClass} /></div>
             </div>
             <div className="pt-2 flex justify-end"><button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all">บันทึกข้อมูลติดต่อ</button></div>
           </form>

           <form onSubmit={handleChangePwd} className={`rounded-3xl p-8 shadow-sm space-y-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
             <h3 className="text-xl font-black mb-6 flex items-center border-b pb-4"><Settings className="mr-3 text-blue-500"/> เปลี่ยนรหัสผ่าน</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <div className="md:col-span-2"><label className="block text-sm font-bold mb-2">รหัสผ่านเดิม</label><input required type="password" value={pwdForm.old} onChange={e=>setPwdForm({...pwdForm, old: e.target.value})} className={inputClass} /></div>
               <div><label className="block text-sm font-bold mb-2">รหัสผ่านใหม่</label><input required type="password" value={pwdForm.new} onChange={e=>setPwdForm({...pwdForm, new: e.target.value})} className={inputClass} /></div>
               <div><label className="block text-sm font-bold mb-2">ยืนยันรหัสผ่านใหม่</label><input required type="password" value={pwdForm.confirm} onChange={e=>setPwdForm({...pwdForm, confirm: e.target.value})} className={inputClass} /></div>
             </div>
             <div className="pt-2 flex justify-end"><button type="submit" className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-md transition-all">อัปเดตรหัสผ่าน</button></div>
           </form>
       </div>

    </div>
  );
}