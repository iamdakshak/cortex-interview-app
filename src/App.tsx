import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

import Home from "@/pages/Home";
import QuestionEdit from "@/pages/QuestionEdit";
import Compiler from "@/pages/Compiler";
import Sandbox from "@/pages/Sandbox";
import Daily from "@/pages/Daily";
import Explore from "@/pages/Explore";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="questions/:id" element={<Navigate to="/" replace />} />
              <Route path="new" element={<ProtectedRoute adminOnly><QuestionEdit /></ProtectedRoute>} />
              <Route path="edit/:id" element={<ProtectedRoute adminOnly><QuestionEdit /></ProtectedRoute>} />
              <Route path="compiler" element={<ProtectedRoute><Compiler /></ProtectedRoute>} />
              <Route path="sandbox" element={<ProtectedRoute><Sandbox /></ProtectedRoute>} />
              <Route path="daily" element={<ProtectedRoute><Daily /></ProtectedRoute>} />
              <Route path="explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
