import { Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import Home from '../pages/public/Home';
import NotFound from '../pages/public/NotFound';

/**
 * Global App Route definition.
 * Phase 0 mounts the PublicLayout with Home and NotFound catch-all.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

