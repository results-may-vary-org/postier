package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// newApp returns a zero-value App suitable for tests that do not require a
// Wails runtime context (i.e. everything except OpenFolderDialog).
func newApp() *App { return &App{} }

// ── interpolate ──────────────────────────────────────────────────────────────

// TestInterpolate_SingleVar verifies that a single {{KEY}} placeholder is
// replaced by its value.
// Expected: "hello world"
func TestInterpolate_SingleVar(t *testing.T) {
	result := interpolate("hello {{NAME}}", map[string]string{"NAME": "world"})
	if result != "hello world" {
		t.Errorf("got %q, want %q", result, "hello world")
	}
}

// TestInterpolate_MultipleVars verifies that every {{KEY}} placeholder in a
// string is replaced when vars contains multiple entries.
// Expected: "GET https://api.example.com/users"
func TestInterpolate_MultipleVars(t *testing.T) {
	result := interpolate("{{METHOD}} {{BASE_URL}}/users", map[string]string{
		"METHOD":   "GET",
		"BASE_URL": "https://api.example.com",
	})
	want := "GET https://api.example.com/users"
	if result != want {
		t.Errorf("got %q, want %q", result, want)
	}
}

// TestInterpolate_UnknownKeyLeftUnchanged verifies that a placeholder with no
// matching key is left in the string as-is, preventing data loss.
// Expected: "hello {{UNKNOWN}}"
func TestInterpolate_UnknownKeyLeftUnchanged(t *testing.T) {
	result := interpolate("hello {{UNKNOWN}}", map[string]string{"OTHER": "value"})
	if result != "hello {{UNKNOWN}}" {
		t.Errorf("got %q, want placeholder unchanged", result)
	}
}

// TestInterpolate_EmptyVars verifies that passing an empty vars map returns
// the original string unmodified.
// Expected: "no vars here"
func TestInterpolate_EmptyVars(t *testing.T) {
	result := interpolate("no vars here", map[string]string{})
	if result != "no vars here" {
		t.Errorf("got %q, want original string unchanged", result)
	}
}

// TestInterpolate_EmptyString verifies that interpolating an empty string
// always returns an empty string regardless of the vars map.
// Expected: ""
func TestInterpolate_EmptyString(t *testing.T) {
	result := interpolate("", map[string]string{"KEY": "value"})
	if result != "" {
		t.Errorf("got %q, want empty string", result)
	}
}

// ── ReadEnvFile ──────────────────────────────────────────────────────────────

// TestReadEnvFile_ReturnsVarsFromDisk verifies that a valid .postier.env JSON
// file is read correctly and all key-value pairs are returned.
// Expected: map with BASE_URL and TOKEN keys.
func TestReadEnvFile_ReturnsVarsFromDisk(t *testing.T) {
	dir := t.TempDir()
	vars := map[string]string{"BASE_URL": "https://api.test", "TOKEN": "secret"}
	raw, _ := json.Marshal(vars)
	os.WriteFile(filepath.Join(dir, ".postier.env"), raw, 0600)

	got, err := newApp().ReadEnvFile(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["BASE_URL"] != "https://api.test" || got["TOKEN"] != "secret" {
		t.Errorf("unexpected vars: %v", got)
	}
}

// TestReadEnvFile_MissingFileReturnsEmptyMap verifies that when no .postier.env
// file exists, ReadEnvFile returns an empty map instead of an error, so callers
// never have to special-case a missing env file.
// Expected: empty map, nil error.
func TestReadEnvFile_MissingFileReturnsEmptyMap(t *testing.T) {
	dir := t.TempDir()
	got, err := newApp().ReadEnvFile(dir)
	if err != nil {
		t.Fatalf("expected nil error for missing file, got: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("expected empty map, got %v", got)
	}
}

// TestReadEnvFile_InvalidJSONReturnsError verifies that a .postier.env file
// containing malformed JSON produces an error rather than silent data loss.
// Expected: non-nil error.
func TestReadEnvFile_InvalidJSONReturnsError(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, ".postier.env"), []byte("not json {{{"), 0600)

	_, err := newApp().ReadEnvFile(dir)
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

// ── WriteEnvFile ─────────────────────────────────────────────────────────────

// TestWriteEnvFile_CreatesFileWithCorrectContent verifies that WriteEnvFile
// serialises the vars map to valid JSON that can be parsed back.
// Expected: round-trip produces the same map.
func TestWriteEnvFile_CreatesFileWithCorrectContent(t *testing.T) {
	dir := t.TempDir()
	vars := map[string]string{"API_KEY": "abc123", "HOST": "localhost"}

	if err := newApp().WriteEnvFile(dir, vars); err != nil {
		t.Fatalf("WriteEnvFile failed: %v", err)
	}

	raw, err := os.ReadFile(filepath.Join(dir, ".postier.env"))
	if err != nil {
		t.Fatalf("file not created: %v", err)
	}

	var got map[string]string
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatalf("file content is not valid JSON: %v", err)
	}
	if got["API_KEY"] != "abc123" || got["HOST"] != "localhost" {
		t.Errorf("round-trip mismatch: %v", got)
	}
}

// TestWriteEnvFile_FileHasRestrictedPermissions verifies that .postier.env is
// written with 0600 permissions so that only the owner can read it, keeping
// secrets away from other OS users.
// Expected: file mode bits are exactly 0600.
func TestWriteEnvFile_FileHasRestrictedPermissions(t *testing.T) {
	dir := t.TempDir()
	newApp().WriteEnvFile(dir, map[string]string{"SECRET": "s"})

	info, err := os.Stat(filepath.Join(dir, ".postier.env"))
	if err != nil {
		t.Fatalf("cannot stat env file: %v", err)
	}
	if perm := info.Mode().Perm(); perm != 0600 {
		t.Errorf("expected 0600 permissions, got %o", perm)
	}
}

// ── MakeRequest ──────────────────────────────────────────────────────────────

// TestMakeRequest_EnvVarsInterpolatedBeforeSend verifies that URL path
// segments, header values, query parameters, and body are all resolved via
// the collection's .postier.env before the HTTP request leaves the process.
// Expected: the test server observes fully resolved (non-template) values.
func TestMakeRequest_EnvVarsInterpolatedBeforeSend(t *testing.T) {
	// Capture the exact request the server receives.
	type received struct {
		path   string
		auth   string
		page   string
		body   string
	}
	var got received

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got.path = r.URL.Path
		got.auth = r.Header.Get("Authorization")
		got.page = r.URL.Query().Get("page")
		b, _ := io.ReadAll(r.Body)
		got.body = string(b)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	// Write env vars to a temp collection directory.
	dir := t.TempDir()
	newApp().WriteEnvFile(dir, map[string]string{
		"TOKEN":    "my-token",
		"PAGE":     "3",
		"USERNAME": "alice",
	})

	resp := newApp().MakeRequest(HTTPRequest{
		Method:      "POST",
		URL:         srv.URL + "/{{USERNAME}}/profile",
		Headers:     map[string]string{"Authorization": "Bearer {{TOKEN}}"},
		Query:       map[string]string{"page": "{{PAGE}}"},
		Body:        `{"user":"{{USERNAME}}"}`,
		EnvFilePath: dir,
	})

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("unexpected status %d", resp.StatusCode)
	}
	if got.path != "/alice/profile" {
		t.Errorf("URL: got %q, want %q", got.path, "/alice/profile")
	}
	if got.auth != "Bearer my-token" {
		t.Errorf("Authorization: got %q, want %q", got.auth, "Bearer my-token")
	}
	if got.page != "3" {
		t.Errorf("query page: got %q, want %q", got.page, "3")
	}
	if got.body != `{"user":"alice"}` {
		t.Errorf("body: got %q, want %q", got.body, `{"user":"alice"}`)
	}
}

// TestMakeRequest_NoEnvFilePath verifies that a request without an env file
// path is sent as-is without any template substitution, so that requests
// which do not use env vars continue to work normally.
// Expected: 200 OK from the test server.
func TestMakeRequest_NoEnvFilePath(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	resp := newApp().MakeRequest(HTTPRequest{
		Method: "GET",
		URL:    srv.URL + "/ping",
	})
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

// TestMakeRequest_InvalidURLReturnsErrorResponse verifies that an unparseable
// URL does not crash the application but returns a structured error response
// with status code 0 so the frontend can display it.
// Expected: StatusCode == 0, Status == "Invalid URL".
func TestMakeRequest_InvalidURLReturnsErrorResponse(t *testing.T) {
	resp := newApp().MakeRequest(HTTPRequest{
		Method: "GET",
		URL:    "://bad url",
	})
	if resp.StatusCode != 0 {
		t.Errorf("expected status 0, got %d", resp.StatusCode)
	}
	if resp.Status != "Invalid URL" {
		t.Errorf("expected 'Invalid URL', got %q", resp.Status)
	}
}

// ── GetDirectoryTree ─────────────────────────────────────────────────────────

// TestGetDirectoryTree_ExcludesEnvFile verifies that .postier.env is hidden
// from the directory tree so it never appears as a clickable node in the
// collection sidebar.
// Expected: no child node named ".postier.env".
func TestGetDirectoryTree_ExcludesEnvFile(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "request.postier"), []byte(`{"method":"GET"}`), 0644)
	os.WriteFile(filepath.Join(dir, ".postier.env"), []byte(`{}`), 0600)

	tree, err := newApp().GetDirectoryTree(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, child := range tree.Children {
		if child.Entry.Name == ".postier.env" {
			t.Error(".postier.env must not appear in the directory tree")
		}
	}
}

// TestGetDirectoryTree_SortsDirsBeforeFiles verifies that subdirectories are
// listed before files at the same level, matching the sidebar display order.
// Expected: first child is a directory, second child is a file.
func TestGetDirectoryTree_SortsDirsBeforeFiles(t *testing.T) {
	dir := t.TempDir()
	os.Mkdir(filepath.Join(dir, "z-folder"), 0755)
	os.WriteFile(filepath.Join(dir, "a-request.postier"), []byte(`{"method":"GET"}`), 0644)

	tree, err := newApp().GetDirectoryTree(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tree.Children) != 2 {
		t.Fatalf("expected 2 children, got %d", len(tree.Children))
	}
	if !tree.Children[0].Entry.IsDir {
		t.Error("expected first child to be a directory")
	}
	if tree.Children[1].Entry.IsDir {
		t.Error("expected second child to be a file")
	}
}

// TestGetDirectoryTree_PopulatesMethodFromPostierFile verifies that the HTTP
// method stored inside a .postier file is surfaced on the tree entry so the
// sidebar can display it as a coloured badge.
// Expected: the file entry's Method field equals "DELETE".
func TestGetDirectoryTree_PopulatesMethodFromPostierFile(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "delete-user.postier"), []byte(`{"method":"DELETE","url":""}`), 0644)

	tree, err := newApp().GetDirectoryTree(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tree.Children) != 1 {
		t.Fatalf("expected 1 child, got %d", len(tree.Children))
	}
	if tree.Children[0].Entry.Method != "DELETE" {
		t.Errorf("expected method DELETE, got %q", tree.Children[0].Entry.Method)
	}
}

// ── File CRUD ────────────────────────────────────────────────────────────────

// TestCreateReadUpdateDeleteFile verifies the full lifecycle of a plain file:
// create with content → read it back → update → read updated content → delete
// → confirm it no longer exists.
// Expected: each step reflects the latest written content; ReadFile errors
// after deletion.
func TestCreateReadUpdateDeleteFile(t *testing.T) {
	a := newApp()
	path := filepath.Join(t.TempDir(), "note.txt")

	if err := a.CreateFile(path, "hello"); err != nil {
		t.Fatalf("CreateFile: %v", err)
	}
	content, err := a.ReadFile(path)
	if err != nil || content != "hello" {
		t.Fatalf("ReadFile after create: got %q, %v", content, err)
	}

	if err := a.UpdateFile(path, "updated"); err != nil {
		t.Fatalf("UpdateFile: %v", err)
	}
	content, err = a.ReadFile(path)
	if err != nil || content != "updated" {
		t.Fatalf("ReadFile after update: got %q, %v", content, err)
	}

	if err := a.DeleteFile(path); err != nil {
		t.Fatalf("DeleteFile: %v", err)
	}
	if _, err := a.ReadFile(path); err == nil {
		t.Error("expected error after deletion, got nil")
	}
}

// TestCreateFile_CreatesIntermediateDirectories verifies that CreateFile
// creates any missing parent directories, matching the behaviour expected when
// saving a new request inside a not-yet-existing subfolder.
// Expected: no error; file exists with the given content.
func TestCreateFile_CreatesIntermediateDirectories(t *testing.T) {
	path := filepath.Join(t.TempDir(), "a", "b", "c", "file.txt")
	if err := newApp().CreateFile(path, "deep"); err != nil {
		t.Fatalf("CreateFile with nested dirs: %v", err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Error("file not found after creation")
	}
}

// TestCreateAndDeleteDirectory verifies that CreateDirectory creates a
// directory (including intermediate paths) and that DeleteDirectory removes
// the directory and all its contents.
// Expected: directory exists after create; neither it nor its contents remain
// after delete.
func TestCreateAndDeleteDirectory(t *testing.T) {
	a := newApp()
	base := t.TempDir()
	dir := filepath.Join(base, "parent", "child")

	if err := a.CreateDirectory(dir); err != nil {
		t.Fatalf("CreateDirectory: %v", err)
	}
	if _, err := os.Stat(dir); err != nil {
		t.Fatal("directory not created")
	}

	// Place a file inside to confirm recursive deletion.
	os.WriteFile(filepath.Join(dir, "file.txt"), []byte("x"), 0644)

	if err := a.DeleteDirectory(filepath.Join(base, "parent")); err != nil {
		t.Fatalf("DeleteDirectory: %v", err)
	}
	if _, err := os.Stat(filepath.Join(base, "parent")); !os.IsNotExist(err) {
		t.Error("directory still exists after deletion")
	}
}

// ── SavePostierRequest / LoadPostierRequest ───────────────────────────────────

// TestSaveAndLoadPostierRequest verifies that a PostierRequest is serialised
// to disk and deserialised back with all fields intact, including the HTTP
// method, URL, headers, and body.
// Expected: loaded request equals the saved request on every checked field.
func TestSaveAndLoadPostierRequest(t *testing.T) {
	a := newApp()
	dir := t.TempDir()
	path := filepath.Join(dir, "my-request")

	req := PostierRequest{
		Name:     "Test request",
		Method:   "POST",
		URL:      "https://example.com/api",
		Headers:  map[string]string{"Content-Type": "application/json"},
		Body:     `{"key":"value"}`,
		BodyType: "json",
		Query:    map[string]string{"debug": "true"},
	}

	if err := a.SavePostierRequest(path, req); err != nil {
		t.Fatalf("SavePostierRequest: %v", err)
	}

	loaded, err := a.LoadPostierRequest(path + ".postier")
	if err != nil {
		t.Fatalf("LoadPostierRequest: %v", err)
	}
	if loaded.Method != "POST" || loaded.URL != "https://example.com/api" {
		t.Errorf("method/url mismatch: %+v", loaded)
	}
	if loaded.Headers["Content-Type"] != "application/json" {
		t.Errorf("header not preserved: %v", loaded.Headers)
	}
	if loaded.Body != `{"key":"value"}` {
		t.Errorf("body not preserved: %q", loaded.Body)
	}
}

// TestSavePostierRequest_AutoAddsExtension verifies that SavePostierRequest
// appends the .postier extension when the caller omits it, so files always
// land with the correct name.
// Expected: a file named "request.postier" is created even though ".postier"
// was not in the path argument.
func TestSavePostierRequest_AutoAddsExtension(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "request") // no .postier

	if err := newApp().SavePostierRequest(path, PostierRequest{Method: "GET"}); err != nil {
		t.Fatalf("SavePostierRequest: %v", err)
	}
	if _, err := os.Stat(path + ".postier"); err != nil {
		t.Error(".postier extension was not added automatically")
	}
}

// TestSavePostierRequest_SetsUpdatedAt verifies that SavePostierRequest always
// stamps UpdatedAt with the current time so the file reflects when it was last
// written, not what the caller passed in.
// Expected: UpdatedAt in the saved file is non-zero and within a few seconds
// of now.
func TestSavePostierRequest_SetsUpdatedAt(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "req.postier")
	before := time.Now()

	newApp().SavePostierRequest(path, PostierRequest{Method: "GET"})

	loaded, err := newApp().LoadPostierRequest(path)
	if err != nil {
		t.Fatalf("LoadPostierRequest: %v", err)
	}
	if loaded.UpdatedAt.Before(before) {
		t.Errorf("UpdatedAt %v is before save time %v", loaded.UpdatedAt, before)
	}
}

// ── RenameEntry ──────────────────────────────────────────────────────────────

// TestRenameEntry_File verifies that renaming a file moves it to the new path
// and that the original path no longer exists.
// Expected: content accessible at newPath; oldPath returns not-found.
func TestRenameEntry_File(t *testing.T) {
	dir := t.TempDir()
	old := filepath.Join(dir, "old.txt")
	new := filepath.Join(dir, "new.txt")
	os.WriteFile(old, []byte("data"), 0644)

	if err := newApp().RenameEntry(old, new); err != nil {
		t.Fatalf("RenameEntry: %v", err)
	}
	if _, err := os.Stat(new); err != nil {
		t.Error("new path does not exist after rename")
	}
	if _, err := os.Stat(old); !os.IsNotExist(err) {
		t.Error("old path still exists after rename")
	}
}

// TestRenameEntry_Directory verifies that renaming a directory moves the whole
// subtree atomically.
// Expected: a file inside the renamed directory is accessible via the new path.
func TestRenameEntry_Directory(t *testing.T) {
	base := t.TempDir()
	oldDir := filepath.Join(base, "alpha")
	newDir := filepath.Join(base, "beta")
	os.Mkdir(oldDir, 0755)
	os.WriteFile(filepath.Join(oldDir, "file.txt"), []byte("x"), 0644)

	if err := newApp().RenameEntry(oldDir, newDir); err != nil {
		t.Fatalf("RenameEntry dir: %v", err)
	}
	if _, err := os.Stat(filepath.Join(newDir, "file.txt")); err != nil {
		t.Error("file inside renamed directory not found")
	}
}

// ── ListPostierFiles ──────────────────────────────────────────────────────────

// TestListPostierFiles_OnlyReturnsPostierFiles verifies that ListPostierFiles
// ignores non-.postier files in the directory and only surfaces entries that
// belong to the collection.
// Expected: exactly the two .postier files are returned; the .json file is
// excluded.
func TestListPostierFiles_OnlyReturnsPostierFiles(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "b-req.postier"), []byte(`{"method":"POST"}`), 0644)
	os.WriteFile(filepath.Join(dir, "a-req.postier"), []byte(`{"method":"GET"}`), 0644)
	os.WriteFile(filepath.Join(dir, "ignore.json"), []byte(`{}`), 0644)

	files, err := newApp().ListPostierFiles(dir)
	if err != nil {
		t.Fatalf("ListPostierFiles: %v", err)
	}
	if len(files) != 2 {
		t.Fatalf("expected 2 files, got %d", len(files))
	}
	// Verify alphabetical order and method population.
	if files[0].Name != "a-req.postier" || files[0].Method != "GET" {
		t.Errorf("first file: %+v", files[0])
	}
	if files[1].Name != "b-req.postier" || files[1].Method != "POST" {
		t.Errorf("second file: %+v", files[1])
	}
}
