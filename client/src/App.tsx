import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Header, { type Lang } from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/BackToTop";

// Pages
import ArticleDetail from "./pages/ArticleDetail";
import CmsAdmin from "./pages/CmsAdmin";
import CmsArticleEdit from "./pages/CmsArticleEdit";
import AdminWhitelist from "./pages/AdminWhitelist";
import AdminWriter from "./pages/AdminWriter";
import AdminAuthors from "./pages/AdminAuthors";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

function Router({ lang, onLangChange }: { lang: Lang; onLangChange: (l: Lang) => void }) {
  // 管理画面では公開サイトのメニューバーを出さず、各画面の黒いバーをメニューバーとして使う
  const [location] = useLocation();
  const isAdminPage = location.startsWith("/admin");
  return (
    <>
      <ScrollToTop />
      {!isAdminPage && <Header lang={lang} onLangChange={onLangChange} />}
      <main style={{ minHeight: "calc(100vh - 56px)" }}>
        <Switch>
          {/* 公開ホーム・記事一覧は2026-07-14に削除（magazineは胴体＝CMS本体のみ）。/ はCMSへ */}
          <Route path="/"><Redirect to="/admin/cms" /></Route>
          <Route path="/articles/:slug" component={({ params }) => <ArticleDetail slug={params.slug} lang={lang} />} />
          <Route path="/admin"><Redirect to="/admin/cms" /></Route>
          <Route path="/admin/cms" component={() => <CmsAdmin />} />
          <Route path="/admin/cms/new" component={() => <CmsArticleEdit articleId={null} />} />
          {/* カテゴリ別ビュー（記事slugより先にマッチさせる。esim等はslugとして使用不可） */}
          <Route path="/admin/cms/esim" component={() => <CmsAdmin category="esim" />} />
          <Route path="/admin/cms/gadget" component={() => <CmsAdmin category="gadget" />} />
          <Route path="/admin/cms/gourmet" component={() => <CmsAdmin category="gourmet" />} />
          <Route path="/admin/cms/travel" component={() => <CmsAdmin category="travel" />} />
          <Route path="/admin/cms/:id" component={({ params }) => <CmsArticleEdit articleId={params.id} />} />
          <Route path="/admin/whitelist" component={AdminWhitelist} />
          <Route path="/admin/writer" component={AdminWriter} />
          <Route path="/admin/authors" component={AdminAuthors} />
          <Route path="/login" component={Login} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isAdminPage && <Footer lang={lang} />}
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
