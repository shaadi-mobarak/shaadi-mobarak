import React from 'react';
import { api, apiForm } from './api.js';

const L = (t, bn, en) => (t.lang === 'bn' ? bn : en);
function List({ title, items, render }) {
  return <div><h3>{title}</h3>{(!items || !items.length) ? <p>No data yet.</p> : items.map((x, i) => <div key={x._id || x.id || i} className="dash-row">{render(x)}</div>)}</div>;
}

export function MemberDashboard({ t, user }) {
  const [mine, setMine] = React.useState([]); const [short, setShort] = React.useState([]); const [payments, setPayments] = React.useState([]); const [notifs, setNotifs] = React.useState([]); const [sugg, setSugg] = React.useState([]); const [myInterests, setMyInterests] = React.useState([]); const [myConsents, setMyConsents] = React.useState([]); const [pkgs, setPkgs] = React.useState([]);
  const [form, setForm] = React.useState({ profileType: 'bride', age: '', profession: '', district: '', education: '', maritalStatus: 'unmarried', religion: '', heightCm: '' });
  const [privacy, setPrivacy] = React.useState({ showPhotoTo: 'operator_only', showContactTo: 'operator_only' });
  const [pay, setPay] = React.useState({ package: '', method: 'bKash', transactionId: '' });
  const [otp, setOtp] = React.useState(''); const [photoBio, setPhotoBio] = React.useState(''); const [photoFile, setPhotoFile] = React.useState(null);
  const load = () => {
    api('/biodata/mine').then((d) => setMine(d.biodatas || [])).catch(() => {});
    api('/shortlists').then((d) => setShort(d.shortlists || [])).catch(() => {});
    api('/payments/mine').then((d) => setPayments(d.payments || [])).catch(() => {});
    api('/notifications').then((d) => setNotifs(d.notifications || [])).catch(() => {});
    api('/matches/suggestions').then((d) => setSugg(d.teasers || [])).catch(() => {});
    api('/interests/mine').then((d) => setMyInterests(d.interests || [])).catch(() => {});
    api('/consents/mine').then((d) => setMyConsents(d.consents || [])).catch(() => {});
    api('/packages').then((d) => setPkgs(d.packages || [])).catch(() => {});
  };
  React.useEffect(load, []);
  return <section className="content-section"><h2>{t.dashboard} — {user.fullName}</h2>
    <h3>{L(t, 'বায়োডাটা তৈরি করুন', 'Create biodata')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); try { await api('/biodata', { method: 'POST', body: { ...form, age: Number(form.age) || undefined, heightCm: Number(form.heightCm) || undefined } }); load(); } catch (err) { alert(err.message); } }}>
      <select value={form.profileType} onChange={(e) => setForm({ ...form, profileType: e.target.value })}><option value="bride">{t.bride}</option><option value="groom">{t.groom}</option></select>
      <input placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /><input placeholder="Profession" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} /><input placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /><input placeholder="Education" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} /><input placeholder="Religion" value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })} /><input placeholder="Height (cm)" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
      <button className="primary" type="submit">{L(t, 'জমা দিন (অপারেটর যাচাই করবে)', 'Submit (operator will review)')}</button>
    </form>
    <h3>{L(t, 'ছবি আপলোড (ব্যক্তিগত, শুধু অপারেটর দেখতে পারবে)', 'Upload photo (private, operator only)')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); if (!photoFile || !photoBio) { alert(L(t, 'বায়োডাটা ও ছবি বেছে নিন', 'Choose a biodata and a photo')); return; } const fd = new FormData(); fd.append('photo', photoFile); fd.append('biodataId', photoBio); try { await apiForm('/uploads', fd); alert(L(t, 'ছবি আপলোড হয়েছে', 'Photo uploaded')); } catch (err) { alert(err.message); } }}>
      <select value={photoBio} onChange={(e) => setPhotoBio(e.target.value)}><option value="">{L(t, 'বায়োডাটা বেছে নিন', 'Choose biodata')}</option>{mine.map((x) => <option key={x._id} value={x._id}>{x.profileType} · {x.age} · {x.district}</option>)}</select>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files[0])} />
      <button className="primary" type="submit">{L(t, 'আপলোড করুন', 'Upload')}</button>
    </form>
    <h3>{L(t, 'গোপনীয়তা সেটিংস', 'Privacy settings')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); try { await api('/auth/me', { method: 'PATCH', body: { privacy } }); alert(L(t, 'সংরক্ষিত হয়েছে', 'Saved')); } catch (err) { alert(err.message); } }}>
      <label>{L(t, 'ছবি কে দেখতে পারবে', 'Who can see photos')} <select value={privacy.showPhotoTo} onChange={(e) => setPrivacy({ ...privacy, showPhotoTo: e.target.value })}><option value="operator_only">{L(t, 'শুধু অপারেটর', 'Operator only')}</option><option value="approved_families">{L(t, 'অনুমোদিত পরিবার', 'Approved families')}</option></select></label>
      <label>{L(t, 'যোগাযোগ কে দেখতে পারবে', 'Who can see contact')} <select value={privacy.showContactTo} onChange={(e) => setPrivacy({ ...privacy, showContactTo: e.target.value })}><option value="operator_only">{L(t, 'শুধু অপারেটর', 'Operator only')}</option><option value="approved_families">{L(t, 'অনুমোদিত পরিবার', 'Approved families')}</option></select></label>
      <button className="primary" type="submit">{L(t, 'সংরক্ষণ করুন', 'Save')}</button>
    </form>
    <h3>{L(t, 'OTP যাচাই (ডেলিভারি প্রোভাইডার অনুমোদন সাপেক্ষে)', 'OTP verification (delivery requires an approved provider)')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); try { await api('/auth/verify-otp', { method: 'POST', body: { code: otp } }); alert(L(t, 'যাচাই হয়েছে', 'Verified')); } catch (err) { alert(err.message); } }}>
      <button type="button" onClick={async () => { try { const d = await api('/auth/request-otp', { method: 'POST', body: {} }); alert(d.message); } catch (err) { alert(err.message); } }}>{L(t, 'OTP অনুরোধ করুন', 'Request OTP')}</button>
      <input placeholder="OTP code" value={otp} onChange={(e) => setOtp(e.target.value)} /><button className="primary" type="submit">{L(t, 'যাচাই করুন', 'Verify')}</button>
    </form>
    <h3>{L(t, 'পেমেন্ট জমা দিন (ম্যানুয়াল অনুমোদন)', 'Submit payment (manual approval)')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); try { await api('/payments', { method: 'POST', body: pay }); load(); } catch (err) { alert(err.message); } }}>
      <select value={pay.package} onChange={(e) => setPay({ ...pay, package: e.target.value })} required><option value="">{L(t, 'প্যাকেজ বেছে নিন', 'Choose package')}</option>{pkgs.map((x) => <option key={x._id} value={x._id}>{x.name} · ৳{x.priceBDT}</option>)}</select>
      <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option value="bKash">bKash</option><option value="Nagad">Nagad</option><option value="Rocket">Rocket</option><option value="Manual">Manual</option></select>
      <input placeholder="Transaction ID / receipt note" value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} />
      <button className="primary" type="submit">{L(t, 'পেমেন্ট জমা দিন', 'Submit payment')}</button>
    </form>
    <p>{L(t, 'গেটওয়ে (bKash/Nagad/Rocket/SSLCommerz) মার্চেন্ট অনুমোদন ছাড়া চালু নয়।', 'Gateways are disabled until merchant credentials are approved.')}</p>
    <List title={L(t, 'আমার বায়োডাটা', 'My biodata')} items={mine} render={(x) => <span>{x.profileType} · {x.age} · {x.district} · <b>{x.status}</b></span>} />
    <List title={L(t, 'সাজেস্টেড ম্যাচ', 'Suggested matches')} items={sugg} render={(x) => <span>{x.profileType} · {x.age} · {x.profession} · {x.district}</span>} />
    <List title="Shortlist" items={short} render={(x) => <span>{x.biodata ? `${x.biodata.profileType} · ${x.biodata.age} · ${x.biodata.district}` : '—'} <button onClick={async () => { await api(`/shortlists/${x.id || x._id}`, { method: 'DELETE' }); load(); }}>{L(t, 'মুছুন', 'Remove')}</button></span>} />
    <List title={L(t, 'আমার পাঠানো আগ্রহ', 'My sent interests')} items={myInterests} render={(x) => <span>{x.targetBiodata} · <b>{x.status}</b></span>} />
    <List title={L(t, 'আমাকে দেওয়া সম্মতি', 'Consents granted to me')} items={myConsents} render={(x) => <span>{x.scope} · <b>{x.status}</b></span>} />
    <List title={L(t, 'পেমেন্ট ইতিহাস', 'Payment history')} items={payments} render={(x) => <span>{x.method} · ৳{x.amountBDT} · <b>{x.status}</b></span>} />
    <List title="Notifications" items={notifs} render={(x) => <span><b>{x.title}</b> — {x.body} {!x.read && <button onClick={async () => { await api(`/notifications/${x._id}/read`, { method: 'PATCH', body: {} }); load(); }}>{L(t, 'পড়া হয়েছে', 'Mark read')}</button>}</span>} />
    <p><button onClick={async () => { if (confirm(L(t, 'অ্যাকাউন্ট মুছে ফেলতে চান?', 'Delete your account?'))) { await api('/auth/me', { method: 'DELETE' }); location.hash = '#home'; location.reload(); } }}>{L(t, 'অ্যাকাউন্ট মুছুন', 'Delete account')}</button></p>
  </section>;
}

export function MatchmakerDashboard({ t }) {
  const [all, setAll] = React.useState([]); const [interests, setInterests] = React.useState([]); const [follow, setFollow] = React.useState([]); const [consents, setConsents] = React.useState([]); const [tickets, setTickets] = React.useState([]);
  const [note, setNote] = React.useState(''); const [consent, setConsent] = React.useState({ biodata: '', sharedWithUser: '', scope: 'biodata' });
  const load = () => { api('/biodata').then((d) => setAll(d.biodatas || [])).catch(() => {}); api('/interests').then((d) => setInterests(d.interests || [])).catch(() => {}); api('/followups').then((d) => setFollow(d.followups || [])).catch(() => {}); api('/consents').then((d) => setConsents(d.consents || [])).catch(() => {}); api('/support').then((d) => setTickets(d.tickets || [])).catch(() => {}); };
  React.useEffect(load, []);
  const [bioForm, setBioForm] = React.useState({ profileType: 'bride', age: '', profession: '', district: '', education: '', maritalStatus: 'unmarried', religion: '', heightCm: '' });
  const [photoBio, setPhotoBio] = React.useState(''); const [photoFile, setPhotoFile] = React.useState(null);
  return <section className="content-section"><h2>{t.dashboard} — Matchmaker</h2>
    <h3>{L(t, 'অপারেটর হিসেবে বায়োডাটা তৈরি করুন (অফলাইন ক্লায়েন্টসহ)', 'Create biodata as operator (including offline clients)')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); try { await api('/biodata', { method: 'POST', body: { ...bioForm, age: Number(bioForm.age) || undefined, heightCm: Number(bioForm.heightCm) || undefined } }); load(); } catch (err) { alert(err.message); } }}>
      <select value={bioForm.profileType} onChange={(e) => setBioForm({ ...bioForm, profileType: e.target.value })}><option value="bride">{t.bride}</option><option value="groom">{t.groom}</option></select>
      <input placeholder="Age" value={bioForm.age} onChange={(e) => setBioForm({ ...bioForm, age: e.target.value })} /><input placeholder="Profession" value={bioForm.profession} onChange={(e) => setBioForm({ ...bioForm, profession: e.target.value })} /><input placeholder="District" value={bioForm.district} onChange={(e) => setBioForm({ ...bioForm, district: e.target.value })} /><input placeholder="Education" value={bioForm.education} onChange={(e) => setBioForm({ ...bioForm, education: e.target.value })} /><input placeholder="Religion" value={bioForm.religion} onChange={(e) => setBioForm({ ...bioForm, religion: e.target.value })} /><input placeholder="Height (cm)" value={bioForm.heightCm} onChange={(e) => setBioForm({ ...bioForm, heightCm: e.target.value })} />
      <button className="primary" type="submit">{L(t, 'বায়োডাটা জমা দিন', 'Submit biodata')}</button>
    </form>
    <h3>{L(t, 'ছবি আপলোড (ব্যক্তিগত)', 'Upload photo (private)')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); if (!photoFile || !photoBio) { alert(L(t, 'বায়োডাটা ও ছবি বেছে নিন', 'Choose a biodata and a photo')); return; } const fd = new FormData(); fd.append('photo', photoFile); fd.append('biodataId', photoBio); try { await apiForm('/uploads', fd); alert(L(t, 'ছবি আপলোড হয়েছে', 'Photo uploaded')); } catch (err) { alert(err.message); } }}>
      <select value={photoBio} onChange={(e) => setPhotoBio(e.target.value)}><option value="">{L(t, 'বায়োডাটা বেছে নিন', 'Choose biodata')}</option>{all.map((x) => <option key={x._id} value={x._id}>{x.profileType} · {x.age} · {x.district}</option>)}</select>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files[0])} />
      <button className="primary" type="submit">{L(t, 'আপলোড করুন', 'Upload')}</button>
    </form>
    <List title={L(t, 'সব বায়োডাটা (অনুমোদন)', 'All biodata (approval)')} items={all} render={(x) => <span>{x.profileType} · {x.age} · {x.district} · <b>{x.status}</b> <button onClick={async () => { await api(`/biodata/${x._id}/status`, { method: 'PATCH', body: { status: 'published' } }); load(); }}>{L(t, 'প্রকাশ করুন', 'Publish')}</button> <button onClick={async () => { await api(`/biodata/${x._id}/status`, { method: 'PATCH', body: { status: 'rejected' } }); load(); }}>{L(t, 'বাতিল করুন', 'Reject')}</button></span>} />
    <List title="Interests (to operator)" items={interests} render={(x) => <span>{x.targetBiodata} · <b>{x.status}</b> <button onClick={async () => { await api(`/interests/${x._id}`, { method: 'PATCH', body: { status: 'forwarded' } }); load(); }}>Forward</button> <button onClick={async () => { await api(`/interests/${x._id}`, { method: 'PATCH', body: { status: 'meeting_scheduled' } }); load(); }}>{L(t, 'মিটিং ঠিক করুন', 'Schedule meeting')}</button></span>} />
    <h3>{L(t, 'সম্মতি রেকর্ড করুন (শেয়ারের আগে বাধ্যতামূলক)', 'Record consent (required before sharing)')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); try { await api('/consents', { method: 'POST', body: consent }); load(); } catch (err) { alert(err.message); } }}>
      <input placeholder="Biodata ID" value={consent.biodata} onChange={(e) => setConsent({ ...consent, biodata: e.target.value })} required />
      <input placeholder="Shared with user ID" value={consent.sharedWithUser} onChange={(e) => setConsent({ ...consent, sharedWithUser: e.target.value })} required />
      <select value={consent.scope} onChange={(e) => setConsent({ ...consent, scope: e.target.value })}><option value="biodata">biodata</option><option value="photos">photos</option><option value="contact">contact</option><option value="all">all</option></select>
      <button className="primary" type="submit">{L(t, 'সম্মতি সংরক্ষণ করুন', 'Save consent')}</button>
    </form>
    <List title="Consents" items={consents} render={(x) => <span>{x.scope} · <b>{x.status}</b> <button onClick={async () => { await api(`/consents/${x._id}/revoke`, { method: 'PATCH', body: {} }); load(); }}>{L(t, 'বাতিল করুন', 'Revoke')}</button></span>} />
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); await api('/followups', { method: 'POST', body: { note, type: 'follow_up' } }); setNote(''); load(); }}><input placeholder="Follow-up note" value={note} onChange={(e) => setNote(e.target.value)} required /><button className="primary" type="submit">Add follow-up</button></form>
    <List title="Follow-ups" items={follow} render={(x) => <span>{x.note} · <b>{x.status}</b></span>} />
    <List title="Support tickets" items={tickets} render={(x) => <span><b>{x.subject}</b> — {x.message} · <b>{x.status}</b></span>} />
  </section>;
}

export function AdminDashboard({ t }) {
  const [users, setUsers] = React.useState([]); const [payments, setPayments] = React.useState([]); const [pkgs, setPkgs] = React.useState([]); const [analytics, setAnalytics] = React.useState(null); const [content, setContent] = React.useState({ type: 'faq', title: '', slug: '', body: '' }); const [settings, setSettings] = React.useState([]); const [setting, setSetting] = React.useState({ key: '', value: '' }); const [tickets, setTickets] = React.useState([]); const [logs, setLogs] = React.useState([]); const [pkgForm, setPkgForm] = React.useState({ name: '', priceBDT: '', durationDays: '30' }); const [bios, setBios] = React.useState([]); const [interests, setInterests] = React.useState([]);
  const load = () => { api('/admin/users').then((d) => setUsers(d.users || [])).catch(() => {}); api('/payments').then((d) => setPayments(d.payments || [])).catch(() => {}); api('/packages').then((d) => setPkgs(d.packages || [])).catch(() => {}); api('/admin/analytics').then((d) => setAnalytics(d.analytics)).catch(() => {}); api('/admin/settings').then((d) => setSettings(d.settings || [])).catch(() => {}); api('/support').then((d) => setTickets(d.tickets || [])).catch(() => {}); api('/admin/audit').then((d) => setLogs(d.logs || [])).catch(() => {}); api('/biodata').then((d) => setBios(d.biodatas || [])).catch(() => {}); api('/interests').then((d) => setInterests(d.interests || [])).catch(() => {}); };
  React.useEffect(load, []);
  return <section className="content-section"><h2>{t.dashboard} — Admin / Owner</h2>
    {analytics && <p>Users: {analytics.users} · Biodatas: {analytics.biodatas} · Published: {analytics.published} · Payments: {analytics.payments}</p>}
    <List title={L(t, 'সব বায়োডাটা (অনুমোদন)', 'All biodata (approval)')} items={bios} render={(x) => <span>{x.profileType} · {x.age} · {x.district} · <b>{x.status}</b> <button onClick={async () => { await api(`/biodata/${x._id}/status`, { method: 'PATCH', body: { status: 'published' } }); load(); }}>{L(t, 'প্রকাশ করুন', 'Publish')}</button> <button onClick={async () => { await api(`/biodata/${x._id}/status`, { method: 'PATCH', body: { status: 'rejected' } }); load(); }}>{L(t, 'বাতিল করুন', 'Reject')}</button></span>} />
    <List title="Interests (to operator)" items={interests} render={(x) => <span>{x.targetBiodata} · <b>{x.status}</b> <button onClick={async () => { await api(`/interests/${x._id}`, { method: 'PATCH', body: { status: 'forwarded' } }); load(); }}>Forward</button> <button onClick={async () => { await api(`/interests/${x._id}`, { method: 'PATCH', body: { status: 'meeting_scheduled' } }); load(); }}>{L(t, 'মিটিং ঠিক করুন', 'Schedule meeting')}</button></span>} />
    <List title="Users" items={users} render={(x) => <span>{x.fullName} · {x.email} · {x.role} · {x.accountStatus} <button onClick={async () => { await api(`/admin/users/${x._id}`, { method: 'PATCH', body: { accountStatus: 'active' } }); load(); }}>Activate</button> <button onClick={async () => { await api(`/admin/users/${x._id}`, { method: 'PATCH', body: { role: 'matchmaker' } }); load(); }}>Make matchmaker</button> <button onClick={async () => { if (confirm('Delete this user?')) { await api(`/admin/users/${x._id}`, { method: 'DELETE' }); load(); } }}>{L(t, 'মুছুন', 'Delete')}</button></span>} />
    <List title="Payments" items={payments} render={(x) => <span>{x.method} · ৳{x.amountBDT} · <b>{x.status}</b> <button onClick={async () => { await api(`/payments/${x._id}`, { method: 'PATCH', body: { status: 'approved' } }); load(); }}>Approve</button> <button onClick={async () => { await api(`/payments/${x._id}`, { method: 'PATCH', body: { status: 'rejected' } }); load(); }}>Reject</button> <button onClick={async () => { await api(`/payments/${x._id}`, { method: 'PATCH', body: { status: 'refunded' } }); load(); }}>Refund</button></span>} />
    <h3>{L(t, 'প্যাকেজ যোগ / সম্পাদনা (দাম শুধু ক্লায়েন্ট অনুমোদনের পর চূড়ান্ত)', 'Add / edit packages (prices final only after owner approval)')}</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); await api('/packages', { method: 'POST', body: { ...pkgForm, priceBDT: Number(pkgForm.priceBDT), durationDays: Number(pkgForm.durationDays) } }); load(); }}><input placeholder="Name" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} required /><input placeholder="Price BDT" value={pkgForm.priceBDT} onChange={(e) => setPkgForm({ ...pkgForm, priceBDT: e.target.value })} required /><input placeholder="Duration days" value={pkgForm.durationDays} onChange={(e) => setPkgForm({ ...pkgForm, durationDays: e.target.value })} /><button className="primary" type="submit">Add package</button></form>
    <List title="Packages" items={pkgs} render={(x) => <span>{x.name} · ৳{x.priceBDT} · {x.durationDays} days <button onClick={async () => { const v = prompt('New price BDT', String(x.priceBDT)); if (v) { await api(`/packages/${x._id}`, { method: 'PATCH', body: { priceBDT: Number(v) } }); load(); } }}>Edit price</button> <button onClick={async () => { await api(`/packages/${x._id}`, { method: 'DELETE' }); load(); }}>Delete</button></span>} />
    <h3>Content (Blog / FAQ / Banner / Page)</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); await api('/content', { method: 'POST', body: content }); setContent({ type: 'faq', title: '', slug: '', body: '' }); load(); }}><select value={content.type} onChange={(e) => setContent({ ...content, type: e.target.value })}><option value="faq">FAQ</option><option value="blog">Blog</option><option value="banner">Banner</option><option value="page">Page</option></select><input placeholder="Title" value={content.title} onChange={(e) => setContent({ ...content, title: e.target.value })} required /><input placeholder="Slug (for pages: privacy, terms)" value={content.slug} onChange={(e) => setContent({ ...content, slug: e.target.value })} /><textarea placeholder="Body" value={content.body} onChange={(e) => setContent({ ...content, body: e.target.value })} rows={4} /><button className="primary" type="submit">Publish content</button></form>
    <h3>Settings</h3>
    <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); await api('/admin/settings', { method: 'POST', body: setting }); setSetting({ key: '', value: '' }); load(); }}><input placeholder="Key" value={setting.key} onChange={(e) => setSetting({ ...setting, key: e.target.value })} required /><input placeholder="Value" value={setting.value} onChange={(e) => setSetting({ ...setting, value: e.target.value })} /><button className="primary" type="submit">Save setting</button></form>
    <List title="Settings" items={settings} render={(x) => <span>{x.key} = {x.value}</span>} />
    <List title="Support tickets" items={tickets} render={(x) => <span><b>{x.subject}</b> — {x.message} · <b>{x.status}</b> <button onClick={async () => { await api(`/support/${x._id}`, { method: 'PATCH', body: { status: 'resolved' } }); load(); }}>Resolve</button></span>} />
    <List title="Audit log" items={logs} render={(x) => <span>{x.action} · {x.targetType} · {x.detail || ''}</span>} />
  </section>;
}
