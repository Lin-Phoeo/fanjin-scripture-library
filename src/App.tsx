import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import { AppStateProvider } from './context/AppStateContext';
const CanonLibraryPage = lazy(() => import('./pages/CanonLibraryPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const StudyPage = lazy(() => import('./pages/StudyPage'));
const BookPage = lazy(() => import('./pages/BookPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
export default function App() {
  return <AppStateProvider><HashRouter><Suspense fallback={<div className="route-loading">正在载入页面…</div>}><Routes><Route element={<SiteLayout />}>
    <Route path="/" element={<HomePage />} /><Route path="/canon" element={<CanonLibraryPage />} /><Route path="/library" element={<CanonLibraryPage />} /><Route path="/book/:slug" element={<BookPage />} /><Route path="/read/:slug/:chapterKey" element={<ReaderPage />} /><Route path="/read/:slug" element={<ReaderPage />} /><Route path="/reader" element={<Navigate replace to="/library" />} /><Route path="/reader/:scriptureId" element={<ReaderPage />} /><Route path="/study" element={<StudyPage />} /><Route path="/search" element={<SearchPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/settings" element={<ProfilePage />} /><Route path="/notes" element={<NotesPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/privacy" element={<PrivacyPage />} /><Route path="/auth" element={<Navigate replace to="/profile" />} /><Route path="/admin/*" element={<Navigate replace to="/about" />} /><Route path="/sages" element={<Navigate replace to="/library" />} /><Route path="/topics" element={<Navigate replace to="/study" />} /><Route path="/activities" element={<Navigate replace to="/study" />} /><Route path="/discussion" element={<Navigate replace to="/study" />} /><Route path="/HomePage" element={<Navigate replace to="/" />} /><Route path="*" element={<NotFoundPage />} />
  </Route></Routes></Suspense></HashRouter></AppStateProvider>;
}
