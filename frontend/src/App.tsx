import { useState, useEffect } from "react";
import { HttpClient } from "./components/HttpClient";
import { Box, Flex, Theme } from "@radix-ui/themes";
import "./style.css";
import { ThemeProvider } from "next-themes";
import { Header } from "./components/Header";
import { FileTree } from "./components/FileTree";

function App() {
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);

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

  return (
    // @ts-ignore
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="postier-theme"
    >
      <Theme accentColor="tomato" radius="small" style={{ width: '100vw' }}>
        <Header/>
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
    </ThemeProvider>
  );
}

export default App;
