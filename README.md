[![publish](https://github.com/bouteillerAlan/postier/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/bouteillerAlan/postier/actions/workflows/release.yml)

<p align="center"> 
<img alt="logo postier" src="assets/postier.svg" width="250"/>
</p>

<h1 align="center">Postier <i>- a modern HTTP client</i></h1>

Postier is a cross-platform HTTP client built with Tauri, designed to be a feature light alternative to Postman and equivalent.

I want it fully open-source, with no account and privacy respectful.

## Story

I'm just tired of 'free' software that embark a shitload of feature, mandatory user account and creepy privacy statement.

So I wanted to create a tool that make only what it says and make it open-source. 

I know that developing this kind of stuff implies a lot of features (like making graphql call and not only http) but this is a cool adventure so - let's go :)

You can embark with me by contributing or via a [tips](https://github.com/sponsors/bouteillerAlan).

## Features

<img alt="screenshot postier" src="assets/mainScreen.png" width="500"/>

- **HTTP Request Support**
  - Supports GET, POST, PUT, DELETE, HEAD, OPTIONS and PATCH methods
  - URL input with method selection
  - Request body editor (formats: form-data, raw as text or javascript or JSON or HTML or XML, none)
  - Headers managements
  - Request history

- **Response Handling**
  - Real-time response display
  - Response in raw or preview or pretty
  - If the response is view in "pretty" you have syntax-highlighted via `prism-react-renderer`
  - Response headers viewer
  - HTTP status code display

- **User Interface**
  - Modern, clean design using Radix UI & icon
  - Dark/Light/Auto mode support (via Radix theme)
  - Pretty theme choice (via prism-react-renderer)
  - Accent color choice (via Radix theme)
  - UI scale choice (via Radix theme)

- **Self sync config & history**
  - Config and history are saved into two `txt` file, like so you can sync it the way you want.
  - Example of path in linux (both path are visible via the setting tab):
    - `/home/$USER/.local/share/com.postier.app/history.txt`
    - `/home/$USER/.config/com.postier.app/history.txt`

## Roadmap

[https://github.com/users/bouteillerAlan/projects/4/views/2](https://github.com/users/bouteillerAlan/projects/4/views/2)

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Desktop Framework**: Tauri
- **UI Components**: Radix UI
- **HTTP Client**: Tauri build-in plugin
- **FS API**: Tauri build-in plugin
- **Syntax Highlighting**: prism-react-renderer

## Getting Started

### Prerequisites

- Node.js (v22.14.0 or higher)
- pnpm
- Rust (for Tauri)

### Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm tauri dev
```

### Docker Development

WIP

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Code of conduct, license, authors, changelog, contributing

See the following file :
- [code of conduct](CODE_OF_CONDUCT.md)
- [license](LICENSE)
- [authors](AUTHORS)
- [contributing](CONTRIBUTING.md)
- [changelog](CHANGELOG)
- [security](SECURITY.md)

## Want to support my work?

- [Give me a tips on GitHub](https://github.com/sponsors/bouteillerAlan) or [on Ko-fi](https://ko-fi.com/a2n00)
- Give a star on GitHub
- Or just participate in the development :D

### Thanks !
