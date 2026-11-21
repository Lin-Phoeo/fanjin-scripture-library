import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import SiteLayout from './components/SiteLayout';
import { AppStateProvider } from './context/AppStateContext';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminEditorPage = lazy(() => import('./pages/AdminEditorPage'));
const AdminActivitiesPage = lazy(() => import('./pages/AdminActivitiesPage'));
const AdminTopicsPage = lazy(() => import('./pages/AdminTopicsPage'));
const AdminReviewPage = lazy(() => import('./pages/AdminReviewPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const CanonLibraryPage = lazy(() => import('./pages/CanonLibraryPage'));
const DiscussionPage = lazy(() => import('./pages/DiscussionPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const SagesPage = lazy(() => import('./pages/SagesPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const TopicsPage = lazy(() => import('./pages/TopicsPage'));

function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="route-loading">正在载入页面…</div>}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/canon" element={<CanonLibraryPage />} />
              <Route path="/sages" element={<SagesPage />} />
              <Route path="/reader" element={<Navigate replace to="/reader/diamond" />} />
              <Route path="/reader/:scriptureId" element={<ReaderPage />} />
              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/discussion" element={<DiscussionPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notes" element={<NotesPage />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="editor" element={<AdminEditorPage />} />
              <Route path="topics" element={<AdminTopicsPage />} />
              <Route path="review" element={<AdminReviewPage />} />
              <Route path="activities" element={<AdminActivitiesPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            <Route path="/HomePage" element={<Navigate replace to="/" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppStateProvider>
  );
}

export default App;
