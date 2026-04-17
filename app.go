package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	goruntime "runtime"
	"os/exec"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if dir, err := a.GetThemesDir(); err == nil {
		seedThemesDir(dir)
	}
}

// seedThemesDir writes two example theme files when the themes directory
// contains no JSON files, giving users a starting point for customisation.
func seedThemesDir(dir string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".json") {
			return // already populated
		}
	}

	// ── Agrume ───────────────────────────────────────────────────────────────
	// Complete light theme: warm citrus palette, no white — everything amber/honey tinted.
	// Gray scale goes from warm honey cream (step 1) to deep espresso brown (step 12).
	agrume := UserTheme{
		Name:       "Agrume",
		Appearance: "light",
		Vars: map[string]string{
			// Page & surfaces — soft warm cream, closer to white but still citrus-kissed
			"--color-background":        "#fdf8f0",
			"--color-surface":           "#f8eccc", // recessed inputs, amber tint becomes visible
			"--color-panel-solid":       "#fffcf7", // panels float just above bg
			"--color-panel-translucent": "#fffcf7",
			"--color-overlay":           "rgba(120,70,10,0.3)",

			// Gray scale — warm amber progression, lightest → darkest
			"--gray-1":  "#fffcf7", // barely-there warm tint — almost white
			"--gray-2":  "#fdf8f0", // soft warm cream (= background)
			"--gray-3":  "#f8eccc", // amber tint becomes noticeable
			"--gray-4":  "#f0cc78", // golden amber
			"--gray-5":  "#e0b250", // medium amber
			"--gray-6":  "#c89030", // warm orange-amber
			"--gray-7":  "#a87020", // burnt amber
			"--gray-8":  "#8a5418", // bronze brown
			"--gray-9":  "#6e3e10", // dark bronze
			"--gray-10": "#522e0c", // deep brown
			"--gray-11": "#3a2008", // espresso
			"--gray-12": "#241408", // near-black espresso
			"--gray-surface":   "#f8dfa0",
			"--gray-indicator": "#8a5418",
			"--gray-track":     "#8a5418",
			"--gray-contrast":  "#241408",

			// Alpha scale for gray — rgba of step 8 bronze at varying opacities
			"--gray-a1":  "rgba(138,84,24,0.04)",
			"--gray-a2":  "rgba(138,84,24,0.07)",
			"--gray-a3":  "rgba(138,84,24,0.12)",
			"--gray-a4":  "rgba(138,84,24,0.17)",
			"--gray-a5":  "rgba(138,84,24,0.22)",
			"--gray-a6":  "rgba(138,84,24,0.30)",
			"--gray-a7":  "rgba(138,84,24,0.44)",
			"--gray-a8":  "rgba(138,84,24,0.60)",
			"--gray-a9":  "#6e3e10",
			"--gray-a10": "#522e0c",
			"--gray-a11": "#3a2008",
			"--gray-a12": "#241408",

			// Accent scale — vivid citrus orange (#e85a10 at step 9)
			"--accent-1":  "#fff4ec",
			"--accent-2":  "#ffe8d4",
			"--accent-3":  "#ffd4b0",
			"--accent-4":  "#ffbc88",
			"--accent-5":  "#f9a060",
			"--accent-6":  "#f07838",
			"--accent-7":  "#e05c1e",
			"--accent-8":  "#c84810",
			"--accent-9":  "#e85a10", // vivid citrus — the brand color
			"--accent-10": "#d04a08",
			"--accent-11": "#a83808",
			"--accent-12": "#5c1c00",
			"--accent-surface":   "#ffe8d4",
			"--accent-indicator": "#e85a10",
			"--accent-track":     "#e85a10",
			"--accent-contrast":  "#ffffff",

			// Alpha scale for accent — rgba of citrus orange at varying opacities
			"--accent-a1":  "rgba(232,90,16,0.04)",
			"--accent-a2":  "rgba(232,90,16,0.07)",
			"--accent-a3":  "rgba(232,90,16,0.12)",
			"--accent-a4":  "rgba(232,90,16,0.17)",
			"--accent-a5":  "rgba(232,90,16,0.22)",
			"--accent-a6":  "rgba(232,90,16,0.30)",
			"--accent-a7":  "rgba(232,90,16,0.44)",
			"--accent-a8":  "rgba(232,90,16,0.60)",
			"--accent-a9":  "#e85a10",
			"--accent-a10": "#d04a08",
			"--accent-a11": "#a83808",
			"--accent-a12": "#5c1c00",
		},
	}

	// ── Neovim Dark ──────────────────────────────────────────────────────────
	// Simple dark theme inspired by the Neovim website palette.
	// The generator derives the full scale from these three seed colors.
	neovimDark := UserTheme{
		Name:       "Neovim Dark",
		Appearance: "dark",
		Accent:     "#61ff00", // lime green — Neovim's brand highlight
		Background: "#0b151b", // dark teal-black — accent-bg-color
		Gray:       "#5a8a9a", // mid teal — drives the teal-dark gray scale
	}

	writeThemeFile(dir, "agrume.json", agrume)
	writeThemeFile(dir, "neovim-dark.json", neovimDark)
}

// writeThemeFile serialises a UserTheme as indented JSON into dir/filename.
// Errors are silently ignored — example seeding is best-effort.
func writeThemeFile(dir, filename string, theme UserTheme) {
	data, err := json.MarshalIndent(theme, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(filepath.Join(dir, filename), data, 0644)
}

// HTTPRequest represents an HTTP request to be made
type HTTPRequest struct {
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	Query       map[string]string `json:"query"`
	EnvFilePath string            `json:"envFilePath,omitempty"` // path to the collection root; .postier.env is resolved from it
}

// EffectiveRequest holds a snapshot of the request with the URL fully built
// (query params encoded). Used for both raw (pre-interpolation) and effective
// (post-interpolation) representations returned alongside the response.
type EffectiveRequest struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

// HTTPResponse represents the response from an HTTP request
type HTTPResponse struct {
	StatusCode int                 `json:"statusCode"`
	Status     string              `json:"status"`
	Headers    map[string][]string `json:"headers"`
	Cookies    []HTTPCookie        `json:"cookies"`
	Body       string              `json:"body"`
	Size       int64               `json:"size"`
	Duration   int64               `json:"duration"` // in milliseconds
	Raw        EffectiveRequest    `json:"raw"`       // pre-interpolation, {{placeholders}} intact
	Effective  EffectiveRequest    `json:"effective"` // post-interpolation, vars resolved
}

// copyMap returns a shallow copy of m so the original is not mutated.
func copyMap(m map[string]string) map[string]string {
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

// HTTPCookie represents an HTTP cookie
type HTTPCookie struct {
	Name     string    `json:"name"`
	Value    string    `json:"value"`
	Domain   string    `json:"domain"`
	Path     string    `json:"path"`
	Expires  time.Time `json:"expires"`
	Secure   bool      `json:"secure"`
	HTTPOnly bool      `json:"httpOnly"`
}

// interpolate replaces every {{KEY}} placeholder in s with the matching value from vars.
// Unknown placeholders are left unchanged.
func interpolate(s string, vars map[string]string) string {
	for key, value := range vars {
		s = strings.ReplaceAll(s, "{{"+key+"}}", value)
	}
	return s
}

// ReadEnvFile reads the .postier.env file from collectionPath and returns the key-value pairs.
// Returns an empty map (not an error) when the file does not exist.
func (a *App) ReadEnvFile(collectionPath string) (map[string]string, error) {
	envPath := filepath.Join(collectionPath, ".postier.env")
	content, err := os.ReadFile(envPath)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]string{}, nil
		}
		return nil, fmt.Errorf("failed to read env file: %v", err)
	}

	var vars map[string]string
	if err := json.Unmarshal(content, &vars); err != nil {
		return nil, fmt.Errorf("failed to parse env file: %v", err)
	}
	return vars, nil
}

// WriteEnvFile writes vars to the .postier.env file inside collectionPath.
// The file is created with 0600 permissions so only the owner can read it.
func (a *App) WriteEnvFile(collectionPath string, vars map[string]string) error {
	envPath := filepath.Join(collectionPath, ".postier.env")
	content, err := json.MarshalIndent(vars, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal env vars: %v", err)
	}
	return os.WriteFile(envPath, content, 0600)
}

// MakeRequest performs an HTTP request and returns the response
func (a *App) MakeRequest(req HTTPRequest) HTTPResponse {
	startTime := time.Now()

	// Capture the raw request snapshot before any interpolation.
	// Build the raw URL with query params merged so it mirrors the effective shape.
	rawHeaders := copyMap(req.Headers)
	rawBody := req.Body
	rawURL := req.URL
	if rawParsed, err := url.Parse(rawURL); err == nil {
		if len(req.Query) > 0 {
			q := rawParsed.Query()
			for k, v := range req.Query {
				q.Add(k, v)
			}
			rawParsed.RawQuery = q.Encode()
		}
		rawURL = rawParsed.String()
	}
	raw := EffectiveRequest{
		Method:  req.Method,
		URL:     rawURL,
		Headers: rawHeaders,
		Body:    rawBody,
	}

	// Apply environment variable substitution when a collection path is provided
	if req.EnvFilePath != "" {
		vars, err := a.ReadEnvFile(req.EnvFilePath)
		if err == nil && len(vars) > 0 {
			req.URL = interpolate(req.URL, vars)
			req.Body = interpolate(req.Body, vars)
			for k, v := range req.Headers {
				req.Headers[k] = interpolate(v, vars)
			}
			for k, v := range req.Query {
				req.Query[k] = interpolate(v, vars)
			}
		}
	}

	// Parse and validate URL
	parsedURL, err := url.Parse(req.URL)
	if err != nil {
		return HTTPResponse{
			StatusCode: 0,
			Status:     "Invalid URL",
			Body:       fmt.Sprintf("Error parsing URL: %v", err),
			Duration:   time.Since(startTime).Microseconds(),
		}
	}

	// Add query parameters
	if len(req.Query) > 0 {
		query := parsedURL.Query()
		for key, value := range req.Query {
			query.Add(key, value)
		}
		parsedURL.RawQuery = query.Encode()
	}

	// Capture effective request (post-interpolation, full URL)
	effective := EffectiveRequest{
		Method:  req.Method,
		URL:     parsedURL.String(),
		Headers: req.Headers,
		Body:    req.Body,
	}

	// Create HTTP request
	var bodyReader io.Reader
	if req.Body != "" {
		bodyReader = strings.NewReader(req.Body)
	}

	httpReq, err := http.NewRequest(req.Method, parsedURL.String(), bodyReader)
	if err != nil {
		return HTTPResponse{
			StatusCode: 0,
			Status:     "Request Creation Error",
			Body:       fmt.Sprintf("Error creating request: %v", err),
			Duration:   time.Since(startTime).Microseconds(),
		}
	}

	// Add headers
	for key, value := range req.Headers {
		httpReq.Header.Set(key, value)
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Make the request
	resp, err := client.Do(httpReq)
	if err != nil {
		return HTTPResponse{
			StatusCode: 0,
			Status:     "Request Error",
			Body:       fmt.Sprintf("Error making request: %v", err),
			Duration:   time.Since(startTime).Microseconds(),
		}
	}
	defer resp.Body.Close()

	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return HTTPResponse{
			StatusCode: resp.StatusCode,
			Status:     resp.Status,
			Headers:    resp.Header,
			Body:       fmt.Sprintf("Error reading response body: %v", err),
			Duration:   time.Since(startTime).Microseconds(),
		}
	}

	// Extract cookies
	var cookies []HTTPCookie
	for _, cookie := range resp.Cookies() {
		cookies = append(cookies, HTTPCookie{
			Name:     cookie.Name,
			Value:    cookie.Value,
			Domain:   cookie.Domain,
			Path:     cookie.Path,
			Expires:  cookie.Expires,
			Secure:   cookie.Secure,
			HTTPOnly: cookie.HttpOnly,
		})
	}

	return HTTPResponse{
		StatusCode: resp.StatusCode,
		Status:     resp.Status,
		Headers:    resp.Header,
		Cookies:    cookies,
		Body:       string(bodyBytes),
		Size:       int64(len(bodyBytes)),
		Duration:   time.Since(startTime).Microseconds(),
		Raw:        raw,
		Effective:  effective,
	}
}

// FileSystemEntry represents a file or directory entry
type FileSystemEntry struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsDir    bool   `json:"isDir"`
	Size     int64  `json:"size"`
	Modified int64  `json:"modified"` // Unix timestamp
	Method   string `json:"method"` // the method of the request, used for some UI element
}

// DirectoryTree represents a directory structure
type DirectoryTree struct {
	Entry    FileSystemEntry `json:"entry"`
	Children []DirectoryTree `json:"children,omitempty"`
}

// PostierRequest represents a saved request in .postier format
type PostierRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	BodyType    string            `json:"bodyType"`
	Query       map[string]string `json:"query"`
	Response    *HTTPResponse     `json:"response,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

// GetDirectoryTree returns the directory structure for a given path
func (a *App) GetDirectoryTree(rootPath string) (DirectoryTree, error) {
	info, err := os.Stat(rootPath)
	if err != nil {
		return DirectoryTree{}, fmt.Errorf("failed to access path: %v", err)
	}

	entry := FileSystemEntry{
		Name:     filepath.Base(rootPath),
		Path:     rootPath,
		IsDir:    info.IsDir(),
		Size:     info.Size(),
		Modified: info.ModTime().Unix(),
		Method:   "",
	}

	tree := DirectoryTree{Entry: entry}

	if info.IsDir() {
		entries, err := os.ReadDir(rootPath)
		if err != nil {
			return tree, fmt.Errorf("failed to read directory: %v", err)
		}

		var children []DirectoryTree
		for _, entry := range entries {
			// Hide internal config files from the collection tree
			if entry.Name() == ".postier.env" {
				continue
			}

			childPath := filepath.Join(rootPath, entry.Name())
			childTree, err := a.GetDirectoryTree(childPath)
			if err != nil {
				continue // Skip entries that can't be read
			}
			if (!entry.IsDir()) {
				request, err := a.LoadPostierRequest(childPath)
				if err != nil {
					// nothing important in this context
				}
				childTree.Entry.Method = request.Method
			}
			children = append(children, childTree)
		}

		// Sort: directories first, then files, both alphabetically
		sort.Slice(children, func(i, j int) bool {
			if children[i].Entry.IsDir != children[j].Entry.IsDir {
				return children[i].Entry.IsDir // directories first
			}
			return children[i].Entry.Name < children[j].Entry.Name
		})

		tree.Children = children
	}

	return tree, nil
}

// CreateDirectory creates a new directory at the specified path
func (a *App) CreateDirectory(path string) error {
	return os.MkdirAll(path, 0755)
}

// CreateFile creates a new file with the specified content
func (a *App) CreateFile(path string, content string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %v", err)
	}

	return os.WriteFile(path, []byte(content), 0644)
}

// ReadFile reads the content of a file
func (a *App) ReadFile(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %v", err)
	}
	return string(content), nil
}

// UpdateFile updates the content of an existing file
func (a *App) UpdateFile(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

// DeleteFile deletes a file
func (a *App) DeleteFile(path string) error {
	return os.Remove(path)
}

// DeleteDirectory deletes a directory and all its contents
func (a *App) DeleteDirectory(path string) error {
	return os.RemoveAll(path)
}

// SavePostierRequest saves an HTTP request to a .postier file
func (a *App) SavePostierRequest(filePath string, request PostierRequest) error {
	request.UpdatedAt = time.Now()
	if request.CreatedAt.IsZero() {
		request.CreatedAt = request.UpdatedAt
	}

	content, err := json.MarshalIndent(request, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal request: %v", err)
	}

	// Ensure the file has .postier extension
	if !strings.HasSuffix(filePath, ".postier") {
		filePath += ".postier"
	}

	return a.CreateFile(filePath, string(content))
}

// LoadPostierRequest loads an HTTP request from a .postier file
func (a *App) LoadPostierRequest(filePath string) (PostierRequest, error) {
	var request PostierRequest

	content, err := a.ReadFile(filePath)
	if err != nil {
		return request, err
	}

	err = json.Unmarshal([]byte(content), &request)
	if err != nil {
		return request, fmt.Errorf("failed to parse postier file: %v", err)
	}

	return request, nil
}

// ListPostierFiles returns all .postier files in a directory
func (a *App) ListPostierFiles(directoryPath string) ([]FileSystemEntry, error) {
	entries, err := os.ReadDir(directoryPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %v", err)
	}

	var postierFiles []FileSystemEntry
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".postier") {
			info, err := entry.Info()
			if err != nil {
				continue
			}

			request, err := a.LoadPostierRequest(filepath.Join(directoryPath, entry.Name()))
			if err != nil {
				// do nothing this is not important in this context
			}

			postierFiles = append(postierFiles, FileSystemEntry{
				Name:     entry.Name(),
				Path:     filepath.Join(directoryPath, entry.Name()),
				IsDir:    false,
				Size:     info.Size(),
				Modified: info.ModTime().Unix(),
				Method:   request.Method,
			})
		}
	}

	// Sort alphabetically
	sort.Slice(postierFiles, func(i, j int) bool {
		return postierFiles[i].Name < postierFiles[j].Name
	})

	return postierFiles, nil
}

// RenameEntry renames or moves a file or directory atomically
func (a *App) RenameEntry(oldPath string, newPath string) error {
	return os.Rename(oldPath, newPath)
}

// UserTheme represents a theme loaded from the user's themes directory.
// Either the simple seed fields (Accent + Background + Gray) or the Vars map
// must be present; files that satisfy neither are silently skipped.
type UserTheme struct {
	Name       string            `json:"name"`
	Appearance string            `json:"appearance"` // "light" | "dark"
	// Simple theme: three seed hex colors; the app generates the full scale.
	Accent     string            `json:"accent,omitempty"`
	Background string            `json:"background,omitempty"`
	Gray       string            `json:"gray,omitempty"`
	// Complete theme: full map of Radix CSS variable overrides, applied verbatim.
	Vars       map[string]string `json:"vars,omitempty"`
}

// GetThemesDir returns the path to the user themes directory, creating it if absent.
func (a *App) GetThemesDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("cannot resolve config dir: %v", err)
	}
	dir := filepath.Join(configDir, "postier", "themes")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("cannot create themes dir: %v", err)
	}
	return dir, nil
}

// LoadUserThemes reads all .json files from the user themes directory and
// returns the valid ones. Files with missing name or invalid appearance are
// silently skipped.
func (a *App) LoadUserThemes() ([]UserTheme, error) {
	dir, err := a.GetThemesDir()
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("cannot read themes dir: %v", err)
	}

	var themes []UserTheme
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		content, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}
		var t UserTheme
		if err := json.Unmarshal(content, &t); err != nil {
			continue
		}
		if t.Name == "" || (t.Appearance != "light" && t.Appearance != "dark") {
			continue
		}
		hasSimple := t.Accent != "" && t.Background != "" && t.Gray != ""
		hasComplete := len(t.Vars) > 0
		if !hasSimple && !hasComplete {
			continue
		}
		themes = append(themes, t)
	}
	return themes, nil
}

// OpenInFileManager opens the system file manager at the given path.
// For files the parent directory is opened so the containing folder is shown.
// Uses xdg-open on Linux, open on macOS, and explorer on Windows.
func (a *App) OpenInFileManager(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("path not found: %v", err)
	}

	target := path
	if !info.IsDir() {
		target = filepath.Dir(path)
	}

	var cmd *exec.Cmd
	switch goruntime.GOOS {
	case "darwin":
		cmd = exec.Command("open", target)
	case "windows":
		cmd = exec.Command("explorer", target)
	default:
		cmd = exec.Command("xdg-open", target)
	}

	return cmd.Start()
}

// OpenFolderDialog opens a folder selection dialog and returns the selected path
func (a *App) OpenFolderDialog() (string, error) {
	selectedPath, err := wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Select Collection Folder",
	})

	if err != nil {
		return "", fmt.Errorf("failed to open folder dialog: %v", err)
	}

	// If user canceled, selectedPath will be empty
	if selectedPath == "" {
		return "", fmt.Errorf("no folder selected")
	}

	return selectedPath, nil
}
