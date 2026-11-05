import React from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';
import { T } from './i18n.js';
import { Home, About, ProfileList, ProfileDetails, SearchPage, HowPage, MembershipPage, StoriesPage, ContentPage, ContactPage, PolicyPage, AuthPage } from './pages.jsx';
import { MemberDashboard, MatchmakerDashboard, AdminDashboard } from './dashboards.jsx';
import './styles.css';

function parseHash() {
  const raw = (location.hash || '#home').slice(1);
  const [page, param] = raw.split('/');
  return { page, param };
}
function App() {
  const [route, setRoute] = React.useState(parseHash());
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [lang, setLang] = React.useState('bn');
  const [user, setUser] = React.useState(null);
  const [status, setStatus] = React.useState('Checking backend…');
  const [maintenance, setMaintenance] = React.useState(false);
  const t = { ...T[lang], lang };
  const go = (page, param) => { location.hash = param ? `#${page}/${param}` : `#${page}`; };
  React.useEffect(() => {
    const onHash = () => { setRoute(parseHash()); setMenuOpen(false); };
    window.addEventListener('hashchange', onHash);
    api('/health').then((d) => setStatus(d.status === 'ok' ? 'Backend connected' : 'Backend response received')).catch(() => setStatus('Backend not connected yet'));
    api('/site-status').then((d) => setMaintenance(!!d.maintenance)).catch(() => setMaintenance(false));
    api('/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null));
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const refreshUser = () => api('/auth/me').then((d) => { setUser(d.user); go('dashboard'); }).catch(() => setUser(null));
  const logout = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); go('home'); };
  const nav = [
    ['home', t.home], ['about', t.about], ['bride', t.bride], ['groom', t.groom], ['search', t.search], ['how', t.how], ['membership', t.membership], ['stories', t.stories], ['blog', t.blog], ['faq', t.faq], ['contact', t.contact],
  ];
  let body = null;
  const p = route.page;
  if (p === 'home') body = <Home t={t} go={go} />;
  else if (p === 'about') body = <About t={t} />;
  else if (p === 'bride') body = <ProfileList t={t} type="bride" go={go} />;
  else if (p === 'groom') body = <ProfileList t={t} type="groom" go={go} />;
  else if (p === 'details') body = <ProfileDetails t={t} id={route.param} user={user} go={go} />;
  else if (p === 'search') body = <SearchPage t={t} go={go} />;
  else if (p === 'how') body = <HowPage t={t} />;
  else if (p === 'membership') body = <MembershipPage t={t} go={go} />;
  else if (p === 'stories') body = <StoriesPage t={t} />;
  else if (p === 'blog') body = <ContentPage t={t} type="blog" />;
  else if (p === 'faq') body = <ContentPage t={t} type="faq" />;
  else if (p === 'contact') body = <ContactPage t={t} />;
  else if (p === 'privacy') body = <PolicyPage t={t} kind="privacy" />;
  else if (p === 'terms') body = <PolicyPage t={t} kind="terms" />;
  else if (p === 'login') body = <AuthPage t={t} mode="login" onDone={refreshUser} />;
  else if (p === 'register') body = <AuthPage t={t} mode="register" onDone={() => go('login')} />;
  else if (p === 'dashboard') body = !user ? <AuthPage t={t} mode="login" onDone={refreshUser} /> : user.role === 'matchmaker' ? <MatchmakerDashboard t={t} /> : (user.role === 'admin' || user.role === 'owner') ? <AdminDashboard t={t} /> : <MemberDashboard t={t} user={user} />;
  else body = <Home t={t} go={go} />;
  return <div className="app-shell">
    <div className="wg-topstrip"><span>Shaadi Mobarak · Marriage Media</span><span><a href="tel:+8801843253756">+880 1843-253756</a> · <a href="mailto:bd.shaadimobarak@gmail.com">bd.shaadimobarak@gmail.com</a></span></div>
    <header className="topbar"><a className="brand" href="#home"><img className="brand-logo" src="/logo.png" alt="Shaadi Mobarak" /><span><img className="brand-name-img" src="/name-ornate.png" alt="Shaadi Mobarak" /><small>শাদি মোবারক · Marriage Media</small></span></a><button className="menu-btn" aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button><nav className={menuOpen ? 'open' : ''}>{nav.map(([k, label]) => <a key={k} href={`#${k}`}>{label}</a>)}{user ? <><button className="nav-btn" onClick={() => go('dashboard')}>{t.dashboard}</button><button className="nav-btn" onClick={logout}>{t.logout}</button></> : <><button className="nav-btn" onClick={() => go('login')}>{t.login}</button><button className="nav-btn" onClick={() => go('register')}>{t.register}</button></>}<button className="nav-btn" onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}>{lang === 'bn' ? 'EN' : 'বাংলা'}</button></nav><button className="hdr-btn" onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}>{lang === 'bn' ? 'EN' : 'বাংলা'}</button>{user ? <><button className="hdr-btn" onClick={() => go('dashboard')}>{t.dashboard}</button><button className="hdr-btn" onClick={logout}>{t.logout}</button></> : <><button className="hdr-btn" onClick={() => go('login')}>{t.login}</button><button className="hdr-btn" onClick={() => go('register')}>{t.register}</button></>}</header>
    <main>{maintenance && <div className="maintenance-banner">{t.lang === 'bn' ? 'ওয়েবসাইটটি সাময়িক রক্ষণাবেক্ষণে আছে — কিছুক্ষণ পর আবার চেষ্টা করুন।' : 'This website is under maintenance — please try again shortly.'}</div>}{body}</main>
    <footer><div><b>Support</b><br />+880 1843-253756 · bd.shaadimobarak@gmail.com<br />{t.office}</div><span>© {new Date().getFullYear()} Shaadi Mobarak. All rights reserved.</span><span><a href="#privacy">{t.privacy}</a> · <a href="#terms">{t.terms}</a> · <a href="#contact">{t.contact}</a></span><span className="api-status"><i /> {status}</span></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
