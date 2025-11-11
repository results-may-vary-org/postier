package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
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
