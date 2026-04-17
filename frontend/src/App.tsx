import { useState, useEffect } from "react";
import { HttpClient } from "./components/HttpClient";
import { Box, Flex, Theme } from "@radix-ui/themes";
import "./style.css";
import { ThemeProvider, useTheme } from "next-themes";
import { Header } from "./components/Header";
import { FileTree } from "./components/FileTree";
import { BUILTIN_THEMES, defaultTheme, applyTheme } from "./themes";
import type { PostierTheme } from "./themes";
import { LoadUserThemes } from "../wailsjs/go/main/App";
import { useCollectionStore } from "./stores/store";

function AppInner() {
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [userThemes, setUserThemes] = useState<PostierTheme[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const { selectedThemeId } = useCollectionStore();
  const { setTheme } = useTheme();

  useEffect(() => {
    /** Toggle the sidebar with Ctrl+N */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setSidebarVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    LoadUserThemes().then(raw => {
      setUserThemes(raw.map((t, i) => ({
        ...t,
        appearance: t.appearance as 'light' | 'dark',
        id: `user-${i}-${t.name}`,
        builtin: false,
      })));
    }).catch(() => {});
  }, [reloadKey]);

  useEffect(() => {
    const all = [...BUILTIN_THEMES, ...userThemes];
    const theme = all.find(t => t.id === selectedThemeId) ?? defaultTheme;
    applyTheme(theme);
    setTheme(theme.id === 'default' ? 'system' : theme.appearance);
  }, [selectedThemeId, userThemes]);

  return (
    <Theme accentColor="tomato" radius="small" style={{ width: '100vw' }}>
      <Header userThemes={userThemes} onReloadThemes={() => setReloadKey(k => k + 1)} />
      <Flex>
        <Box
          style={{
            width: sidebarVisible ? '300px' : '0',
            minWidth: sidebarVisible ? '300px' : '0',
            overflow: 'hidden',
            transition: 'width 0.2s ease, min-width 0.2s ease',
          }}
        >
          <FileTree
            onToggleSidebar={() => setSidebarVisible(prev => !prev)}
          />
        </Box>
        <Box width="100%" p="2">
          <HttpClient
            sidebarVisible={sidebarVisible}
            onToggleSidebar={() => setSidebarVisible(prev => !prev)}
          />
        </Box>
      </Flex>
    </Theme>
  );
}

function App() {
  return (
    // @ts-ignore
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="postier-theme"
    >
      <AppInner />
    </ThemeProvider>
  );
}

export default App;
