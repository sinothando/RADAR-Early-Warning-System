import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Redirect, Link, Route, Switch, useLocation } from 'wouter';
import { useUser } from '@clerk/react';
import { createStudent, deleteStudent, listStudents, updateStudent } from '@workspace/api-client-react';
import {
  AuthProviders, HomeRedirect, InvitationSignUpPage, RequireSupportAccess,
  SignInPage, SupportAccountControls, SupportSidebarProfile, SupportTeamInvitations,
} from './auth/Auth';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen,
  CalendarDays, Check, ChevronDown, CircleHelp, ClipboardList, Download, FileBarChart2,
  Filter, GraduationCap, LayoutDashboard, Menu, Search, Settings, ShieldCheck, SlidersHorizontal,
  Sparkles, Users, X, Clock3, Plus, TrendingUp, MessageSquareText, UserRound,
} from 'lucide-react';

type Risk = 'High' | 'Medium' | 'Low';
type StudentRecord = Awaited<ReturnType<typeof listStudents>>[number];
type Student = {
  id: string; name: string; faculty: string; course: string; year: string;
  risk: Risk; score: number; attendance: number; assessment: number; lms: number;
  residence: string; advisor: string; updated: string;
};
type Intervention = { id: string; studentId: string; studentName: string; type: string; date: string; owner: string; notes: string; status: string };
type StudentForm = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  faculty: string;
  programme: string;
};
const emptyStudentForm: StudentForm = {
  studentNumber: '', firstName: '', lastName: '', email: '', age: '', faculty: '', programme: '',
};

const students: Student[] = [
  {id:'STU-24018',name:'Amahle Mthembu',faculty:'Applied Sciences',course:'Diploma in Analytical Chemistry',year:'1st year',risk:'High',score:87,attendance:58,assessment:42,lms:31,residence:'On campus',advisor:'N. Petersen',updated:'Today, 09:42'},
  {id:'STU-24027',name:'Thabo Nkosi',faculty:'Business & Management',course:'Diploma in Financial Information Systems',year:'1st year',risk:'High',score:82,attendance:61,assessment:49,lms:38,residence:'Off campus',advisor:'L. Jacobs',updated:'Today, 09:18'},
  {id:'STU-24034',name:'Zanele Dlamini',faculty:'Engineering',course:'Diploma in Civil Engineering',year:'1st year',risk:'High',score:79,attendance:64,assessment:46,lms:28,residence:'On campus',advisor:'M. Daniels',updated:'Today, 08:56'},
  {id:'STU-24052',name:'Luthando Mbeki',faculty:'Informatics & Design',course:'Diploma in Information Technology',year:'1st year',risk:'High',score:76,attendance:66,assessment:52,lms:35,residence:'Off campus',advisor:'S. Williams',updated:'Yesterday'},
  {id:'STU-24063',name:'Nolwazi Khumalo',faculty:'Health & Wellness Sciences',course:'Diploma in Nursing',year:'1st year',risk:'Medium',score:68,attendance:74,assessment:58,lms:49,residence:'On campus',advisor:'T. Adams',updated:'Today, 08:31'},
  {id:'STU-24071',name:'Sipho Ndlovu',faculty:'Engineering',course:'Diploma in Mechanical Engineering',year:'1st year',risk:'Medium',score:64,attendance:72,assessment:61,lms:54,residence:'Off campus',advisor:'M. Daniels',updated:'Yesterday'},
  {id:'STU-24088',name:'Ayanda Jali',faculty:'Applied Sciences',course:'Diploma in Food Technology',year:'1st year',risk:'Medium',score:61,attendance:77,assessment:57,lms:51,residence:'On campus',advisor:'N. Petersen',updated:'Yesterday'},
  {id:'STU-24102',name:'Kea Motsepe',faculty:'Business & Management',course:'Diploma in Management',year:'1st year',risk:'Medium',score:57,attendance:79,assessment:63,lms:48,residence:'Off campus',advisor:'L. Jacobs',updated:'Mon, 15:12'},
  {id:'STU-24115',name:'Mihlali Gqoboka',faculty:'Informatics & Design',course:'Diploma in Graphic Design',year:'1st year',risk:'Medium',score:55,attendance:81,assessment:65,lms:56,residence:'On campus',advisor:'S. Williams',updated:'Mon, 14:45'},
  {id:'STU-24129',name:'Bongani Maseko',faculty:'Health & Wellness Sciences',course:'Diploma in Emergency Medical Care',year:'1st year',risk:'Medium',score:53,attendance:78,assessment:67,lms:59,residence:'Off campus',advisor:'T. Adams',updated:'Mon, 13:20'},
  {id:'STU-24134',name:'Lerato Molefe',faculty:'Engineering',course:'Diploma in Electrical Engineering',year:'1st year',risk:'Low',score:43,attendance:88,assessment:75,lms:73,residence:'On campus',advisor:'M. Daniels',updated:'Mon, 11:03'},
  {id:'STU-24149',name:'Simphiwe Pono',faculty:'Applied Sciences',course:'Diploma in Biotechnology',year:'1st year',risk:'Low',score:38,attendance:91,assessment:79,lms:80,residence:'Off campus',advisor:'N. Petersen',updated:'Mon, 10:11'},
  {id:'STU-24157',name:'Chuma Vena',faculty:'Business & Management',course:'Diploma in Retail Business Management',year:'1st year',risk:'Low',score:33,attendance:93,assessment:82,lms:84,residence:'On campus',advisor:'L. Jacobs',updated:'Fri, 16:18'},
  {id:'STU-24170',name:'Enhle Zondi',faculty:'Informatics & Design',course:'Diploma in Multimedia Design',year:'1st year',risk:'Low',score:29,attendance:95,assessment:86,lms:89,residence:'Off campus',advisor:'S. Williams',updated:'Fri, 15:42'},
  {id:'STU-24183',name:'Kabelo Radebe',faculty:'Health & Wellness Sciences',course:'Diploma in Medical Laboratory Science',year:'1st year',risk:'Low',score:24,attendance:96,assessment:88,lms:92,residence:'On campus',advisor:'T. Adams',updated:'Fri, 14:05'},
  {id:'STU-24196',name:'Asanda Gcaba',faculty:'Applied Sciences',course:'Diploma in Marine Science',year:'1st year',risk:'Low',score:21,attendance:97,assessment:91,lms:87,residence:'Off campus',advisor:'N. Petersen',updated:'Fri, 12:34'},
];
const nav = [
  {label:'Overview', href:'/dashboard', icon:LayoutDashboard},
  {label:'Students', href:'/students', icon:Users},
  {label:'Interventions', href:'/interventions', icon:ClipboardList},
  {label:'Courses', href:'/courses', icon:BookOpen},
  {label:'Faculty', href:'/faculty', icon:GraduationCap},
  {label:'Reports', href:'/reports', icon:FileBarChart2},
];
const riskClass = (risk: Risk) => `risk-badge risk-${risk.toLowerCase()}`;
const initials = (name: string) => name.split(' ').slice(0,2).map(part => part[0]).join('');
const getStoredInterventions = (): Intervention[] => {
  try { return JSON.parse(localStorage.getItem('radar-demo-interventions') || '[]') as Intervention[]; } catch { return []; }
};

function RiskBadge({risk}:{risk:Risk}) { return <span className={riskClass(risk)}>{risk} risk</span>; }
function studentErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as {data?: unknown}).data;
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  }
  return error instanceof Error ? error.message : fallback;
}
function sortStudentRecords(records: StudentRecord[]): StudentRecord[] {
  return [...records].sort((a,b)=>a.lastName.localeCompare(b.lastName)||a.firstName.localeCompare(b.firstName)||a.id-b.id);
}
function Sidebar({path}:{path:string}) {
  return <aside className="sidebar">
    <Link href="/dashboard" className="brand"><div className="brand-mark"><Activity size={22}/></div><div><div className="brand-name">RADAR</div><div className="brand-sub">Student success insight</div></div></Link>
    <div className="nav-caption">Workspace</div>
    <nav className="nav-list" aria-label="Main navigation">
      {nav.map(item => { const Icon=item.icon; const active=path===item.href||path.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} className={`nav-link ${active?'active':''}`}><Icon/><span>{item.label}</span></Link>; })}
    </nav>
    <div className="nav-caption" style={{marginTop:18}}>Account</div>
    <nav className="nav-list">
      <Link href="/settings" className={`nav-link ${path==='/settings'?'active':''}`}><Settings/><span>Settings</span></Link>
    </nav>
    <div className="sidebar-foot">
      <div className="fiction-note"><ShieldCheck/><span>Fictional demo data only. RADAR is a prototype preview, not connected to any institution.</span></div>
      <SupportSidebarProfile/>
    </div>
  </aside>;
}
function MobileNav({path}:{path:string}) {
  const items=[nav[0],nav[1],nav[2],nav[5]];
  return <nav className="mobile-nav" aria-label="Mobile navigation">{items.map(item=>{const Icon=item.icon;const active=path===item.href||path.startsWith(`${item.href}/`);return <Link key={item.href} href={item.href} className={active?'active':''}><Icon/><span>{item.label}</span></Link>;})}</nav>;
}
function AppShell({children}:{children:React.ReactNode}) {
  const [path,setPath]=useLocation(); const [mobileOpen,setMobileOpen]=useState(false);
  return <div className="app-shell"><Sidebar path={path}/><div className="main-area">
    <header className="topbar">
      <div className="crumb"><button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={()=>setMobileOpen(!mobileOpen)}>{mobileOpen?<X size={18}/>:<Menu size={18}/>}</button><span>Academic support</span><span>/</span><strong>{pageTitle(path)}</strong></div>
      <div className="top-actions"><span className="term-pill">2025 · Semester 1</span><button className="icon-button" title="Notifications" aria-label="Open interventions" onClick={()=>setPath('/interventions')}><Bell size={17}/></button><SupportAccountControls/></div>
    </header>
    {mobileOpen&&<div className="mobile-drawer"><button className="icon-button" onClick={()=>setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button>{nav.map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} onClick={()=>setMobileOpen(false)} className="nav-link"><Icon/>{item.label}</Link>})}<Link href="/settings" className="nav-link" onClick={()=>setMobileOpen(false)}><Settings/>Settings</Link></div>}
    {children}<MobileNav path={path}/>
  </div></div>;
}
function pageTitle(path:string) {
  if(path==='/dashboard') return 'Overview'; if(path.startsWith('/predictions')) return 'Risk explanation'; if(path.startsWith('/students/')) return 'Student profile';
  return ({'/students':'Students','/interventions':'Interventions','/courses':'Courses','/faculty':'Faculty','/reports':'Reports','/settings':'Settings'} as Record<string,string>)[path]||'RADAR';
}
function PageHead({eyebrow,title,subtitle,actions}:{eyebrow:string;title:string;subtitle:string;actions?:React.ReactNode}) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{actions&&<div className="actions">{actions}</div>}</div>;
}
function Stat({label,value,foot,icon:Icon,tint}:{label:string;value:string;foot:string;icon:typeof Activity;tint?:string}) {
  return <div className="card stat-card" style={{'--stat-tint':tint||'#e7f3f1'} as React.CSSProperties}><Icon className="stat-icon"/><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>;
}
function TrendChart() {
  const lines=[{name:'High',color:'#c7655a',points:'0,112 54,104 108,96 162,100 216,78 270,83 324,58 378,64 432,43 486,48 540,30'},
    {name:'Medium',color:'#d2a44f',points:'0,138 54,134 108,140 162,123 216,130 270,119 324,125 378,107 432,112 486,95 540,100'},
    {name:'Low',color:'#65a99f',points:'0,154 54,152 108,150 162,157 216,149 270,151 324,145 378,150 432,139 486,142 540,135'}];
  return <div className="chart-wrap"><svg className="trend-svg" viewBox="0 0 540 180" role="img" aria-label="Risk level trend over ten weeks">
    {[30,70,110,150].map(y=><g key={y}><line x1="0" y1={y} x2="540" y2={y} stroke="#eaf0ef" strokeDasharray="3 5"/><text x="0" y={y-4} fill="#9ba9ad" fontSize="8">{Math.round((170-y)/1.8)}%</text></g>)}
    {lines.map(l=><polyline key={l.name} points={l.points} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 0)"/>)}
    {['Wk 1','Wk 3','Wk 5','Wk 7','Wk 9'].map((l,i)=><text key={l} x={i*135} y="174" fill="#9ba9ad" fontSize="8">{l}</text>)}
    <circle cx="540" cy="30" r="3.5" fill="#c7655a"/><circle cx="540" cy="100" r="3.5" fill="#d2a44f"/><circle cx="540" cy="135" r="3.5" fill="#65a99f"/>
  </svg></div>;
}
function RiskDistribution() {
  const counts=[{label:'High risk',count:4,color:'#c7655a',pct:25},{label:'Medium risk',count:6,color:'#d2a44f',pct:37.5},{label:'Low risk',count:6,color:'#65a99f',pct:37.5}];
  return <div className="risk-breakdown">{counts.map(c=><div className="risk-row" key={c.label}><span>{c.label}</span><div className="risk-track"><div className="risk-fill" style={{width:`${c.pct}%`,background:c.color}}/></div><span className="risk-count">{c.count}</span></div>)}</div>;
}
function StudentTable({rows,compact=false}:{rows:Student[];compact?:boolean}) {
  return <table className="data-table"><thead><tr><th>Student</th><th>Faculty / course</th><th>Risk</th><th>Attendance</th><th>Updated</th><th></th></tr></thead><tbody>
    {rows.length===0?<tr><td colSpan={6}><div className="table-empty">No students match these filters. Try adjusting your search.</div></td></tr>:rows.map(s=><tr key={s.id}>
      <td><Link href={`/students/${s.id}`} className="student-cell"><span className="avatar">{initials(s.name)}</span><span><span className="student-name">{s.name}</span><span className="student-id" style={{display:'block'}}>{s.id}</span></span></Link></td>
      <td><div className="student-name" style={{fontSize:10,fontWeight:600}}>{s.faculty}</div><div className="student-id" style={{fontFamily:'var(--app-font-sans)'}}>{s.course.split(' in ').slice(-1)[0]}</div></td>
      <td><RiskBadge risk={s.risk}/></td><td><span className="mono">{s.attendance}%</span></td><td>{s.updated}</td>
      <td><Link className="row-link" href={compact?`/predictions/${s.id}`:`/students/${s.id}`}>{compact?'Review':'View'} <ArrowRight size={12}/></Link></td>
    </tr>)}</tbody></table>;
}
function Dashboard() {
  const high=students.filter(s=>s.risk==='High').length;
  return <main className="page">
    <PageHead eyebrow="Monday, 12 May 2025 · Semester 1" title="Good morning, support team" subtitle="A clear view of students who may benefit from an early check-in." actions={<><Link href="/students" className="btn"><Users/> Browse students</Link><Link href="/reports" className="btn btn-primary"><FileBarChart2/> View reports</Link></>}/>
    <div className="notice" style={{marginBottom:16}}><ShieldCheck/><span><b>Fictional demo data</b> — illustrative student records and risk indicators only. This preview is not connected to CPUT or any institutional system, and does not provide live predictions.</span></div>
    <div className="stat-grid">
      <Stat label="Students in this demo" value="16" foot="First-year cohort · Semester 1" icon={Users}/>
      <Stat label="High risk to review" value={String(high).padStart(2,'0')} foot="2 new since last review" icon={AlertCircle} tint="#fae9e6"/>
      <Stat label="Check-ins logged" value={String(getStoredInterventions().length+28)} foot="6 this week across the cohort" icon={MessageSquareText} tint="#e8f2ef"/>
      <Stat label="Review coverage" value="74%" foot="+8.4% from last fortnight" icon={TrendingUp} tint="#f6f0df"/>
    </div>
    <div className="dashboard-grid">
      <section className="card"><div className="card-head"><div><h2 className="card-title">Risk signals over time</h2><div className="card-kicker">Cohort distribution · last 10 teaching weeks</div></div><div className="chart-legend">{[['#c7655a','High'],['#d2a44f','Medium'],['#65a99f','Low']].map(([color,label])=><span className="legend-item" key={label}><i className="dot" style={{background:color}}/>{label}</span>)}</div></div><div className="card-content"><TrendChart/></div></section>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Current risk distribution</h2><div className="card-kicker">Across 16 fictional student records</div></div><span className="tag">This week</span></div><div className="card-content" style={{paddingTop:15}}><RiskDistribution/><div className="note-box" style={{marginTop:21}}>Risk categories are illustrative indicators for this prototype. They are not clinical or academic determinations.</div></div></section>
    </div>
    <section className="card table-card">
      <div className="card-head"><div><h2 className="card-title">Students to check in with</h2><div className="card-kicker">Highest current demo risk · sorted for review</div></div><Link href="/students?risk=High" className="row-link">All students <ArrowRight size={13}/></Link></div>
      <StudentTable rows={students.filter(s=>s.risk==='High').slice(0,4)} compact/>
    </section>
    <div className="two-col" style={{marginTop:16}}>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Recent activity</h2><div className="card-kicker">Support actions in the demo workspace</div></div><Link className="row-link" href="/interventions">View history <ArrowRight size={13}/></Link></div>
      <div className="list-simple">{[...getStoredInterventions()].slice(0,2).map(i=><div className="list-entry" key={i.id}><div><div className="entry-title">{i.type} · {i.studentName}</div><div className="entry-sub">{i.date} · {i.owner}</div></div><span className="tag">{i.status}</span></div>)}<div className="list-entry"><div><div className="entry-title">Academic check-in · Nolwazi Khumalo</div><div className="entry-sub">Today, 08:31 · T. Adams</div></div><span className="tag">Completed</span></div><div className="list-entry"><div><div className="entry-title">Wellbeing referral · Amahle Mthembu</div><div className="entry-sub">Yesterday · N. Petersen</div></div><span className="tag">Follow-up due</span></div></div></section>
      <section className="card"><div className="card-head"><div><h2 className="card-title">A note on this preview</h2><div className="card-kicker">Responsible use</div></div><CircleHelp size={17} color="#78949c"/></div><div className="card-content"><p style={{fontSize:11,color:'#667e87',lineHeight:1.7,marginBottom:12}}>RADAR is a design prototype exploring how student support teams might organise early signals and coordinate timely check-ins.</p><Link href="/settings" className="row-link">Read demo settings <ArrowRight size={13}/></Link></div></section>
    </div>
  </main>;
}
function StudentsPage() {
  const [records,setRecords]=useState<StudentRecord[]>([]);
  const [query,setQuery]=useState('');
  const [faculty,setFaculty]=useState('All');
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [editorOpen,setEditorOpen]=useState(false);
  const [editingRecord,setEditingRecord]=useState<StudentRecord|null>(null);
  const [form,setForm]=useState<StudentForm>(emptyStudentForm);
  const [formError,setFormError]=useState('');
  const [saving,setSaving]=useState(false);
  const [deletingId,setDeletingId]=useState<number|null>(null);

  const loadStudents=useCallback(async(showLoading=true)=>{
    if(showLoading)setLoading(true);
    try {
      const result=await listStudents({credentials:'include',cache:'no-store'});
      setRecords(sortStudentRecords(result));
      setLoadError('');
    } catch(error) {
      setLoadError(studentErrorMessage(error,'Unable to load student records.'));
    } finally {
      if(showLoading)setLoading(false);
    }
  },[]);

  useEffect(()=>{void loadStudents();},[loadStudents]);
  useEffect(()=>{
    const onFocus=()=>{void loadStudents(false);};
    window.addEventListener('focus',onFocus);
    return ()=>window.removeEventListener('focus',onFocus);
  },[loadStudents]);

  const facultyNames=[...new Set(records.map(record=>record.faculty).filter((value):value is string=>Boolean(value)))].sort();
  const filtered=useMemo(()=>records.filter(record=>
    (faculty==='All'||record.faculty===faculty)&&
    `${record.firstName} ${record.lastName} ${record.studentNumber} ${record.email||''} ${record.programme||''} ${record.faculty||''}`.toLowerCase().includes(query.toLowerCase())
  ),[records,query,faculty]);

  const openCreate=()=>{setEditingRecord(null);setForm(emptyStudentForm);setFormError('');setEditorOpen(true);};
  const openEdit=(record:StudentRecord)=>{
    setEditingRecord(record);
    setForm({
      studentNumber:record.studentNumber,
      firstName:record.firstName,
      lastName:record.lastName,
      email:record.email||'',
      age:record.age===null?'':String(record.age),
      faculty:record.faculty||'',
      programme:record.programme||'',
    });
    setFormError('');
    setEditorOpen(true);
  };
  const closeEditor=()=>{if(!saving){setEditorOpen(false);setEditingRecord(null);setFormError('');}};
  const handleSave=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    setFormError('');
    const age=form.age.trim()===''?null:Number(form.age);
    if(age!==null&&(!Number.isInteger(age)||age<0||age>130)){
      setFormError('Enter a whole-number age between 0 and 130.');
      return;
    }
    const data={
      studentNumber:form.studentNumber.trim(),
      firstName:form.firstName.trim(),
      lastName:form.lastName.trim(),
      email:form.email.trim()||null,
      age,
      faculty:form.faculty.trim()||null,
      programme:form.programme.trim()||null,
    };
    setSaving(true);
    try {
      const saved=editingRecord
        ? await updateStudent(editingRecord.id,data,{credentials:'include'})
        : await createStudent(data,{credentials:'include'});
      setRecords(current=>sortStudentRecords(editingRecord
        ? current.map(record=>record.id===saved.id?saved:record)
        : [...current,saved]));
      setEditorOpen(false);
      setEditingRecord(null);
      setForm(emptyStudentForm);
      void loadStudents(false);
    } catch(error) {
      setFormError(studentErrorMessage(error,'Could not save this student record.'));
    } finally {
      setSaving(false);
    }
  };
  const handleDelete=async(record:StudentRecord)=>{
    const name=`${record.firstName} ${record.lastName}`;
    if(!window.confirm(`Permanently delete ${name} (${record.studentNumber})? Records with linked academic or support history cannot be deleted.`))return;
    setDeletingId(record.id);
    setLoadError('');
    try {
      await deleteStudent(record.id,{credentials:'include'});
      setRecords(current=>current.filter(item=>item.id!==record.id));
      void loadStudents(false);
    } catch(error) {
      setLoadError(studentErrorMessage(error,'Could not delete this student record.'));
    } finally {
      setDeletingId(null);
    }
  };

  return <main className="page">
    <PageHead eyebrow="Student support workspace" title="Student records" subtitle="Add, review, update, and remove records stored in the development PostgreSQL database." actions={<><button className="btn" onClick={()=>void loadStudents()} disabled={loading}>Refresh</button><button className="btn btn-primary" onClick={openCreate}><Plus/> Add student</button></>}/>
    <div className="notice" style={{marginBottom:16}}><ShieldCheck/><span>These records are available only to signed-in RADAR support staff and are saved in PostgreSQL. Other dashboard and report views still use fictional demo examples.</span></div>
    {loadError&&<div className="notice" role="alert" style={{marginBottom:16}}><AlertCircle/><span>{loadError}</span></div>}
    <section className="card table-card">
      <div className="table-toolbar">
        <div className="table-tools">
          <label className="searchbox"><Search size={15}/><input aria-label="Search student records" placeholder="Search name, number, email, programme…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
          <select className="select" aria-label="Filter by faculty" value={faculty} onChange={event=>setFaculty(event.target.value)}><option value="All">All faculties</option>{facultyNames.map(name=><option key={name}>{name}</option>)}</select>
        </div>
        <span style={{fontSize:10,color:'#809097'}}>{filtered.length} {filtered.length===1?'record':'records'}</span>
      </div>
      {loading?<div className="table-empty" role="status">Loading student records…</div>:filtered.length===0?
        <div className="table-empty">{records.length===0?(loadError?'Student records could not be loaded. Try refreshing the page.':'No student records yet. Add a record to get started.'):'No student records match your search or faculty filter.'}</div>:
        <div className="student-record-table-wrap"><table className="data-table"><thead><tr><th>Student number</th><th>Name</th><th>Programme / faculty</th><th>Email</th><th>Age</th><th>Actions</th></tr></thead><tbody>
          {filtered.map(record=><tr key={record.id}>
            <td className="student-id">{record.studentNumber}</td>
            <td><span className="student-name">{record.firstName} {record.lastName}</span></td>
            <td>{record.programme||'—'}<div className="student-id">{record.faculty||'No faculty'}</div></td>
            <td>{record.email||'—'}</td>
            <td>{record.age??'—'}</td>
            <td><div className="student-actions"><button type="button" className="btn" aria-label={`Edit ${record.studentNumber}`} onClick={()=>openEdit(record)}>Edit</button><button type="button" className="btn btn-danger" aria-label={`Delete ${record.studentNumber}`} disabled={deletingId===record.id} onClick={()=>void handleDelete(record)}>{deletingId===record.id?'Deleting…':'Delete'}</button></div></td>
          </tr>)}
        </tbody></table></div>}
    </section>
    {editorOpen&&<div className="modal-backdrop" role="presentation" onClick={event=>{if(event.target===event.currentTarget)closeEditor();}}>
      <form className="modal student-editor" role="dialog" aria-modal="true" aria-labelledby="student-editor-title" onSubmit={event=>void handleSave(event)}>
        <h2 id="student-editor-title">{editingRecord?'Edit student record':'Add student record'}</h2>
        <div className="modal-sub">Saved directly to PostgreSQL. Required fields are marked.</div>
        {formError&&<div className="notice" role="alert"><AlertCircle/><span>{formError}</span></div>}
        <div className="form-grid">
          <div className="field"><label htmlFor="student-number">Student number *</label><input id="student-number" required maxLength={50} value={form.studentNumber} onChange={event=>setForm({...form,studentNumber:event.target.value})}/></div>
          <div className="field"><label htmlFor="student-age">Age</label><input id="student-age" type="number" min={0} max={130} step={1} value={form.age} onChange={event=>setForm({...form,age:event.target.value})}/></div>
          <div className="field"><label htmlFor="student-first-name">First name *</label><input id="student-first-name" required maxLength={100} value={form.firstName} onChange={event=>setForm({...form,firstName:event.target.value})}/></div>
          <div className="field"><label htmlFor="student-last-name">Last name *</label><input id="student-last-name" required maxLength={100} value={form.lastName} onChange={event=>setForm({...form,lastName:event.target.value})}/></div>
          <div className="field form-full"><label htmlFor="student-email">Email</label><input id="student-email" type="email" maxLength={255} value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/></div>
          <div className="field"><label htmlFor="student-faculty">Faculty</label><input id="student-faculty" maxLength={150} value={form.faculty} onChange={event=>setForm({...form,faculty:event.target.value})}/></div>
          <div className="field"><label htmlFor="student-programme">Programme</label><input id="student-programme" maxLength={150} value={form.programme} onChange={event=>setForm({...form,programme:event.target.value})}/></div>
        </div>
        <div className="form-actions"><button type="button" className="btn" onClick={closeEditor} disabled={saving}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':editingRecord?'Save changes':'Create student'}</button></div>
      </form>
    </div>}
  </main>;
}
function StudentProfile({id}:{id:string}) {
  const s=students.find(x=>x.id===id)||students[0];const related=getStoredInterventions().filter(i=>i.studentId===s.id);
  return <main className="page"><PageHead eyebrow="Student record · fictional demo" title="Student profile" subtitle="A consolidated view to support a human-led conversation." actions={<><Link href={`/predictions/${s.id}`} className="btn"><Sparkles/> View risk explanation</Link><button className="btn btn-primary" onClick={()=>window.dispatchEvent(new CustomEvent('radar-open-intervention',{detail:s.id}))}><Plus/> Log intervention</button></>}/>
    <section className="card profile-banner"><div className="avatar">{initials(s.name)}</div><div><h2 className="profile-name">{s.name}</h2><div className="profile-meta">{s.id} · {s.year} · {s.course}</div></div><RiskBadge risk={s.risk}/></section>
    <div className="two-col" style={{marginTop:16}}><div className="section-stack">
      <section className="card"><div className="card-head"><div><h2 className="card-title">Student overview</h2><div className="card-kicker">Available sample information</div></div></div><div className="detail-list">{[['Faculty',s.faculty],['Programme',s.course],['Study year',s.year],['Residence',s.residence],['Assigned advisor',s.advisor],['Last reviewed',s.updated]].map(([l,v])=><div className="detail-item" key={l}><label>{l}</label><div>{v}</div></div>)}</div></section>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Engagement indicators</h2><div className="card-kicker">Illustrative signals · not verified institutional data</div></div></div><div className="card-content"><div className="feature-list">{[['Attendance',s.attendance],['Assessment progress',s.assessment],['Learning platform activity',s.lms]].map(([label,val])=><div className="feature-row" key={label as string}><span>{label}</span><div className="feature-track"><div className="feature-fill" style={{width:`${val}%`,background:(val as number)<50?'#c7655a':(val as number)<70?'#d2a44f':'#55a99d'}}/></div><strong>{val}%</strong></div>)}</div></div></section>
    </div><div className="section-stack">
      <section className="card"><div className="card-head"><div><h2 className="card-title">Support history</h2><div className="card-kicker">Recorded in this browser preview</div></div><Link className="row-link" href="/interventions">All <ArrowRight size={12}/></Link></div><div className="list-simple">{related.length?related.map(i=><div className="list-entry" key={i.id}><div><div className="entry-title">{i.type}</div><div className="entry-sub">{i.date} · {i.owner}</div><div className="entry-sub">{i.notes}</div></div><span className="tag">{i.status}</span></div>):<div className="table-empty">No locally logged actions for this student yet.</div>}</div></section>
      <section className="card"><div className="card-head"><h2 className="card-title">Support prompt</h2><MessageSquareText size={16} color="#639e94"/></div><div className="card-content"><div className="note-box">Start with an open, non-judgemental check-in. Confirm context with the student before discussing any indicator.</div><button className="btn" style={{marginTop:13}} onClick={()=>window.dispatchEvent(new CustomEvent('radar-open-intervention',{detail:s.id}))}><Plus/> Record a check-in</button></div></section>
    </div></div>
  </main>;
}
function PredictionPage({id}:{id:string}) {
  const s=students.find(x=>x.id===id)||students[0];
  const factors=[{label:'Attendance pattern',value:Math.max(15,100-s.attendance),display:`${s.attendance}% attendance`},{label:'Assessment progress',value:Math.max(15,100-s.assessment),display:`${s.assessment}% progress`},{label:'Learning platform activity',value:Math.max(15,100-s.lms),display:`${s.lms}% activity`}];
  return <main className="page"><PageHead eyebrow="Illustrative risk review" title="Risk explanation" subtitle={`Why ${s.name} appears in the ${s.risk.toLowerCase()}-risk example group.`} actions={<Link className="btn" href={`/students/${s.id}`}>Back to profile <ArrowRight/></Link>}/>
    <div className="notice" style={{marginBottom:16}}><AlertCircle/><span>This is an example explanation, not an output from a trained or live model. Do not use it to make decisions about a student. Validate context directly with the student.</span></div>
    <div className="two-col"><div className="section-stack">
      <section className="card"><div className="card-head"><div><h2 className="card-title">Current demo indicator</h2><div className="card-kicker">Reference: {s.id} · Cohort review snapshot</div></div><RiskBadge risk={s.risk}/></div><div className="card-content"><div style={{display:'flex',alignItems:'baseline',gap:11,margin:'8px 0 16px'}}><span style={{font:'750 38px var(--app-font-serif)',color:'#294454'}}>{s.score}</span><span style={{fontSize:11,color:'#829198'}}>illustrative score / 100</span></div><div className="feature-list">{factors.map(f=><div className="feature-row" key={f.label}><span>{f.label}</span><div className="feature-track"><div className="feature-fill" style={{width:`${f.value}%`,background:s.risk==='High'?'#c7655a':s.risk==='Medium'?'#d2a44f':'#55a99d'}}/></div><strong>{f.display}</strong></div>)}</div></div></section>
      <section className="card"><div className="card-head"><h2 className="card-title">What could be contributing</h2></div><div className="card-content"><div className="list-simple">{factors.map((f,i)=><div className="list-entry" key={f.label}><div><div className="entry-title">{f.label}</div><div className="entry-sub">{i===0?'Attendance is below the cohort reference range.':i===1?'Assessment progress may need a supportive conversation.':'Activity levels vary; check for access or connectivity barriers.'}</div></div><span className="tag">{f.display}</span></div>)}</div></div></section>
    </div><div className="section-stack"><section className="card"><div className="card-head"><h2 className="card-title">Suggested next step</h2><Sparkles size={16} color="#639e94"/></div><div className="card-content"><p style={{fontSize:11,color:'#647b84',lineHeight:1.7}}>A human-led check-in can help understand the student's circumstances and identify appropriate support.</p><button className="btn btn-primary" onClick={()=>window.dispatchEvent(new CustomEvent('radar-open-intervention',{detail:s.id}))}><Plus/> Log a check-in</button></div></section><section className="card"><div className="card-head"><h2 className="card-title">Interpretation guide</h2></div><div className="card-content"><div className="risk-breakdown">{[['High risk','Review promptly','#c7655a'],['Medium risk','Consider a check-in','#d2a44f'],['Low risk','Continue routine support','#65a99f']].map(([a,b,c])=><div className="list-entry" style={{padding:'8px 0'}} key={a}><span className="dot" style={{background:c}}/><div style={{flex:1}}><div className="entry-title">{a}</div><div className="entry-sub">{b}</div></div></div>)}</div><div className="note-box" style={{marginTop:13}}>Risk group is not a judgement, diagnosis, or prediction of a student's outcome.</div></div></section></div></div>
  </main>;
}
function InterventionsPage({notify}:{notify:(s:string)=>void}) {
  const [items,setItems]=useState<Intervention[]>(getStoredInterventions);const [show,setShow]=useState(false);const [search,setSearch]=useState('');
  const [studentId,setStudentId]=useState('');const [type,setType]=useState('Academic check-in');const [status,setStatus]=useState('Completed');const [notes,setNotes]=useState('');
  useEffect(()=>{const prefill=(event:Event)=>{const id=(event as CustomEvent<string>).detail;setStudentId(id);setShow(true);};window.addEventListener('radar-prefill-student',prefill);return()=>window.removeEventListener('radar-prefill-student',prefill);},[]);
  const filtered=items.filter(x=>`${x.studentName} ${x.studentId} ${x.type} ${x.owner}`.toLowerCase().includes(search.toLowerCase()));
  const save=()=>{const s=students.find(x=>x.id===studentId);if(!s||!notes.trim()){notify('Choose a student and add a short note.');return;}const next:Intervention={id:`INT-${Date.now()}`,studentId:s.id,studentName:s.name,type,date:new Date().toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'}),owner:'Nandi Petersen',notes:notes.trim(),status};const updated=[next,...items];setItems(updated);localStorage.setItem('radar-demo-interventions',JSON.stringify(updated));setShow(false);setNotes('');notify('Intervention saved in this browser preview.');};
  return <main className="page"><PageHead eyebrow="Coordinate support" title="Interventions" subtitle="Review support actions and record check-ins locally in this browser." actions={<button className="btn btn-primary" onClick={()=>setShow(true)}><Plus/> Log intervention</button>}/>
    <div className="notice" style={{marginBottom:16}}><ShieldCheck/><span>Intervention entries stay in this browser's local storage. No server or institution is connected.</span></div>
    <section className="card table-card"><div className="table-toolbar"><label className="searchbox"><Search size={15}/><input aria-label="Search interventions" placeholder="Search student or action…" value={search} onChange={e=>setSearch(e.target.value)}/></label><span style={{fontSize:10,color:'#809097'}}>{filtered.length} logged actions</span></div>
    <table className="data-table"><thead><tr><th>Student</th><th>Action</th><th>Date</th><th>Recorded by</th><th>Notes</th><th>Status</th></tr></thead><tbody>{filtered.length===0?<tr><td colSpan={6}><div className="table-empty">No matching interventions. Log a check-in to begin a local history.</div></td></tr>:filtered.map(i=><tr key={i.id}><td><Link className="row-link" href={`/students/${i.studentId}`}>{i.studentName}</Link><div className="student-id">{i.studentId}</div></td><td>{i.type}</td><td>{i.date}</td><td>{i.owner}</td><td style={{whiteSpace:'normal',minWidth:180,maxWidth:260}}>{i.notes}</td><td><span className="tag">{i.status}</span></td></tr>)}</tbody></table></section>
    {show&&<div className="modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)setShow(false)}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="intervention-title"><h2 id="intervention-title">Log an intervention</h2><div className="modal-sub">Record a supportive action for the local demo workspace.</div><div className="form-grid">
      <div className="field form-full"><label htmlFor="intervention-student">Student</label><select id="intervention-student" value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Choose a student</option>{students.map(s=><option value={s.id} key={s.id}>{s.name} · {s.id}</option>)}</select></div>
      <div className="field"><label htmlFor="intervention-type">Action type</label><select id="intervention-type" value={type} onChange={e=>setType(e.target.value)}>{['Academic check-in','Wellbeing check-in','Financial aid referral','Study skills support','Residence support','Other follow-up'].map(x=><option key={x}>{x}</option>)}</select></div>
      <div className="field"><label htmlFor="intervention-status">Status</label><select id="intervention-status" value={status} onChange={e=>setStatus(e.target.value)}>{['Completed','Follow-up due','In progress','Referred'].map(x=><option key={x}>{x}</option>)}</select></div>
      <div className="field form-full"><label htmlFor="intervention-notes">Brief note</label><textarea id="intervention-notes" placeholder="Add a factual, respectful summary…" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
    </div><div className="form-actions"><button className="btn" onClick={()=>setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={save}><Check size={14}/> Save locally</button></div></div></div>}
  </main>;
}
function CoursesPage() {
  const faculties=[...new Set(students.map(s=>s.faculty))];
  return <main className="page"><PageHead eyebrow="Academic context" title="Courses" subtitle="Browse the fictional programme mix represented in the demo cohort." actions={<span className="tag">16 sample records</span>}/>
    <div className="notice" style={{marginBottom:16}}><ShieldCheck/><span>Course and faculty names provide general South African tertiary context. This prototype is not affiliated with or connected to CPUT systems.</span></div>
    <div className="course-cards">{faculties.map((f,i)=>{const list=students.filter(s=>s.faculty===f);const high=list.filter(s=>s.risk==='High').length;return <section className="card course-card" key={f}><div className="course-code">FACULTY 0{i+1}</div><h2 className="course-name">{f}</h2><div className="card-kicker">{list.length} fictional students across sample programmes</div><div className="course-foot"><span>{[...new Set(list.map(s=>s.course))].length} course examples</span><span className={high?'risk-badge risk-high':'risk-badge risk-low'}>{high} high risk</span></div><div style={{marginTop:15}}><Link className="row-link" href="/students">View student records <ArrowRight size={12}/></Link></div></section>})}</div>
  </main>;
}
function FacultyPage() {
  const faculties=[...new Set(students.map(s=>s.faculty))];
  return <main className="page"><PageHead eyebrow="Cohort comparison" title="Faculty overview" subtitle="Compare demo risk distribution across represented faculty groups."/>
    <div className="notice" style={{marginBottom:16}}><ShieldCheck/><span>These are fictional, small-sample records for interface demonstration. Do not infer real faculty performance.</span></div>
    <div className="faculty-grid">{faculties.map(f=>{const list=students.filter(s=>s.faculty===f);const high=list.filter(s=>s.risk==='High').length;const medium=list.filter(s=>s.risk==='Medium').length;const rate=Math.round(high/list.length*100);return <section className="card faculty-card" key={f}><h2 className="faculty-title">{f}</h2><div className="faculty-metric">{list.length} records · {new Set(list.map(s=>s.course)).size} sample programmes</div><div className="faculty-bottom"><div><div className="faculty-rate">{rate}%</div><div className="faculty-metric">in high-risk group</div></div><span className={high?'risk-badge risk-high':'risk-badge risk-low'}>{high} high</span></div><div className="risk-track" style={{marginTop:17,height:8}}><div className="risk-fill" style={{width:`${rate}%`,background:'#c7655a'}}/><div style={{height:8,width:`${medium/list.length*100}%`,marginTop:-8,marginLeft:`${rate}%`,background:'#d2a44f'}}/></div><div style={{marginTop:15}}><Link href="/students" className="row-link">Explore students <ArrowRight size={12}/></Link></div></section>})}</div>
  </main>;
}
function MiniBars({items}:{items:{label:string;high:number;medium:number;low:number}[]}) {
  const max=Math.max(...items.map(x=>x.high+x.medium+x.low),1);
  return <div className="mini-bars">{items.map(x=><div className="bar-group" key={x.label}><div className="bar" title={`${x.high} high`} style={{height:`${x.high/max*100}%`,background:'#c7655a'}}/><div className="bar" title={`${x.medium} medium`} style={{height:`${x.medium/max*100}%`,background:'#d2a44f'}}/><div className="bar secondary" title={`${x.low} low`} style={{height:`${x.low/max*100}%`,background:'#65a99f'}}/><span className="bar-label">{x.label}</span></div>)}</div>;
}
function ReportsPage({notify}:{notify:(s:string)=>void}) {
  const [risk,setRisk]=useState('All');const [faculty,setFaculty]=useState('All');const [period,setPeriod]=useState('Semester to date');
  const rows=students.filter(s=>(risk==='All'||s.risk===risk)&&(faculty==='All'||s.faculty===faculty));
  const data=[{label:'Feb',high:1,medium:2,low:5},{label:'Mar',high:2,medium:4,low:7},{label:'Apr',high:3,medium:5,low:8},{label:'May',high:4,medium:6,low:6}];
  const exportCsv=()=>{const header=['Student ID','Student name','Faculty','Course','Risk group','Demo score','Attendance %','Assessment progress %','LMS activity %'];const body=rows.map(s=>[s.id,s.name,s.faculty,s.course,s.risk,s.score,s.attendance,s.assessment,s.lms]);const csv=[header,...body].map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='radar-fictional-demo-report.csv';a.click();URL.revokeObjectURL(url);notify(`Exported ${rows.length} fictional demo records.`);};
  return <main className="page"><PageHead eyebrow="Insights and exports" title="Reports" subtitle="Explore a filtered summary of the fictional cohort and export the current view." actions={<button className="btn btn-primary" onClick={exportCsv}><Download/> Export CSV</button>}/>
    <div className="notice" style={{marginBottom:16}}><ShieldCheck/><span>All figures and rows shown are fictional demo data, not operational analytics or an institutional report.</span></div>
    <section className="card" style={{marginBottom:16}}><div className="report-toolbar"><div className="field"><label htmlFor="rep-period">Reporting period</label><select id="rep-period" value={period} onChange={e=>setPeriod(e.target.value)}><option>Semester to date</option><option>Last 30 days</option><option>Current month</option></select></div><div className="field"><label htmlFor="rep-faculty">Faculty</label><select id="rep-faculty" value={faculty} onChange={e=>setFaculty(e.target.value)}><option>All</option>{[...new Set(students.map(s=>s.faculty))].map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label htmlFor="rep-risk">Risk group</label><select id="rep-risk" value={risk} onChange={e=>setRisk(e.target.value)}><option>All</option><option>High</option><option>Medium</option><option>Low</option></select></div><div style={{marginLeft:'auto',fontSize:10,color:'#819097',paddingBottom:10}}>{rows.length} records · {period}</div></div></section>
    <div className="report-summary" style={{marginBottom:16}}><Stat label="Records in view" value={String(rows.length)} foot="Fictional student records" icon={Users}/><Stat label="High risk records" value={String(rows.filter(s=>s.risk==='High').length)} foot="Requires human review" icon={AlertCircle} tint="#fae9e6"/><Stat label="Mean attendance" value={`${rows.length?Math.round(rows.reduce((n,s)=>n+s.attendance,0)/rows.length):0}%`} foot="Across filtered sample" icon={Activity}/></div>
    <div className="dashboard-grid"><section className="card"><div className="card-head"><div><h2 className="card-title">Risk groups by month</h2><div className="card-kicker">Example cohort counts · semester to date</div></div><div className="chart-legend"><span className="legend-item"><i className="dot" style={{background:'#c7655a'}}/>High</span><span className="legend-item"><i className="dot" style={{background:'#d2a44f'}}/>Medium</span><span className="legend-item"><i className="dot" style={{background:'#65a99f'}}/>Low</span></div></div><div className="card-content"><MiniBars items={data}/></div></section>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Risk mix in current view</h2><div className="card-kicker">{rows.length} students matching filters</div></div><Filter size={16} color="#7b969b"/></div><div className="card-content"><div className="risk-breakdown">{(['High','Medium','Low'] as Risk[]).map(r=>{const count=rows.filter(x=>x.risk===r).length;return <div className="risk-row" key={r}><span>{r} risk</span><div className="risk-track"><div className="risk-fill" style={{width:`${rows.length?count/rows.length*100:0}%`,background:r==='High'?'#c7655a':r==='Medium'?'#d2a44f':'#65a99f'}}/></div><span className="risk-count">{count}</span></div>})}</div><div className="note-box" style={{marginTop:21}}>CSV export includes only the records matching the filters above.</div></div></section></div>
    <section className="card table-card" style={{marginTop:16}}><div className="card-head"><div><h2 className="card-title">Report detail</h2><div className="card-kicker">Current filtered sample records</div></div><button className="row-link" onClick={exportCsv}>Download view <Download size={13}/></button></div><StudentTable rows={rows}/></section>
  </main>;
}
function SettingsPage({notify}:{notify:(s:string)=>void}) {
  const {user}=useUser();
  const clear=()=>{if(window.confirm('Clear locally recorded intervention history for this demo?')){localStorage.removeItem('radar-demo-interventions');notify('Local intervention history cleared.');}};
  const accountName=user?.fullName||'Support staff';
  const accountEmail=user?.primaryEmailAddress?.emailAddress||'';
  const accessRole=user?.publicMetadata?.radarRole==='support_admin'?'Support team administrator':'Support team member';
  return <main className="page"><PageHead eyebrow="Workspace preferences" title="Settings" subtitle="Manage this browser-based prototype's demo preferences."/>
    <div className="two-col"><div className="section-stack">
      <section className="card"><div className="card-head"><div><h2 className="card-title">Signed-in account</h2><div className="card-kicker">Managed staff identity and access role</div></div><UserRound size={16} color="#729397"/></div><div className="detail-list" style={{gridTemplateColumns:'1fr'}}>{[['Name',accountName],['Email',accountEmail],['Role',accessRole],['Account creation','Invitation-only']].map(([label,value])=><div className="detail-item" key={label}><label>{label}</label><div>{value}</div></div>)}</div></section>
      <SupportTeamInvitations/>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Prototype data</h2><div className="card-kicker">Fictional sample data and local browser state</div></div><ShieldCheck size={16} color="#729397"/></div><div className="list-simple"><div className="list-entry"><div><div className="entry-title">Student cohort</div><div className="entry-sub">16 fixed sample records · read-only</div></div><span className="tag">Demo</span></div><div className="list-entry"><div><div className="entry-title">Intervention history</div><div className="entry-sub">{getStoredInterventions().length} actions stored in this browser</div></div><button className="btn" onClick={clear}>Clear local history</button></div></div></section>
    </div><div className="section-stack">
      <section className="card"><div className="card-head"><h2 className="card-title">System information</h2><Settings size={16} color="#729397"/></div><div className="detail-list" style={{gridTemplateColumns:'1fr'}}>{[['Workspace','RADAR prototype preview'],['Authentication','Clerk-managed staff sign-in'],['Support access','Invitation-only; verified by the API'],['Data connection','Development PostgreSQL for student records'],['Model status','No live model'],['Version','Demo · 0.3']].map(([a,b])=><div className="detail-item" key={a}><label>{a}</label><div>{b}</div></div>)}</div></section>
      <section className="card"><div className="card-head"><h2 className="card-title">Responsible use</h2><CircleHelp size={16} color="#729397"/></div><div className="card-content"><div className="note-box">The student-records page saves to PostgreSQL behind server-side support-role checks. Other dashboard, risk, report, and intervention views still use fictional examples or browser-local data. Do not enter real institutional data until the institution has approved its use and completed a privacy and security review.</div></div></section>
    </div></div>
  </main>;
}
function NotFoundPage() { return <main className="page"><div className="card" style={{padding:35,textAlign:'center'}}><div className="eyebrow">Page not found</div><h1>We couldn't find that view.</h1><p className="page-subtitle" style={{marginBottom:18}}>Use the navigation to return to your workspace.</p><Link href="/dashboard" className="btn btn-primary">Back to overview <ArrowRight size={14}/></Link></div></main>; }
function RoutedPages({notify}:{notify:(s:string)=>void}) {
  return <Switch>
    <Route path="/dashboard" component={Dashboard}/>
    <Route path="/students" component={StudentsPage}/>
    <Route path="/students/:studentId">{params=><StudentProfile id={params.studentId}/>}</Route>
    <Route path="/predictions/:studentId">{params=><PredictionPage id={params.studentId}/>}</Route>
    <Route path="/interventions"><InterventionsPage notify={notify}/></Route>
    <Route path="/courses" component={CoursesPage}/>
    <Route path="/faculty" component={FacultyPage}/>
    <Route path="/reports"><ReportsPage notify={notify}/></Route>
    <Route path="/settings"><SettingsPage notify={notify}/></Route>
    <Route component={NotFoundPage}/>
  </Switch>;
}
function Router() {
  const [toast,setToast]=useState('');const [tick,setTick]=useState(0);
  const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),3000);setTick(tick+1);};
  return <>
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage}/>
      <Route path="/sign-up/*?" component={InvitationSignUpPage}/>
      <Route path="/login"><Redirect to="/sign-in"/></Route>
      <Route path="/" component={HomeRedirect}/>
      <Route>
        <RequireSupportAccess>
          <AppShell><RoutedPages notify={notify}/></AppShell>
        </RequireSupportAccess>
      </Route>
    </Switch>
    {toast&&<div className="toast" role="status">{toast}</div>}
    <InterventionEvents notify={notify}/>
  </>;
}
function InterventionEvents({notify}:{notify:(s:string)=>void}) {
  const [,setLocation]=useLocation();
  useEffect(()=>{const open=(event:Event)=>{const detail=(event as CustomEvent<string>).detail;setLocation('/interventions');window.setTimeout(()=>window.dispatchEvent(new CustomEvent('radar-prefill-student',{detail})),120);};window.addEventListener('radar-open-intervention',open);return ()=>window.removeEventListener('radar-open-intervention',open);},[setLocation]);
  return null;
}
function App() {
  return <AuthProviders><Router/></AuthProviders>;
}

export default App;
