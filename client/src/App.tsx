import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ClinicLayout from "./components/ClinicLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import Visits from "./pages/Visits";
import VisitDetail from "./pages/VisitDetail";
import Prescriptions from "./pages/Prescriptions";
import Appointments from "./pages/Appointments";
import Files from "./pages/Files";
import Search from "./pages/Search";
import Reports from "./pages/Reports";
import ActivityLog from "./pages/ActivityLog";
import Settings from "./pages/Settings";
import Archive from "./pages/Archive";
import Users from "./pages/Users";

function Router() {
  return (
    <ClinicLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/patients" component={Patients} />
        <Route path="/patients/archive" component={Archive} />
        <Route path="/patients/:id" component={PatientProfile} />
        <Route path="/visits" component={Visits} />
        <Route path="/visits/:id" component={VisitDetail} />
        <Route path="/prescriptions" component={Prescriptions} />
        <Route path="/appointments" component={Appointments} />
        <Route path="/files" component={Files} />
        <Route path="/search" component={Search} />
        <Route path="/reports" component={Reports} />
        <Route path="/activity" component={ActivityLog} />
        <Route path="/settings" component={Settings} />
        <Route path="/users" component={Users} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </ClinicLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
