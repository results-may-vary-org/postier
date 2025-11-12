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

	"github.com/wailsapp/wails/v2/pkg/runtime"
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
}

// HTTPRequest represents an HTTP request to be made
type HTTPRequest struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
	Query   map[string]string `json:"query"`
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

// MakeRequest performs an HTTP request and returns the response
func (a *App) MakeRequest(req HTTPRequest) HTTPResponse {
	startTime := time.Now()

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
	}
}

// FileSystemEntry represents a file or directory entry
type FileSystemEntry struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsDir    bool   `json:"isDir"`
	Size     int64  `json:"size"`
	Modified int64  `json:"modified"` // Unix timestamp
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
	Query       map[string]string `json:"query"`
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
	}

	tree := DirectoryTree{Entry: entry}

	if info.IsDir() {
		entries, err := os.ReadDir(rootPath)
		if err != nil {
			return tree, fmt.Errorf("failed to read directory: %v", err)
		}

		var children []DirectoryTree
		for _, entry := range entries {
			childPath := filepath.Join(rootPath, entry.Name())
			childTree, err := a.GetDirectoryTree(childPath)
			if err != nil {
				continue // Skip entries that can't be read
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

			postierFiles = append(postierFiles, FileSystemEntry{
				Name:     entry.Name(),
				Path:     filepath.Join(directoryPath, entry.Name()),
				IsDir:    false,
				Size:     info.Size(),
				Modified: info.ModTime().Unix(),
			})
		}
	}

	// Sort alphabetically
	sort.Slice(postierFiles, func(i, j int) bool {
		return postierFiles[i].Name < postierFiles[j].Name
	})

	return postierFiles, nil
}

// OpenFolderDialog opens a folder selection dialog and returns the selected path
func (a *App) OpenFolderDialog() (string, error) {
	selectedPath, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
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
