
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { DashboardContent } from "./components/DashboardContent";
import { SubmissionsContent } from "./components/SubmissionsContent";
import { Separator } from "./components/ui/separator";
import { LoginForm } from "./components/Login";
import { SignupForm } from "./components/Signup";
import { useState } from "react";

function DashboardLayout() {
  const [activeView, setActiveView] = useState("dashboard");

  const renderContent = () => {
    switch (activeView) {
      case "submissions":
        return <SubmissionsContent />;
      case "dashboard":
      default:
        return <DashboardContent />;
    }
  };

  const getPageTitle = () => {
    switch (activeView) {
      case "submissions":
        return "Submissions";
      case "startups":
        return "Startups";
      case "metrics":
        return "Metrics";
      case "settings":
        return "Settings";
      case "dashboard":
      default:
        return "Dashboard";
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar activeItem={activeView} onNavigate={setActiveView} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-gradient-to-r from-blue-50 to-purple-50 px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">VentureX / {getPageTitle()}</span>
          </div>
        </header>
        {renderContent()}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/*" element={<DashboardLayout />} />
      </Routes>
    </Router>
  );
}
