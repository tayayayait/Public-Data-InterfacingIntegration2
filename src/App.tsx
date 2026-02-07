import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Search from "./pages/Search";
import ManualInput from "./pages/ManualInput";
import StepSelection from "./pages/StepSelection";
import ReportGeneration from "./pages/ReportGeneration";
import ReportReview from "./pages/ReportReview";
import ReportDetail from "./pages/ReportDetail";
import Payment from "./pages/Payment";
import ReportDownload from "./pages/ReportDownload";
import MyReports from "./pages/MyReports";
import MyPage from "./pages/MyPage";
import OverviewPreview from "./pages/OverviewPreview";
import NoResults from "./pages/NoResults";
import NotFound from "./pages/NotFound";
import Library from "./pages/Library";
import SearchLoading from "./pages/SearchLoading";
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminReportLogs from "./pages/admin/AdminReportLogs";
import AdminLibrary from "./pages/admin/AdminLibrary";
import AdminLogin from "./pages/admin/AdminLogin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/search" element={<Search />} />
            <Route path="/search/progress" element={<SearchLoading />} />
            <Route path="/overview" element={<OverviewPreview />} />
            <Route path="/no-results" element={<NoResults />} />
            <Route path="/input" element={<ManualInput />} />
            <Route path="/steps" element={<StepSelection />} />
            <Route path="/report/progress" element={<ReportGeneration />} />
            <Route path="/report/review" element={<ReportReview />} />
            <Route path="/report/:id" element={<ReportDetail />} />
            <Route path="/report/:id/payment" element={<Payment />} />
            <Route path="/report/:id/download" element={<ReportDownload />} />
            <Route path="/reports" element={<MyReports />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/settings" element={<Navigate to="/mypage" replace />} />
            <Route path="/library" element={<Library />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="report-logs" element={<AdminReportLogs />} />
              <Route path="library" element={<AdminLibrary />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
