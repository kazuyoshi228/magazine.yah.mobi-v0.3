import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Header, { type Lang } from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/BackToTop";

// Pages
import Home from "./pages/Home";
import ArticleList from "./pages/ArticleList";
import ArticleDetail from "./pages/ArticleDetail";
import CmsAdmin from "./pages/CmsAdmin";
import CmsArticleEdit from "./pages/CmsArticleEdit";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBrandGuidelines from "./pages/AdminBrandGuidelines";
import AdminCurators from "./pages/AdminCurators";
import AdminAiWriters from "./pages/AdminAiWriters";
import AdminMenu from "./pages/AdminMenu";
import Writers from "./pages/Writers";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

function Router({ lang, onLangChange }: { lang: Lang; onLangChange: (l: Lang) => void }) {
  return (
    <>
      <ScrollToTop />
      <Header lang={lang} onLangChange={onLangChange} />
      <main style={{ minHeight: "calc(100vh - 56px)" }}>
        <Switch>
          <Route path="/" component={() => <Home lang={lang} />} />
          <Route path="/articles" component={() => <ArticleList lang={lang} />} />
          <Route path="/articles/:slug" component={({ params }) => <ArticleDetail slug={params.slug} lang={lang} />} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/cms" component={CmsAdmin} />
          <Route path="/admin/cms/new" component={() => <CmsArticleEdit articleId={null} />} />
          <Route path="/admin/cms/:id" component={({ params }) => <CmsArticleEdit articleId={Number(params.id)} />} />
          <Route path="/admin/brand-guidelines" component={AdminBrandGuidelines} />
          <Route path="/admin/curators" component={AdminCurators} />
          <Route path="/admin/ai-writers" component={AdminAiWriters} />
          <Route path="/admin/menu" component={AdminMenu} />
          <Route path="/writers" component={Writers} />
          <Route path="/login" component={Login} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer lang={lang} />
      <BackToTop />
    </>
  );
}

function App() {
  const [lang, setLang] = useState<Lang>("ja");

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router lang={lang} onLangChange={setLang} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
